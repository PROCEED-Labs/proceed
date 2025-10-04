import { Worker } from 'worker_threads';
import { config } from '../config';
import { createWorker } from '../utils/worker';
import { EmbeddingJob, MatchingJob, workerTypes, Match } from '../utils/types';
import { WorkerError, DatabaseError, ReasoningError } from '../utils/errors';
import { getLogger } from '../utils/logger';
import { addReason } from '../tasks/reason';
import { getDB } from '../utils/db';

const {
  embeddingWorkers,
  matchingWorkers,
  workerHealthCheckTimeout,
  maxWorkerRetries,
  workerRetryWindow,
  systemStartupTimeout,
  maxJobTime,
} = config;
const logger = getLogger();

// Job queue interface for task-specific queues
interface JobQueueItem {
  job: EmbeddingJob | MatchingJob;
  options?: {
    onOnline?: (job: any) => void;
    onExit?: (job: any, code: number) => void;
    onError?: (job: any, error: Error) => void;
    onMessage?: (job: any, message: any) => void;
  };
}

// Worker pool for a specific task type
class WorkerPool {
  private workers: Worker[] = [];
  private queue: JobQueueItem[] = [];
  private readonly workerType: workerTypes;
  private readonly poolSize: number;
  private availableWorkers: Set<Worker> = new Set();
  private busyWorkers: Map<Worker, string> = new Map(); // Maps worker to current jobId
  private pendingHealthChecks: Map<Worker, NodeJS.Timeout> = new Map(); // Track pending health checks
  private beingReplaced: Set<Worker> = new Set(); // Track workers being replaced to prevent double replacement
  private jobTimeouts: Map<Worker, NodeJS.Timeout> = new Map(); // Track job timeouts

  // Retry tracking
  private failureCount: number = 0; // Total failures for this worker type
  private lastFailureTime: number = 0; // Timestamp of last failure
  private consecutiveFailures: number = 0; // Consecutive failures without recovery

  // Health check failure tracking
  private consecutiveHealthCheckFailures: number = 0; // Consecutive health check failures
  private poolBroken: boolean = false; // Pool marked as broken due to persistent failures

  constructor(workerType: workerTypes, poolSize: number) {
    this.workerType = workerType;
    this.poolSize = poolSize;
    this.initialiseWorkers();
  }

  /**
   * Initialise static worker pool - workers stay alive and process jobs sequentially
   */
  private initialiseWorkers() {
    for (let i = 0; i < this.poolSize; i++) {
      this.createAndRegisterWorker();
    }

    logger.debug('system', `[WorkerPool] Initialised ${this.poolSize} ${this.workerType} workers`);
  }

