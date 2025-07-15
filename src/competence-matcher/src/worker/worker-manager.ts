import { Worker } from 'worker_threads';
import { config } from '../config';
import { createWorker } from '../utils/worker';
import { splitSemantically } from '../tasks/semantic-split';
import { Match, WorkerQueue, workerTypes } from '../utils/types';
import { addReason } from '../tasks/reason';
import { getDB } from '../utils/db';

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
    const worker = createWorker(workerScript);

    this.active.add(worker);

    worker.once('online', () => {
      // console.log(`[WorkerManager] Worker for ${workerScript} started`);
      worker.postMessage(job);

      options?.onOnline?.(job);
    });

    // When the worker exits (success or failure), remove from active set & dispatch next
    worker.once('exit', (code) => {
      this.active.delete(worker);
      if (code === 1) {
        console.error(`[WorkerManager] ${workerScript} exited (failed) with code`, code);
      } else if (code === 0) {
        // console.log(`[WorkerManager] ${workerScript} exited successfully`);
      } else if (code === 2) {
        console.error(`[WorkerManager] ${workerScript} timed out`);
      }
      this.dispatch();

      options?.onExit?.(job, code);
    });

    worker.once('error', (err) => {
      console.error(`[WorkerManager] ${workerScript} error:`, err);

      options?.onError?.(job, err);
    });

    worker.on('message', async (message) => {
      switch (message.type) {
        case 'status':
          console.log(`[WorkerManager] Worker for job ${message.jobId} status:`, message.status);
          break;
        case 'error':
          console.error(`[WorkerManager] Worker for job ${message.jobId} error:`, message.error);
          break;
        case 'log':
          console.log(`[WorkerManager] Worker for job ${message.jobId} log:`, message.message);
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
    });
  }
}

async function handleReasoning(job: any, message: any) {
  const finalMatches = [];
  // Add reasoning before saving in DB
  for (const [task, matches] of Object.entries(message.workload)) {
    const taskMatches = await addReason<
      Match & { taskId: string; type: 'name' | 'description' | 'proficiencyLevel' }
    >(
      matches as (Match & {
        taskId: string;
        type: 'name' | 'description' | 'proficiencyLevel';
      })[],
      task,
    );
    finalMatches.push(...taskMatches);
  }

  // Save in DB
  const db = getDB(job.dbName);

  for (const match of finalMatches) {
    db.addMatchResult({
      jobId: job.jobId,
      taskId: match.taskId,
      competenceId: match.competenceId,
      text: match.text,
      type: match.type,
      distance: match.distance,
      reason: match.reason,
    });
  }

  // Update job status
  db.updateJobStatus(job.jobId, 'completed');
}

// export a singleton instance
const manager = new WorkerManager(config.maxWorkerThreads);
export default manager;
