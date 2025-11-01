import { Worker } from 'worker_threads';
import { config } from '../config';
import { createWorker } from '../utils/worker';
import { EmbeddingJob, JobQueueItem, MatchingJob, workerTypes } from '../utils/types';
import { WorkerError } from '../utils/errors';
import { getLogger } from '../utils/logger';
import { addReason } from '../tasks/reason';
import { getDB } from '../utils/db';

const { embeddingWorkers, matchingWorkers, workerHeartbeatInterval, workerDeathTimeout } = config;
const logger = getLogger();

/**
 * WorkerPool - Manages workers for a specific task type
 */
class WorkerPool {
  private workers: Worker[] = [];
  private availableWorkers: Set<Worker> = new Set();
  private busyWorkers: Map<Worker, string> = new Map();
  private activeJobs: Map<Worker, JobQueueItem> = new Map(); // Track jobs being processed
  private jobQueue: JobQueueItem[] = [];
  private workerDeathTimers: Map<Worker, NodeJS.Timeout> = new Map();
  private workersBeingReplaced: Set<number> = new Set(); // Prevent double replacement using threadId
  private readonly workerType: workerTypes;
  private readonly poolSize: number;

  constructor(workerType: workerTypes, poolSize: number) {
    this.workerType = workerType;
    this.poolSize = poolSize;

    logger.info('worker', `Initializing ${workerType} pool with ${poolSize} workers`, {
      workerType,
      poolSize,
    });

    this.initialiseWorkers();

    logger.debug('worker', `${workerType} pool initialization completed`, {
      workerType,
      totalWorkers: this.workers.length,
      availableWorkers: this.availableWorkers.size,
      busyWorkers: this.busyWorkers.size,
    });
  }

  private initialiseWorkers(): void {
    logger.debug('worker', `Initializing ${this.poolSize} ${this.workerType} workers`, {
      workerType: this.workerType,
      poolSize: this.poolSize,
    });

    for (let i = 0; i < this.poolSize; i++) {
      logger.debug('worker', `Creating ${this.workerType} worker ${i + 1}/${this.poolSize}`, {
        workerType: this.workerType,
        workerIndex: i + 1,
        totalToCreate: this.poolSize,
      });
      this.createWorker();
    }

    logger.debug('worker', `Finished initializing ${this.workerType} workers`, {
      workerType: this.workerType,
      workersCreated: this.workers.length,
      expectedWorkers: this.poolSize,
    });
  }

  private createWorker(): void {
    const worker = createWorker(this.workerType);
    this.workers.push(worker);

    logger.debug('worker', `Created new ${this.workerType} worker`, {
      workerType: this.workerType,
      threadId: worker.threadId,
      totalWorkers: this.workers.length,
      poolSize: this.poolSize,
      availableWorkers: this.availableWorkers.size,
      busyWorkers: this.busyWorkers.size,
    });

    // Set initial death timer (longer timeout for initialization)
    const deathTimer = setTimeout(() => this.killWorker(worker), workerDeathTimeout);
    this.workerDeathTimers.set(worker, deathTimer);

    worker.on('message', (message: any) => {
      if (message.type === 'ready') {
        this.handleWorkerReady(worker);
      } else if (message.type === 'initialization_failed') {
        this.handleWorkerInitializationFailed(worker, message.error);
      } else if (message.type === 'heartbeat') {
        this.handleHeartbeat(worker);
      } else if (message.type === 'log') {
        // Handle log messages from workers
        this.handleWorkerLog(message);
      }
    });

    worker.on('error', (error) => this.handleWorkerFailure(worker, error));
    worker.once('exit', () => this.handleWorkerFailure(worker, new Error('Worker exited')));
  }

  private handleWorkerReady(worker: Worker): void {
    logger.info('worker', `${this.workerType} worker ready for jobs`, {
      workerType: this.workerType,
      threadId: worker.threadId,
      totalWorkers: this.workers.length,
      poolSize: this.poolSize,
    });

    // Add to available pool now that initialization is complete
    this.availableWorkers.add(worker);

    // Reset death timer to normal cadence
    const existingTimer = this.workerDeathTimers.get(worker);
    if (existingTimer) clearTimeout(existingTimer);

    const newTimer = setTimeout(() => this.killWorker(worker), workerDeathTimeout);
    this.workerDeathTimers.set(worker, newTimer);

    // Try to process any queued jobs
    this.processNextJob();
  }