  /**
   * Create a new worker and register it in the pool
   */
  private createAndRegisterWorker() {
    // Don't create new workers if pool is broken
    if (this.poolBroken) {
      logger.debug(
        'system',
        `[WorkerPool] Not creating new ${this.workerType} worker - pool is marked as broken`,
      );
      return;
    }

    // Check if we already have enough workers (including those pending health checks)
    if (this.workers.length >= this.poolSize) {
      logger.debug(
        'system',
        `[WorkerPool] Not creating new ${this.workerType} worker - pool already has ${this.workers.length}/${this.poolSize} workers`,
      );
      return;
    }

    let worker: Worker;
    try {
      worker = createWorker(this.workerType);
    } catch (error) {
      const workerError = new WorkerError(
        this.workerType,
        'unknown',
        error instanceof Error ? error : new Error(String(error)),
      );

      logger.workerError('worker_pool_creation_failure', workerError, {
        workerType: this.workerType,
        poolSize: this.poolSize,
      });
      return;
    }

    this.workers.push(worker);
    // DON'T add to availableWorkers yet - only after health check passes

    // Perform health check after worker is online
    worker.once('online', () => {
      this.performHealthCheck(worker);
    });

    // Handle worker lifecycle events
    worker.once('online', () => {
      logger.debug('system', `[WorkerPool] ${this.workerType} worker ${worker.threadId} is online`);
    });

    worker.on('error', (err) => {
      const jobId = this.busyWorkers.get(worker) || 'unknown';
      const workerError = new WorkerError(
        this.workerType,
        jobId,
        err instanceof Error ? err : new Error(String(err)),
      );

      // Track failure and determine logging severity
      const { shouldLogAsError, retryCount } = this.trackWorkerFailure();

      const errorData = {
        workerType: this.workerType,
        threadId: worker.threadId,
        jobId,
        retryCount,
        maxRetries: maxWorkerRetries,
      };

      if (shouldLogAsError) {
        logger.workerError('worker_pool_runtime_error', workerError, errorData);
      } else {
        logger.warn(
          'worker',
          `Worker runtime error (attempt ${retryCount}/${maxWorkerRetries}): ${err.message}`,
          errorData,
        );
      }

      // Mark worker as available again and try to process next job
      this.markWorkerAvailable(worker);
      this.processNextJob();
    });

    // Handle unexpected worker exits - restart the worker
    worker.once('exit', (code) => {
      const jobId = this.busyWorkers.get(worker) || 'unknown';

      logger.debug(
        'system',
        `[WorkerPool] ${this.workerType} worker ${worker.threadId} exited with code ${code}`,
      );

      // Check if this worker is already being replaced to prevent double replacement
      if (this.beingReplaced.has(worker)) {
        logger.debug(
          'system',
          `[WorkerPool] Worker ${worker.threadId} already being replaced, skipping duplicate replacement`,
        );
        this.removeWorkerFromPool(worker);
        return;
      }

      // Remove from all tracking sets/maps and create replacement
      this.removeWorkerFromPool(worker);
      this.createAndRegisterWorker();
    });
  }

  /**
   * Add a job to this pool's queue
   */
  public enqueue(job: EmbeddingJob | MatchingJob, options?: JobQueueItem['options']) {
    this.queue.push({ job, options });

    logger.debug(
      'system',
      `[WorkerPool] Enqueued ${this.workerType} job ${job.jobId} (queue: ${this.queue.length}, available: ${this.availableWorkers.size})`,
    );

    this.processNextJob();
  }

  /**
   * Process the next job in queue if workers are available
   */
  private processNextJob() {
    if (this.queue.length === 0 || this.availableWorkers.size === 0) {
      return;
    }

    const worker = this.availableWorkers.values().next().value as Worker;
    const queueItem = this.queue.shift()!;

    this.assignJobToWorker(worker, queueItem);
  }

