import { Worker } from 'worker_threads';
import { config } from '../config';
import { createWorker } from '../utils/worker';
import { EmbeddingJob, MatchingJob, workerTypes, Match } from '../utils/types';
import { WorkerError, DatabaseError, ReasoningError } from '../utils/errors';
import { logError } from '../middleware/logging';
import { addReason } from '../tasks/reason';
import { getDB } from '../utils/db';

const { verbose, embeddingWorkers, matchingWorkers } = config;

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

    if (verbose) {
      console.log(`[WorkerPool] Initialised ${this.poolSize} ${this.workerType} workers`);
    }
  }

  /**
   * Create a new worker and register it in the pool
   */
  private createAndRegisterWorker() {
    // Check if we already have enough workers (including those pending health checks)
    if (this.workers.length >= this.poolSize) {
      if (verbose) {
        console.log(
          `[WorkerPool] Not creating new ${this.workerType} worker - pool already has ${this.workers.length}/${this.poolSize} workers`,
        );
      }
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

      logError(workerError, 'worker_pool_creation_failure', undefined, {
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
      if (verbose) {
        console.log(`[WorkerPool] ${this.workerType} worker ${worker.threadId} is online`);
      }
    });

    worker.on('error', (err) => {
      const jobId = this.busyWorkers.get(worker) || 'unknown';
      const workerError = new WorkerError(
        this.workerType,
        jobId,
        err instanceof Error ? err : new Error(String(err)),
      );

      logError(workerError, 'worker_pool_runtime_error', undefined, {
        workerType: this.workerType,
        threadId: worker.threadId,
        jobId,
      });

      // Mark worker as available again and try to process next job
      this.markWorkerAvailable(worker);
      this.processNextJob();
    });

    // Handle unexpected worker exits - restart the worker
    worker.once('exit', (code) => {
      const jobId = this.busyWorkers.get(worker) || 'unknown';

      if (verbose) {
        console.log(
          `[WorkerPool] ${this.workerType} worker ${worker.threadId} exited with code ${code}`,
        );
      }

      // Check if this worker is already being replaced to prevent double replacement
      if (this.beingReplaced.has(worker)) {
        if (verbose) {
          console.log(
            `[WorkerPool] Worker ${worker.threadId} already being replaced, skipping duplicate replacement`,
          );
        }
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

    if (verbose) {
      console.log(
        `[WorkerPool] Enqueued ${this.workerType} job ${job.jobId} (queue: ${this.queue.length}, available: ${this.availableWorkers.size})`,
      );
    }

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

    if (verbose) {
      console.log(
        `[WorkerPool] Assigning ${this.workerType} job ${job.jobId} to worker ${worker.threadId}`,
      );
    }

    // Set up message handling for this specific job
    const messageHandler = (message: any) => {
      try {
        switch (message.type) {
          case 'status':
            if (verbose) {
              console.log(
                `[WorkerPool] Worker ${worker.threadId} for job ${message.jobId || job.jobId} status: ${message.status}`,
              );
            }
            break;
          case 'error':
            logError(
              new WorkerError(
                this.workerType,
                message.jobId || job.jobId,
                new Error(message.error),
              ),
              'worker_reported_error',
              undefined,
              {
                workerType: this.workerType,
                threadId: worker.threadId,
                jobId: message.jobId || job.jobId,
                reportedError: message.error,
              },
            );
            break;
          case 'log':
            if (verbose) {
              console.log(
                `[WorkerPool] Worker ${worker.threadId} for job ${message.jobId || job.jobId} log: ${message.message}`,
              );
            }
            break;
          case 'job_completed':
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
                logError(
                  error instanceof Error ? error : new Error(String(error)),
                  'reasoning_handler_async_failure',
                  undefined,
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

        logError(messageHandlingError, 'worker_message_handling_error', undefined, {
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
      const messageError = new WorkerError(
        this.workerType,
        job.jobId,
        error instanceof Error ? error : new Error(String(error)),
      );

      logError(messageError, 'worker_message_send_failure', undefined, {
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
   * Perform health check on a worker to ensure it's responsive
   */
  private performHealthCheck(worker: Worker) {
    const healthCheckId = `health_check_${Date.now()}_${worker.threadId}`;
    const timeout = 20000; // 20 seconds timeout for model loading

    if (verbose) {
      console.log(
        `[WorkerPool] Performing health check on ${this.workerType} worker ${worker.threadId}`,
      );
    }

    // Set up timeout for health check
    const healthCheckTimeout = setTimeout(() => {
      logError(
        new WorkerError(this.workerType, healthCheckId, new Error('Health check timeout')),
        'worker_health_check_timeout',
        undefined,
        {
          workerType: this.workerType,
          threadId: worker.threadId,
          timeout,
        },
      );

      // Clean up pending health check
      this.pendingHealthChecks.delete(worker);

      // Mark worker as being replaced to prevent double replacement
      this.beingReplaced.add(worker);

      // Terminate unresponsive worker explicitly
      try {
        worker.terminate();
        if (verbose) {
          console.log(
            `[WorkerPool] Terminated unresponsive ${this.workerType} worker ${worker.threadId}`,
          );
        }
      } catch (error) {
        if (verbose) {
          console.log(`[WorkerPool] Failed to terminate worker ${worker.threadId}:`, error);
        }
      }

      // Remove unresponsive worker and create a replacement
      this.removeWorkerFromPool(worker);
      this.createAndRegisterWorker();
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

        if (verbose) {
          console.log(
            `[WorkerPool] ${this.workerType} worker ${worker.threadId} passed health check and is now available`,
          );
        }

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

      logError(
        new WorkerError(
          this.workerType,
          healthCheckId,
          error instanceof Error ? error : new Error(String(error)),
        ),
        'worker_health_check_send_failure',
        undefined,
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
    const timeout = this.pendingHealthChecks.get(worker);
    if (timeout) {
      clearTimeout(timeout);
      this.pendingHealthChecks.delete(worker);
    }

    const index = this.workers.indexOf(worker);
    if (index > -1) {
      this.workers.splice(index, 1);
    }

    try {
      worker.terminate();
    } catch (error) {
      // Ignore termination errors
    }
  } /**
   * Mark a worker as available for new jobs
   */
  private markWorkerAvailable(worker: Worker) {
    this.busyWorkers.delete(worker);
    this.availableWorkers.add(worker);
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
    };
  }

  /**
   * Shutdown all workers in this pool
   */
  public async shutdown() {
    if (verbose) {
      console.log(`[WorkerPool] Shutting down ${this.workerType} worker pool`);
    }

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

    if (verbose) {
      console.log(
        `[WorkerManager] Initialised with ${embeddingWorkers} embedding workers and ${matchingWorkers} matching workers`,
      );
    }

    // Create ready promise
    this.readyPromise = this.waitForWorkersReady();
  }

  /**
   * Wait for all worker pools to have at least one available worker
   */
  private async waitForWorkersReady(): Promise<void> {
    if (verbose) {
      console.log('[WorkerManager] Waiting for worker pools to become ready...');
    }

    const maxWaitTime = 30_000; // 30 seconds max wait
    const checkInterval = 500; // Check every 500ms
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const checkReady = () => {
        const embeddingStats = this.embeddingPool.getStats();
        const matchingStats = this.matchingPool.getStats();

        const embeddingReady = embeddingStats.availableWorkers > 0;
        const matchingReady = matchingStats.availableWorkers > 0;

        if (embeddingReady && matchingReady) {
          this.isReady = true;
          if (verbose) {
            console.log(`[WorkerManager] All worker pools ready:
      - Embedding workers: ${embeddingStats.totalWorkers} total, ${embeddingStats.availableWorkers} available
      - Matching workers: ${matchingStats.totalWorkers} total, ${matchingStats.availableWorkers} available`);
          }
          resolve();
        } else if (Date.now() - startTime > maxWaitTime) {
          reject(new Error('Timeout waiting for worker pools to become ready'));
        } else {
          if (verbose) {
            console.log(
              `[WorkerManager] Waiting for workers... Embedding: ${embeddingReady ? '✓' : '✗'}, Matching: ${matchingReady ? '✓' : '✗'}`,
            );
          }
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
    if (verbose) {
      console.log('[WorkerManager] Performing initial health check on all worker pools');
    }

    const embeddingStats = this.embeddingPool.getStats();
    const matchingStats = this.matchingPool.getStats();

    console.log(`[WorkerManager] Health check complete:
      - Embedding workers: ${embeddingStats.totalWorkers} total, ${embeddingStats.availableWorkers} available, ${embeddingStats.pendingHealthChecks} pending health checks
      - Matching workers: ${matchingStats.totalWorkers} total, ${matchingStats.availableWorkers} available, ${matchingStats.pendingHealthChecks} pending health checks`);

    if (embeddingStats.totalWorkers === 0 || matchingStats.totalWorkers === 0) {
      console.error('[WorkerManager] WARNING: Some worker pools have no active workers!');
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
   * Generic enqueue method for backward compatibility
   * @deprecated Use enqueueEmbedding or enqueueMatching instead
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
    if (verbose) {
      console.log('[WorkerManager] Shutting down all worker pools');
    }

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
    if (verbose) {
      console.log(`[WorkerManager] Processing reasoning for job ${jobId}`);
    }

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

        logError(reasoningError, 'reasoning_task_failure', undefined, {
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

      if (verbose) {
        console.log(
          `[WorkerManager] Job ${jobId} completed successfully with ${finalMatches.length} matches`,
        );
      }
    } catch (error) {
      throw new DatabaseError(
        'updateJobStatus',
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  } catch (error) {
    logError(
      error instanceof Error ? error : new Error(String(error)),
      'reasoning_handler_failure',
      undefined,
      { jobId },
    );

    // Try to mark job as failed
    try {
      const db = getDB(job.dbName);
      db.updateJobStatus(job.jobId, 'failed');
    } catch (dbError) {
      logError(
        new DatabaseError(
          'updateJobStatus',
          dbError instanceof Error ? dbError : new Error(String(dbError)),
        ),
        'job_failure_update_error',
        undefined,
        { jobId },
      );
    }
  }
}

// Export singleton instance
const manager = new WorkerManager();
export default manager;