  private handleWorkerInitializationFailed(worker: Worker, error: string): void {
    logger.error('worker', `${this.workerType} worker initialization failed`, {
      workerType: this.workerType,
      threadId: worker.threadId,
      error,
    });

    // Remove the failed worker and create a replacement
    this.removeWorker(worker);
    this.createWorker();
  }

  private handleHeartbeat(worker: Worker): void {
    logger.debug('worker', `Heartbeat received from ${this.workerType} worker`, {
      workerType: this.workerType,
      threadId: worker.threadId,
      isBusy: this.busyWorkers.has(worker),
    });

    // Reset death timer
    const existingTimer = this.workerDeathTimers.get(worker);
    if (existingTimer) clearTimeout(existingTimer);

    const newTimer = setTimeout(() => this.killWorker(worker), workerDeathTimeout);
    this.workerDeathTimers.set(worker, newTimer);

    // Only mark as available if not busy (worker should already be in pool from 'ready' signal)
    // This handles the case where a worker becomes available again after completing a job
    if (!this.busyWorkers.has(worker) && !this.availableWorkers.has(worker)) {
      this.availableWorkers.add(worker);
      this.processNextJob();
    }
  }

  private handleWorkerLog(message: any): void {
    // Forward worker logs to the main logger
    const { level, logType, message: logMessage, data, error } = message;

    if (error) {
      const reconstructedError = new Error(error.message);
      reconstructedError.stack = error.stack;
      reconstructedError.name = error.name;
      logger[level as 'debug' | 'info' | 'warn' | 'error'](
        logType,
        logMessage,
        reconstructedError,
        data,
      );
    } else {
      logger[level as 'debug' | 'info' | 'warn' | 'error'](logType, logMessage, data);
    }
  }

  private killWorker(worker: Worker): void {
    // Prevent double replacement if worker is already being replaced
    if (this.workersBeingReplaced.has(worker.threadId)) {
      logger.debug(
        'worker',
        `Skipping replacement for ${this.workerType} worker - already being replaced`,
        {
          workerType: this.workerType,
          threadId: worker.threadId,
        },
      );
      return;
    }

    this.workersBeingReplaced.add(worker.threadId);

    logger.warn('worker', `Killing unresponsive ${this.workerType} worker (heartbeat timeout)`, {
      workerType: this.workerType,
      threadId: worker.threadId,
      reason: 'heartbeat_timeout',
      totalWorkersBefore: this.workers.length,
      availableWorkersBefore: this.availableWorkers.size,
      busyWorkersBefore: this.busyWorkers.size,
    });

    this.removeWorker(worker);

    logger.info('worker', `Creating replacement ${this.workerType} worker after timeout`, {
      workerType: this.workerType,
      killedThreadId: worker.threadId,
      totalWorkersAfterRemoval: this.workers.length,
      poolSize: this.poolSize,
    });

    this.createWorker();

    logger.debug('worker', `Replacement ${this.workerType} worker creation completed`, {
      workerType: this.workerType,
      totalWorkersAfterReplacement: this.workers.length,
      availableWorkersAfterReplacement: this.availableWorkers.size,
      busyWorkersAfterReplacement: this.busyWorkers.size,
      poolSize: this.poolSize,
    });

    this.workersBeingReplaced.delete(worker.threadId);
  }

  private handleWorkerFailure(worker: Worker, error: Error): void {
    // Prevent double replacement if worker is already being replaced
    if (this.workersBeingReplaced.has(worker.threadId)) {
      logger.debug(
        'worker',
        `Skipping replacement for failed ${this.workerType} worker - already being replaced`,
        {
          workerType: this.workerType,
          threadId: worker.threadId,
          error: error.message,
        },
      );
      return;
    }

    this.workersBeingReplaced.add(worker.threadId);

    logger.error('worker', `${this.workerType} worker failed, replacing worker`, {
      // @ts-ignore
      workerType: this.workerType,
      threadId: worker.threadId,
      error: error.message,
      stack: error.stack,
      totalWorkersBefore: this.workers.length,
      availableWorkersBefore: this.availableWorkers.size,
      busyWorkersBefore: this.busyWorkers.size,
      hasActiveJob: this.activeJobs.has(worker),
    });

    const activeJob = this.activeJobs.get(worker);
    if (activeJob) {
      // Recover the job that was being processed
      this.activeJobs.delete(worker);
      logger.warn('worker', `Recovering job from failed ${this.workerType} worker`, {
        workerType: this.workerType,
        threadId: worker.threadId,
        jobId: activeJob.job.jobId,
        retryCount: activeJob.retryCount,
      });
      this.handleJobFailure(activeJob, error);
    }

    this.removeWorker(worker);

    logger.info('worker', `Creating replacement ${this.workerType} worker after failure`, {
      workerType: this.workerType,
      failedThreadId: worker.threadId,
      totalWorkersAfterRemoval: this.workers.length,
      poolSize: this.poolSize,
    });

    this.createWorker();

    logger.debug(
      'worker',
      `Replacement ${this.workerType} worker creation completed after failure`,
      {
        workerType: this.workerType,
        totalWorkersAfterReplacement: this.workers.length,
        availableWorkersAfterReplacement: this.availableWorkers.size,
        busyWorkersAfterReplacement: this.busyWorkers.size,
        poolSize: this.poolSize,
      },
    );

    this.workersBeingReplaced.delete(worker.threadId);
  }