  /**
   * Assign a specific job to a specific worker
   */
  private assignJobToWorker(worker: Worker, { job, options }: JobQueueItem) {
    // Mark worker as busy
    this.availableWorkers.delete(worker);
    this.busyWorkers.set(worker, job.jobId);

    logger.debug(
      'system',
      `[WorkerPool] Assigning ${this.workerType} job ${job.jobId} to worker ${worker.threadId}`,
    );

    // Set up job timeout
    const jobTimeout = setTimeout(() => {
      this.handleJobTimeout(worker, job);
    }, maxJobTime);
    this.jobTimeouts.set(worker, jobTimeout);

    // Set up message handling for this specific job
    const messageHandler = (message: any) => {
      try {
        switch (message.type) {
          case 'status':
            logger.debug(
              'system',
              `[WorkerPool] Worker ${worker.threadId} for job ${message.jobId || job.jobId} status: ${message.status}`,
            );
            break;
          case 'error':
            logger.workerError(
              'worker_reported_error',
              new WorkerError(
                this.workerType,
                message.jobId || job.jobId,
                new Error(message.error),
              ),
              {
                workerType: this.workerType,
                threadId: worker.threadId,
                jobId: message.jobId || job.jobId,
                reportedError: message.error,
              },
            );
            break;
          case 'log':
            // Forward worker logs to main logger
            try {
              const logType = message.logType || 'worker';
              switch (message.level) {
                case 'debug':
                  logger.debug(logType, message.message, message.data);
                  break;
                case 'info':
                  logger.info(logType, message.message, message.data);
                  break;
                case 'warn':
                  logger.warn(logType, message.message, message.data);
                  break;
                case 'error':
                  const error = message.error ? new Error(message.error.message) : undefined;
                  if (error && message.error.stack) error.stack = message.error.stack;
                  logger.error(logType, message.message, error, message.data);
                  break;
              }
            } catch (err) {
              logger.error(
                'system',
                'Failed to forward worker log',
                err instanceof Error ? err : new Error(String(err)),
              );
            }
            break;
          case 'job_completed':
            // Clear job timeout since job completed
            this.clearJobTimeout(worker);

            // Job is done, mark worker as available and process next job
            this.markWorkerAvailable(worker);
            this.processNextJob();
            options?.onExit?.(job, 0);
            break;
          case 'job':
            // Handle special job messages (like reasoning requests from matching workers)
            if (message.job === 'reason') {
              // Handle reasoning asynchronously without blocking the worker
              handleReasoning(job, message).catch((error: any) => {
                logger.workerError(
                  'reasoning_handler_async_failure',
                  error instanceof Error ? error : new Error(String(error)),
                  { jobId: job.jobId },
                );
              });
            }
            break;
        }

        options?.onMessage?.(job, message);
      } catch (error) {
        const messageHandlingError = new WorkerError(
          this.workerType,
          job.jobId,
          error instanceof Error ? error : new Error(String(error)),
        );

        logger.workerError('worker_message_handling_error', messageHandlingError, {
          workerType: this.workerType,
          threadId: worker.threadId,
          jobId: job.jobId,
          messageType: message.type,
        });
      }
    };

    worker.on('message', messageHandler);

    // Send the job to the worker
    try {
      worker.postMessage(job);
      options?.onOnline?.(job);
    } catch (error) {
      // Clear timeout since job failed to start
      this.clearJobTimeout(worker);

      const messageError = new WorkerError(
        this.workerType,
        job.jobId,
        error instanceof Error ? error : new Error(String(error)),
      );

      logger.workerError('worker_message_send_failure', messageError, {
        workerType: this.workerType,
        threadId: worker.threadId,
        jobId: job.jobId,
      });

      // Remove the message handler and mark worker as available
      worker.off('message', messageHandler);
      this.markWorkerAvailable(worker);
      this.processNextJob();
      options?.onError?.(job, messageError);
    }
  }

  /**
   * Handle job timeout for a worker
   */
  private handleJobTimeout(worker: Worker, job: EmbeddingJob | MatchingJob) {
    const jobId = job.jobId;

    logger.workerError(
      'job_timeout',
      new WorkerError(this.workerType, jobId, new Error(`Job timed out after ${maxJobTime}ms`)),
      {
        workerType: this.workerType,
        threadId: worker.threadId,
        jobId,
        timeout: maxJobTime,
      },
    );

    // Clear the timeout from tracking
    this.clearJobTimeout(worker);

    // Update job status in database
    try {
      const db = getDB(job.dbName);
      db.updateJobStatus(jobId, 'failed');
      db.close();
    } catch (error) {
      logger.error(
        'system',
        `Failed to update job status for timed out job ${jobId}`,
        error instanceof Error ? error : new Error(String(error)),
      );
    }

    // Mark worker as being replaced to prevent double replacement
    this.beingReplaced.add(worker);

    // Terminate the unresponsive worker
    try {
      worker.terminate();
      logger.debug(
        'system',
        `[WorkerPool] Terminated ${this.workerType} worker ${worker.threadId} due to job timeout`,
      );
    } catch (error) {
      logger.debug(
        'system',
        `[WorkerPool] Failed to terminate timed-out worker ${worker.threadId}:`,
        error,
      );
    }

    // Remove worker and create replacement
    this.removeWorkerFromPool(worker);
    this.createAndRegisterWorker();
  }

  /**
   * Clear job timeout for a worker
   */
  private clearJobTimeout(worker: Worker) {
    const timeout = this.jobTimeouts.get(worker);
    if (timeout) {
      clearTimeout(timeout);
      this.jobTimeouts.delete(worker);
    }
  }

