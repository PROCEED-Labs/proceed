import { Worker } from 'worker_threads';
import { config } from '../config';
import { createWorker } from '../utils/worker';
import { splitSemantically } from '../tasks/semantic-split';
import { Match, WorkerQueue, workerTypes } from '../utils/types';
import { addReason } from '../tasks/reason';
import { getDB } from '../utils/db';
import { WorkerError, DatabaseError, ReasoningError } from '../utils/errors';
import { logError } from '../middleware/logging';

const { verbose, maxWorkerThreads } = config;

class WorkerManager {
  private concurrency: number;
  private queue: WorkerQueue[] = [];
  private active: Set<Worker> = new Set();

  constructor(concurrency: number) {
    this.concurrency = concurrency;
  }

  /**
   * Enqueue a job for the named worker script
   */
  public enqueue(job: any, workerScript: workerTypes, options: WorkerQueue['options'] = {}) {
    this.queue.push({ job, workerScript, options });

    if (verbose) {
      console.log(
        `[WorkerManager] Enqueued ${workerScript} job ${job.jobId || 'unknown'} (queue: ${this.queue.length}, active: ${this.active.size})`,
      );
    }

    this.dispatch();
  }

  /** Try to start as many queued jobs as we have free threads */
  private dispatch() {
    while (this.active.size < this.concurrency && this.queue.length > 0) {
      const { job, workerScript, options } = this.queue.shift()!;
      this.startWorker(job, workerScript, options);
    }
  }

  /** Spawn one worker, hook up its lifecycle, and send the job */
  private startWorker(job: any, workerScript: workerTypes, options: WorkerQueue['options']) {
    const jobId = job.jobId || 'unknown';

    let worker: Worker;
    try {
      worker = createWorker(workerScript);
    } catch (error) {
      const workerError = new WorkerError(
        workerScript,
        jobId,
        error instanceof Error ? error : new Error(String(error)),
      );

      logError(workerError, 'worker_creation_failure', undefined, {
        workerScript,
        jobId,
        queueLength: this.queue.length,
        activeWorkers: this.active.size,
      });

      options?.onError?.(job, workerError);
      return;
    }

    this.active.add(worker);

    worker.once('online', () => {
      if (verbose) {
        console.log(`[WorkerManager] Worker for ${workerScript} job ${jobId} started`);
      }

      try {
        worker.postMessage(job);
        options?.onOnline?.(job);
      } catch (error) {
        const messageError = new WorkerError(
          workerScript,
          jobId,
          error instanceof Error ? error : new Error(String(error)),
        );

        logError(messageError, 'worker_message_send_failure', undefined, {
          workerScript,
          jobId,
        });

        this.active.delete(worker);
        worker.terminate();
        this.dispatch();
        options?.onError?.(job, messageError);
      }
    });

    // When the worker exits (success or failure), remove from active set & dispatch next
    worker.once('exit', (code) => {
      this.active.delete(worker);

      if (code === 1) {
        const exitError = new WorkerError(
          workerScript,
          jobId,
          new Error(`Worker exited with failure code: ${code}`),
        );

        logError(exitError, 'worker_exit_failure', undefined, {
          workerScript,
          jobId,
          exitCode: code,
        });
      } else if (code === 0) {
        if (verbose) {
          console.log(
            `[WorkerManager] Worker for ${workerScript} job ${jobId} completed successfully`,
          );
        }
      } else if (code === 2) {
        const timeoutError = new WorkerError(
          workerScript,
          jobId,
          new Error('Worker timed out during execution'),
        );

        logError(timeoutError, 'worker_timeout', undefined, {
          workerScript,
          jobId,
          exitCode: code,
        });
      } else {
        const unexpectedExitError = new WorkerError(
          workerScript,
          jobId,
          new Error(`Worker exited with unexpected code: ${code}`),
        );

        logError(unexpectedExitError, 'worker_unexpected_exit', undefined, {
          workerScript,
          jobId,
          exitCode: code,
        });
      }

      this.dispatch();
      options?.onExit?.(job, code);
    });

    worker.once('error', (err) => {
      const workerError = new WorkerError(
        workerScript,
        jobId,
        err instanceof Error ? err : new Error(String(err)),
      );

      logError(workerError, 'worker_runtime_error', undefined, {
        workerScript,
        jobId,
      });

      options?.onError?.(job, workerError);
    });

    worker.on('message', async (message) => {
      try {
        switch (message.type) {
          case 'status':
            if (verbose) {
              console.log(
                `[WorkerManager] Worker for job ${message.jobId} status: ${message.status}`,
              );
            }
            break;
          case 'error':
            logError(
              new WorkerError(workerScript, message.jobId || jobId, new Error(message.error)),
              'worker_reported_error',
              undefined,
              { workerScript, jobId: message.jobId || jobId, reportedError: message.error },
            );
            break;
          case 'log':
            if (verbose) {
              console.log(
                `[WorkerManager] Worker for job ${message.jobId} log: ${message.message}`,
              );
            }
            break;

          // Workaround for adding reasoning before saving in DB
          case 'job':
            switch (message.job) {
              case 'reason':
                await handleReasoning(job, message);
                break;
            }
            break;
        }
        options?.onMessage?.(job, message);
      } catch (error) {
        const messageHandlingError = new WorkerError(
          workerScript,
          jobId,
          error instanceof Error ? error : new Error(String(error)),
        );

        logError(messageHandlingError, 'worker_message_handling_error', undefined, {
          workerScript,
          jobId,
          messageType: message.type,
        });
      }
    });
  }
}

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

    // Save in DB
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

    // Update job status
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

// export a singleton instance
const manager = new WorkerManager(maxWorkerThreads);
export default manager;