  private removeWorker(worker: Worker): void {
    logger.debug('worker', `Removing ${this.workerType} worker from pool`, {
      workerType: this.workerType,
      threadId: worker.threadId,
      wasAvailable: this.availableWorkers.has(worker),
      wasBusy: this.busyWorkers.has(worker),
      hadActiveJob: this.activeJobs.has(worker),
      totalWorkersBefore: this.workers.length,
    });

    this.availableWorkers.delete(worker);
    this.busyWorkers.delete(worker);
    this.activeJobs.delete(worker); // Clean up active job tracking

    const timer = this.workerDeathTimers.get(worker);
    if (timer) {
      clearTimeout(timer);
      this.workerDeathTimers.delete(worker);
    }

    const index = this.workers.indexOf(worker);
    if (index > -1) this.workers.splice(index, 1);

    // Remove all event listeners to prevent exit event from firing
    worker.removeAllListeners();

    // Clean up replacement tracking
    this.workersBeingReplaced.delete(worker.threadId);

    worker.terminate();

    logger.debug('worker', `Removed ${this.workerType} worker from pool`, {
      workerType: this.workerType,
      threadId: worker.threadId,
      totalWorkersAfter: this.workers.length,
      availableWorkersAfter: this.availableWorkers.size,
      busyWorkersAfter: this.busyWorkers.size,
    });
  }

  public async executeJob(job: EmbeddingJob | MatchingJob): Promise<any> {
    logger.info('worker', `Received ${this.workerType} job for queuing`, {
      workerType: this.workerType,
      jobId: job.jobId,
      queueLength: this.jobQueue.length,
      availableWorkers: this.availableWorkers.size,
    });

    return new Promise((resolve, reject) => {
      this.jobQueue.push({ job, resolve, reject, retryCount: 0 });
      this.processNextJob();
    });
  }

  private processing = false;

  private processNextJob(): void {
    if (this.processing) return; // Prevent race conditions
    if (this.jobQueue.length === 0 || this.availableWorkers.size === 0) return;

    this.processing = true;
    const worker = this.availableWorkers.values().next().value as Worker;
    const queueItem = this.jobQueue.shift()!;

    logger.debug('worker', `Processing next job in queue`, {
      workerType: this.workerType,
      queueLength: this.jobQueue.length,
      availableWorkers: this.availableWorkers.size,
    });

    this.assignJobToWorker(worker, queueItem);
    this.processing = false;
  }

  private assignJobToWorker(worker: Worker, queueItem: JobQueueItem): void {
    const { job, resolve, reject, retryCount } = queueItem;
    this.availableWorkers.delete(worker);
    this.busyWorkers.set(worker, job.jobId);
    this.activeJobs.set(worker, queueItem); // Track the active job

    logger.info('worker', `Starting ${this.workerType} job on worker`, {
      workerType: this.workerType,
      jobId: job.jobId,
      threadId: worker.threadId,
      retryCount,
      queueLength: this.jobQueue.length,
    });

    const messageHandler = (message: any) => {
      if (message.type === 'job_completed' && message.jobId === job.jobId) {
        worker.removeListener('message', messageHandler);
        this.activeJobs.delete(worker); // Remove from active tracking
        this.markWorkerAvailable(worker);

        logger.info('worker', `${this.workerType} job completed successfully`, {
          workerType: this.workerType,
          jobId: job.jobId,
          threadId: worker.threadId,
        });

        resolve(message.result || 'Job completed');
        this.processNextJob();
      } else if (message.type === 'error' && message.jobId === job.jobId) {
        worker.removeListener('message', messageHandler);
        this.activeJobs.delete(worker); // Remove from active tracking
        this.markWorkerAvailable(worker);

        logger.info('worker', `${this.workerType} job failed, handling failure`, {
          workerType: this.workerType,
          jobId: job.jobId,
          threadId: worker.threadId,
          error: message.error,
        });

        this.handleJobFailure(queueItem, new Error(message.error));
        this.processNextJob();
      } else if (message.type === 'job' && message.job === 'reason') {
        this.handleReasoning(job, message);
      }
    };

    worker.on('message', messageHandler);
    worker.postMessage(job);
  }