  /**
   * Perform health check on a worker to ensure it's responsive
   */
  private performHealthCheck(worker: Worker) {
    const healthCheckId = `health_check_${Date.now()}_${worker.threadId}`;
    const timeout = workerHealthCheckTimeout;

    logger.debug(
      'system',
      `[WorkerPool] Performing health check on ${this.workerType} worker ${worker.threadId}`,
    );

    // Set up timeout for health check
    const healthCheckTimeout = setTimeout(() => {
      // Track health check failure and check if pool should be marked as broken
      const poolBroken = this.trackHealthCheckFailure();

      const error = new WorkerError(
        this.workerType,
        healthCheckId,
        new Error('Health check timeout'),
      );
      const errorData = {
        workerType: this.workerType,
        threadId: worker.threadId,
        timeout,
        consecutiveHealthCheckFailures: this.consecutiveHealthCheckFailures,
        maxHealthCheckFailures: 5,
      };

      if (poolBroken) {
        logger.error(
          'worker',
          `Worker health check timeout - pool marked as broken`,
          undefined,
          errorData,
        );
      } else {
        logger.warn(
          'worker',
          `Worker health check timeout (failure ${this.consecutiveHealthCheckFailures}/5)`,
          errorData,
        );
      }

      // Clean up pending health check
      this.pendingHealthChecks.delete(worker);

      // Mark worker as being replaced to prevent double replacement
      this.beingReplaced.add(worker);

      // Terminate unresponsive worker explicitly
      try {
        worker.terminate();
        logger.debug(
          'system',
          `[WorkerPool] Terminated unresponsive ${this.workerType} worker ${worker.threadId}`,
        );
      } catch (error) {
        logger.debug(
          'system',
          `[WorkerPool] Failed to terminate worker ${worker.threadId}:`,
          error,
        );
      }

      // Remove unresponsive worker and create a replacement only if pool is not broken
      this.removeWorkerFromPool(worker);
      if (!poolBroken) {
        this.createAndRegisterWorker();
      }
    }, timeout);

    // Store the timeout so we can clear it if worker responds
    this.pendingHealthChecks.set(worker, healthCheckTimeout);

    // Listen for health check response
    const healthCheckHandler = (message: any) => {
      if (message?.type === 'health_check_response' && message?.checkId === healthCheckId) {
        // Clear the timeout since worker responded
        const timeout = this.pendingHealthChecks.get(worker);
        if (timeout) {
          clearTimeout(timeout);
          this.pendingHealthChecks.delete(worker);
        }

        worker.off('message', healthCheckHandler);

        // NOW mark worker as available since it passed health check
        this.availableWorkers.add(worker);

        // Reset failure tracking on successful recovery
        this.resetFailureTracking();
        this.resetHealthCheckFailures();

        logger.debug(
          'system',
          `[WorkerPool] ${this.workerType} worker ${worker.threadId} passed health check and is now available`,
        );

        // Process any queued jobs now that we have an available worker
        this.processNextJob();
      }
    };

    worker.on('message', healthCheckHandler);

    // Send health check request
    try {
      worker.postMessage({
        type: 'health_check',
        checkId: healthCheckId,
        timestamp: Date.now(),
      });
    } catch (error) {
      // Clear the timeout and pending health check
      const timeout = this.pendingHealthChecks.get(worker);
      if (timeout) {
        clearTimeout(timeout);
        this.pendingHealthChecks.delete(worker);
      }

      worker.off('message', healthCheckHandler);

      logger.workerError(
        'worker_health_check_send_failure',
        new WorkerError(
          this.workerType,
          healthCheckId,
          error instanceof Error ? error : new Error(String(error)),
        ),
        {
          workerType: this.workerType,
          threadId: worker.threadId,
        },
      );

      // Remove faulty worker and create a replacement
      this.removeWorkerFromPool(worker);
      this.createAndRegisterWorker();
    }
  }

  /**
   * Remove a worker from all tracking structures
   */
  private removeWorkerFromPool(worker: Worker) {
    this.availableWorkers.delete(worker);
    this.busyWorkers.delete(worker);
    this.beingReplaced.delete(worker);

    // Clean up any pending health check
    const healthCheckTimeout = this.pendingHealthChecks.get(worker);
    if (healthCheckTimeout) {
      clearTimeout(healthCheckTimeout);
      this.pendingHealthChecks.delete(worker);
    }

    // Clean up any job timeout
    this.clearJobTimeout(worker);

    const index = this.workers.indexOf(worker);
    if (index > -1) {
      this.workers.splice(index, 1);
    }

    try {
      worker.terminate();
    } catch (error) {
      // Ignore termination errors
    }
  }

  /**
   * Track a health check failure and determine if pool should be marked as broken
   */
  private trackHealthCheckFailure(): boolean {
    this.consecutiveHealthCheckFailures++;

    // Mark pool as broken after 5 consecutive health check failures
    if (this.consecutiveHealthCheckFailures >= 5) {
      this.poolBroken = true;
      logger.error(
        'worker',
        `Pool ${this.workerType} marked as broken after ${this.consecutiveHealthCheckFailures} consecutive health check failures`,
        undefined,
        {
          workerType: this.workerType,
          consecutiveFailures: this.consecutiveHealthCheckFailures,
        },
      );
      return true;
    }

    return false;
  }

  /**
   * Reset health check failure tracking on successful health check
   */
  private resetHealthCheckFailures() {
    this.consecutiveHealthCheckFailures = 0;
    this.poolBroken = false;
  }

  /**
   * Check if this pool is broken due to persistent health check failures
   */
  public isBroken(): boolean {
    return this.poolBroken;
  }

  /**
   * Track a worker failure and determine appropriate logging level
   */
  private trackWorkerFailure(): { shouldLogAsError: boolean; retryCount: number } {
    const now = Date.now();

    // Reset consecutive failures if enough time has passed since last failure
    if (now - this.lastFailureTime > workerRetryWindow) {
      this.consecutiveFailures = 0;
    }

    this.failureCount++;
    this.consecutiveFailures++;
    this.lastFailureTime = now;

    // Log as ERROR only if we've exceeded the max retries
    const shouldLogAsError = this.consecutiveFailures > maxWorkerRetries;

    return {
      shouldLogAsError,
      retryCount: this.consecutiveFailures,
    };
  }

  /**
   * Reset failure tracking when workers recover successfully
   */
  private resetFailureTracking() {
    this.consecutiveFailures = 0;
  }

  /**
   * Mark a worker as available for new jobs
   */
  private markWorkerAvailable(worker: Worker) {
    this.busyWorkers.delete(worker);
    this.availableWorkers.add(worker);

    // Clear any job timeout since job is completed
    this.clearJobTimeout(worker);

    // Reset failure tracking on successful job completion
    this.resetFailureTracking();
  }

  /**
   * Get pool statistics
   */
  public getStats() {
    return {
      workerType: this.workerType,
      totalWorkers: this.workers.length,
      availableWorkers: this.availableWorkers.size,
      busyWorkers: this.busyWorkers.size,
      pendingHealthChecks: this.pendingHealthChecks.size,
      queuedJobs: this.queue.length,
      consecutiveHealthCheckFailures: this.consecutiveHealthCheckFailures,
      poolBroken: this.poolBroken,
    };
  }

  /**
   * Shutdown all workers in this pool
   */
  public async shutdown() {
    logger.debug('system', `[WorkerPool] Shutting down ${this.workerType} worker pool`);

    const shutdownPromises = this.workers.map((worker) => {
      return new Promise<void>((resolve) => {
        worker.once('exit', () => resolve());
        worker.terminate();
      });
    });

    await Promise.all(shutdownPromises);

    this.workers.length = 0;
    this.availableWorkers.clear();
    this.busyWorkers.clear();
    this.queue.length = 0;
  }
}

/**
 * New WorkerManager with static worker pools per task type
 */
class WorkerManager {
  private embeddingPool: WorkerPool;
  private matchingPool: WorkerPool;
  private readyPromise: Promise<void>;
  private isReady: boolean = false;