  private markWorkerAvailable(worker: Worker): void {
    this.busyWorkers.delete(worker);
    this.availableWorkers.add(worker);
  }

  private handleJobFailure(queueItem: JobQueueItem, error: Error): void {
    const { job, resolve, reject, retryCount } = queueItem;

    if (retryCount < 2) {
      // Requeue job with incremented retry count
      logger.info('worker', `Retrying ${this.workerType} job`, {
        workerType: this.workerType,
        jobId: job.jobId,
        retryCount: retryCount + 1,
        maxRetries: 2,
        error: error.message,
      });

      this.jobQueue.unshift({
        job,
        resolve,
        reject,
        retryCount: retryCount + 1,
      });
    } else {
      // Final failure after 2 retries
      logger.error(
        'worker',
        `${this.workerType} job failed permanently after max retries`,
        new WorkerError(this.workerType, job.jobId, error),
      );

      reject(new WorkerError(this.workerType, job.jobId, error));
    }
  }

  private async handleReasoning(job: any, message: any): Promise<void> {
    const finalMatches = [];

    for (const [task, matches] of Object.entries(message.workload)) {
      try {
        const taskMatches = await addReason(matches as any[], task);
        finalMatches.push(...taskMatches);
      } catch (error) {
        finalMatches.push(...(matches as any[]));
      }
    }

    const db = getDB(job.dbName);
    for (const match of finalMatches) {
      try {
        db.addMatchResult({
          jobId: match.jobId,
          taskId: match.taskId,
          taskText: match.taskText,
          competenceId: match.competenceId,
          resourceId: match.resourceId,
          distance: match.distance,
          text: match.text,
          type: match.type,
          alignment: match.alignment,
          reason: match.reason,
        });
      } catch (error) {
        // Continue on individual match save failure
      }
    }

    try {
      db.updateJobStatus(job.jobId, 'completed');
    } catch (error) {
      // Log but don't fail
    }
  }

  public async shutdown(): Promise<void> {
    logger.info('worker', `Shutting down ${this.workerType} pool`, {
      workerType: this.workerType,
      activeJobs: this.activeJobs.size,
      queuedJobs: this.jobQueue.length,
      totalWorkers: this.workers.length,
    });

    this.jobQueue.forEach((item) => item.reject(new Error('Shutting down')));
    this.activeJobs.forEach((item) => item.reject(new Error('Shutting down'))); // Reject active jobs too
    this.workerDeathTimers.forEach((timer) => clearTimeout(timer));
    this.workers.forEach((worker) => worker.terminate());

    this.jobQueue.length = 0;
    this.activeJobs.clear();
    this.workerDeathTimers.clear();
    this.workers.length = 0;
    this.availableWorkers.clear();
    this.busyWorkers.clear();
  }
}

/**
 * WorkerManager - High-level interface for managing worker pools
 */
class WorkerManager {
  private embeddingPool: WorkerPool;
  private matchingPool: WorkerPool;

  constructor() {
    logger.info('worker', 'Initializing WorkerManager', {
      embeddingWorkers,
      matchingWorkers,
    });

    this.embeddingPool = new WorkerPool('embedder', embeddingWorkers);
    this.matchingPool = new WorkerPool('matcher', matchingWorkers);
  }

  public async enqueue(job: EmbeddingJob | MatchingJob, workerType: workerTypes): Promise<any> {
    logger.info('worker', `Enqueuing job to ${workerType} pool`, {
      workerType,
      jobId: job.jobId,
    });

    if (workerType === 'embedder') {
      return this.embeddingPool.executeJob(job);
    } else if (workerType === 'matcher') {
      return this.matchingPool.executeJob(job);
    } else {
      const error = new Error(`Unknown worker type: ${workerType}`);
      logger.error('worker', 'Unknown worker type requested', error, {
        workerType,
        jobId: job.jobId,
      });
      throw error;
    }
  }

  public async shutdown(): Promise<void> {
    await Promise.all([this.embeddingPool.shutdown(), this.matchingPool.shutdown()]);
  }
}

// Export singleton instance
const manager = new WorkerManager();
export default manager;