  constructor() {
    // Initialise static worker pools
    this.embeddingPool = new WorkerPool('embedder', embeddingWorkers);
    this.matchingPool = new WorkerPool('matcher', matchingWorkers);

    logger.debug(
      'system',
      `[WorkerManager] Initialised with ${embeddingWorkers} embedding workers and ${matchingWorkers} matching workers`,
    );

    // Create ready promise
    this.readyPromise = this.waitForWorkersReady();
  }

  /**
   * Wait for all worker pools to have at least one available worker
   */
  private async waitForWorkersReady(): Promise<void> {
    logger.debug('system', '[WorkerManager] Waiting for worker pools to become ready...');

    const maxWaitTime = systemStartupTimeout;
    const checkInterval = 500; // Check every 500ms
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const checkReady = () => {
        const embeddingStats = this.embeddingPool.getStats();
        const matchingStats = this.matchingPool.getStats();

        // Check if any pools are broken and fail fast
        if (embeddingStats.poolBroken || matchingStats.poolBroken) {
          const brokenPools = [];
          if (embeddingStats.poolBroken) brokenPools.push('embedding');
          if (matchingStats.poolBroken) brokenPools.push('matching');

          reject(
            new Error(
              `Worker pools failed to initialise due to persistent health check failures: ${brokenPools.join(', ')}`,
            ),
          );
          return;
        }

        const embeddingReady = embeddingStats.availableWorkers > 0;
        const matchingReady = matchingStats.availableWorkers > 0;

        if (embeddingReady && matchingReady) {
          this.isReady = true;
          logger.debug(
            'system',
            `[WorkerManager] All worker pools ready:
      - Embedding workers: ${embeddingStats.totalWorkers} total, ${embeddingStats.availableWorkers} available
      - Matching workers: ${matchingStats.totalWorkers} total, ${matchingStats.availableWorkers} available`,
          );
          resolve();
        } else if (Date.now() - startTime > maxWaitTime) {
          reject(new Error('Timeout waiting for worker pools to become ready'));
        } else {
          logger.debug(
            'system',
            `[WorkerManager] Waiting for workers... Embedding: ${embeddingReady ? '✓' : '✗'}, Matching: ${matchingReady ? '✓' : '✗'}`,
          );
          setTimeout(checkReady, checkInterval);
        }
      };

      // Start checking after a short delay to allow workers to initialise
      setTimeout(checkReady, 1_000);
    });
  }

  /**
   * Promise that resolves when all worker pools are ready
   */
  public ready(): Promise<void> {
    return this.readyPromise;
  }

  /**
   * Check if worker manager is ready (synchronous)
   */
  public isWorkerManagerReady(): boolean {
    return this.isReady;
  }

  /**
   * Perform initial health check on all worker pools
   * @deprecated Use ready() promise instead
   */
  private performInitialHealthCheck() {
    logger.debug('system', '[WorkerManager] Performing initial health check on all worker pools');

    const embeddingStats = this.embeddingPool.getStats();
    const matchingStats = this.matchingPool.getStats();

    logger.debug(
      'system',
      `[WorkerManager] Health check complete:
      - Embedding workers: ${embeddingStats.totalWorkers} total, ${embeddingStats.availableWorkers} available, ${embeddingStats.pendingHealthChecks} pending health checks
      - Matching workers: ${matchingStats.totalWorkers} total, ${matchingStats.availableWorkers} available, ${matchingStats.pendingHealthChecks} pending health checks`,
    );

    if (embeddingStats.totalWorkers === 0 || matchingStats.totalWorkers === 0) {
      logger.error('system', '[WorkerManager] WARNING: Some worker pools have no active workers!');
    }
  }

  /**
   * Enqueue an embedding job
   */
  public enqueueEmbedding(job: EmbeddingJob, options?: JobQueueItem['options']) {
    this.embeddingPool.enqueue(job, options);
  }

  /**
   * Enqueue a matching job
   */
  public enqueueMatching(job: MatchingJob, options?: JobQueueItem['options']) {
    this.matchingPool.enqueue(job, options);
  }

  /**
   * Generic enqueue method that routes jobs based on type
   */
  public enqueue(job: any, workerScript: workerTypes, options?: JobQueueItem['options']) {
    if (workerScript === 'embedder') {
      this.enqueueEmbedding(job as EmbeddingJob, options);
    } else if (workerScript === 'matcher') {
      this.enqueueMatching(job as MatchingJob, options);
    } else {
      throw new Error(`Unknown worker type: ${workerScript}`);
    }
  }

  /**
   * Get statistics for all worker pools
   */
  public getStats() {
    return {
      embedding: this.embeddingPool.getStats(),
      matching: this.matchingPool.getStats(),
    };
  }

  /**
   * Shutdown all worker pools
   */
  public async shutdown() {
    logger.debug('system', '[WorkerManager] Shutting down all worker pools');

    await Promise.all([this.embeddingPool.shutdown(), this.matchingPool.shutdown()]);
  }
}

/**
 * Handle reasoning requests from matching workers
 * This maintains the same functionality as the old system
 */
async function handleReasoning(job: any, message: any) {
  const jobId = job.jobId || 'unknown';

  try {
    logger.debug('system', `[WorkerManager] Processing reasoning for job ${jobId}`);

    const finalMatches = [];

    // Add reasoning before saving in DB
    for (const [task, matches] of Object.entries(message.workload)) {
      try {
        const taskMatches = await addReason<
          Match & {
            taskId: string;
            taskText: string;
            type: 'name' | 'description' | 'proficiencyLevel';
            alignment: 'contradicting' | 'neutral' | 'aligning';
          }
        >(
          matches as (Match & {
            taskId: string;
            taskText: string;
            type: 'name' | 'description' | 'proficiencyLevel';
            alignment: 'contradicting' | 'neutral' | 'aligning';
          })[],
          task,
        );
        finalMatches.push(...taskMatches);
      } catch (error) {
        const reasoningError = new ReasoningError(
          (matches as any[]).length,
          error instanceof Error ? error : new Error(String(error)),
        );

        logger.workerError('reasoning_task_failure', reasoningError, {
          jobId,
          task: task.substring(0, 100) + (task.length > 100 ? '...' : ''),
          matchCount: (matches as any[]).length,
        });

        // Continue with original matches without reasoning
        finalMatches.push(...(matches as any[]));
      }
    }

    // Save results in database
    let db;
    try {
      db = getDB(job.dbName);
    } catch (error) {
      throw new DatabaseError('getDB', error instanceof Error ? error : new Error(String(error)));
    }

    for (const match of finalMatches) {
      try {
        db.addMatchResult({
          jobId: job.jobId,
          taskId: match.taskId,
          taskText: match.taskText,
          competenceId: match.competenceId,
          resourceId: match.resourceId,
          distance: match.distance,
          text: match.text,
          type: match.type,
          reason: match.reason,
          alignment: match.alignment,
        });
      } catch (error) {
        throw new DatabaseError(
          'addMatchResult',
          error instanceof Error ? error : new Error(String(error)),
        );
      }
    }

    // Update job status to completed
    try {
      db.updateJobStatus(job.jobId, 'completed');

      logger.debug(
        'system',
        `[WorkerManager] Job ${jobId} completed successfully with ${finalMatches.length} matches`,
      );
    } catch (error) {
      throw new DatabaseError(
        'updateJobStatus',
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  } catch (error) {
    logger.workerError(
      'reasoning_handler_failure',
      error instanceof Error ? error : new Error(String(error)),
      { jobId },
    );

    // Try to mark job as failed
    try {
      const db = getDB(job.dbName);
      db.updateJobStatus(job.jobId, 'failed');
    } catch (dbError) {
      logger.workerError(
        'job_failure_update_error',
        new DatabaseError(
          'updateJobStatus',
          dbError instanceof Error ? dbError : new Error(String(dbError)),
        ),
        { jobId },
      );
    }
  }
}

// Export singleton instance
const manager = new WorkerManager();
export default manager;
