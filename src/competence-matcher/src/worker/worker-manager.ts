import { Worker } from 'worker_threads';
import { config } from '../config';
import { createWorker } from '../utils/worker';
import { EmbeddingJob, MatchingJob, JobQueueItem, workerTypes } from '../utils/types';
import { WorkerError } from '../utils/errors';
import { getLogger } from '../utils/logger';
import { addReason } from '../tasks/reason';
import { getDB } from '../utils/db';

const { workerHeartbeatInterval, workerDeathTimeout, jobMaxRetries } = config;
const logger = getLogger();

// Recommended heartbeat strategy values (can be tuned via env):
// heartbeat interval: workerHeartbeatInterval (e.g. 30-60s)
// death timeout: workerDeathTimeout (e.g. 240s) => ~4-8x interval

interface SingleJobItem extends JobQueueItem {
  startedAt?: number;
  queueDepthAtStart?: number;
  meta?: {
    kind: 'embedding' | 'matching';
    subtaskErrors: number;
    reasonMatches: number;
    reasonedCount: number;
  };
}

/**
 * SingleWorkerManager - streamlined mono-worker queue for inference.
 * Keeps public API: enqueue(job, type) + shutdown(). All computation lives in one worker.
 */
class WorkerManager {
  private worker: Worker | null = null;
  private queue: SingleJobItem[] = [];
  private current: SingleJobItem | null = null;
  private lastHeartbeat = Date.now();
  private heartbeatMonitor: NodeJS.Timeout | null = null;
  private shuttingDown = false;

  constructor() {
    logger.info('worker', 'Initialising SingleWorkerManager (inference)', {
      workerHeartbeatInterval,
      workerDeathTimeout,
      jobMaxRetries,
    });
    this.spawnWorker();
    this.startHeartbeatMonitor();
  }

  private spawnWorker(): void {
    this.worker = createWorker('inference');
    const threadId = this.worker.threadId;
    logger.info('worker', 'Spawned inference worker', { threadId });

    this.worker.on('message', (msg: any) => this.handleMessage(msg));
    this.worker.on('error', (err) => this.handleWorkerCrash(err));
    this.worker.on('exit', (code) => {
      this.handleWorkerCrash(new Error(`Worker exited with code ${code}`));
    });
  }

  private startHeartbeatMonitor(): void {
    if (this.heartbeatMonitor) clearInterval(this.heartbeatMonitor);
    this.heartbeatMonitor = setInterval(
      () => {
        if (!this.worker) return;
        const silenceMs = Date.now() - this.lastHeartbeat;
        if (silenceMs > workerDeathTimeout) {
          const activeJobId = this.current?.job.jobId;
          logger.warn('worker', 'Heartbeat timeout – restarting worker', {
            silenceMs,
            workerDeathTimeout,
            activeJobId,
            queueLength: this.queue.length,
            retryCount: this.current?.retryCount,
          });
          this.respawnWorker(true);
        }
      },
      Math.max(10_000, workerHeartbeatInterval / 2),
    );
  }

  private respawnWorker(dueToTimeoutOrCrash = false): void {
    if (this.worker) {
      this.worker.removeAllListeners();
      try {
        this.worker.terminate();
      } catch {}
    }
    this.worker = null;
    // Requeue current job if any (unless shutting down)
    if (dueToTimeoutOrCrash && this.current && !this.shuttingDown) {
      const item = this.current;
      this.current = null;
      this.retryOrFail(item, new Error('Worker unresponsive / crashed'));
    } else {
      this.current = null;
    }
    this.spawnWorker();
    // Continue processing remaining queue
    this.processNext();
  }

  private handleMessage(msg: any): void {
    // Any message counts as liveness indicator
    this.lastHeartbeat = Date.now();
    if (msg.type === 'heartbeat') {
      logger.debug('worker', 'Heartbeat received', { threadId: this.worker?.threadId });
      return; // already updated timestamp
    }
    if (msg.type === 'log') {
      // Forward log (avoid duplicating error stack later)
      const { level, logType, message, data, error } = msg;
      const logFn =
        typeof level === 'string' && ['debug', 'info', 'warn', 'error'].includes(level)
          ? (logger as any)[level].bind(logger)
          : (logger as any).info.bind(logger);
      if (error) {
        const e = new Error(error.message);
        e.stack = error.stack;
        e.name = error.name;
        logFn(logType, message, e, data);
      } else {
        logFn(logType, message, data);
      }
      return;
    }
    if (!this.current) return; // Ignore job-specific messages if no active job
    const jobId = this.current.job.jobId;

    if (msg.type === 'error' && msg.jobId === jobId) {
      // Worker reported a job-level error
      logger.info('worker', 'Job error received', { jobId, message: msg.error });
      this.retryOrFail(this.current, new Error(msg.error));
      return;
    }
    if (msg.type === 'job' && msg.job === 'reason') {
      this.handleReasoning(this.current.job, msg.workload).catch((err) => {
        logger.error('worker', 'Reasoning handling failed', err, { jobId });
      });
      return;
    }
    if (msg.type === 'job_completed' && msg.jobId === jobId) {
      const finished = this.current;
      this.current = null;
      const durationMs = Date.now() - (finished.startedAt || Date.now());
      logger.info('worker', 'Job completed', {
        jobId,
        durationMs,
        retries: finished.retryCount,
      });
      const summary = this.buildSummary(finished, durationMs);
      finished.resolve(summary);
      this.processNext();
      return;
    }
  }

  private buildSummary(item: SingleJobItem, durationMs: number) {
    const kind = item.meta?.kind;
    return {
      jobId: item.job.jobId,
      kind,
      retries: item.retryCount,
      durationMs,
      queueDepthAtStart: item.queueDepthAtStart,
      workerThreadId: this.worker?.threadId,
      matchStats:
        kind === 'matching'
          ? {
              reasonedCount: item.meta?.reasonedCount || 0,
              totalMatchesSeen: item.meta?.reasonMatches || 0,
            }
          : undefined,
      embeddingStats:
        kind === 'embedding' ? { tasks: (item.job as EmbeddingJob).tasks.length } : undefined,
      subtaskErrors: item.meta?.subtaskErrors || 0,
      completedAt: new Date().toISOString(),
    };
  }

  private processNext(): void {
    if (this.current || this.shuttingDown) return;
    if (!this.worker) return; // will resume after respawn
    const next = this.queue.shift();
    if (!next) return;
    this.current = next;
    next.startedAt = Date.now();
    next.meta = next.meta || {
      kind: this.detectKind(next.job),
      subtaskErrors: 0,
      reasonMatches: 0,
      reasonedCount: 0,
    };
    logger.info('worker', 'Starting job', {
      jobId: next.job.jobId,
      kind: next.meta.kind,
      retryCount: next.retryCount,
      queueRemaining: this.queue.length,
    });
    try {
      this.worker.postMessage(next.job);
    } catch (err) {
      logger.error('worker', 'Failed to post job to worker (will retry)', err as Error, {
        jobId: next.job.jobId,
      });
      this.retryOrFail(next, err instanceof Error ? err : new Error(String(err)));
    }
  }

  private detectKind(job: EmbeddingJob | MatchingJob): 'embedding' | 'matching' {
    const maybeEmbedding = job as EmbeddingJob;
    return (maybeEmbedding as EmbeddingJob).tasks && (maybeEmbedding as any).mode !== undefined
      ? 'embedding'
      : 'matching';
  }

  public async enqueue(job: EmbeddingJob | MatchingJob, workerType: workerTypes): Promise<any> {
    if (this.shuttingDown) throw new Error('WorkerManager shutting down');
    const kind = this.detectKind(job);
    logger.info('worker', 'Enqueue job', {
      jobId: job.jobId,
      workerType,
      kind,
      queueLengthBefore: this.queue.length,
    });
    return new Promise((resolve, reject) => {
      const item: SingleJobItem = {
        job,
        resolve,
        reject,
        retryCount: 0,
        queueDepthAtStart: this.queue.length,
      };
      this.queue.push(item);
      this.processNext();
    });
  }

  private retryOrFail(item: SingleJobItem, err: Error): void {
    const jobId = item.job.jobId;
    if (item.retryCount < jobMaxRetries) {
      item.retryCount += 1;
      logger.info('worker', 'Retrying job', { jobId, retryCount: item.retryCount });
      // Put at front of queue
      this.queue.unshift(item);
      if (this.current === item) this.current = null; // ensure freed
      this.processNext();
    } else {
      logger.error('worker', 'Job failed permanently', new WorkerError('inference', jobId, err), {
        jobId,
        retries: item.retryCount,
      });
      if (this.current === item) this.current = null;
      item.reject(new WorkerError('inference', jobId, err));
      this.processNext();
    }
  }

  private async handleReasoning(job: EmbeddingJob | MatchingJob, workload: Record<string, any[]>) {
    const finalMatches: any[] = [];
    for (const [taskText, matches] of Object.entries(workload)) {
      try {
        const enriched = await addReason(matches as any[], taskText);
        finalMatches.push(...enriched);
        if (this.current?.meta) {
          this.current.meta.reasonMatches += (matches as any[]).length;
          this.current.meta.reasonedCount += enriched.filter((m) => m.reason).length;
        }
      } catch {
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
      } catch {}
    }
    try {
      db.updateJobStatus(job.jobId, 'completed');
    } catch {}
    logger.info('worker', 'Reasoning stored', {
      jobId: job.jobId,
      matchCount: finalMatches.length,
    });
  }

  private handleWorkerCrash(error: Error): void {
    logger.error('worker', 'Worker crash detected – respawning', error, {
      activeJobId: this.current?.job.jobId,
    });
    this.respawnWorker(true);
  }

  public async shutdown(): Promise<void> {
    this.shuttingDown = true;
    logger.info('worker', 'Shutting down worker manager', {
      inFlight: this.current?.job.jobId,
      queueLength: this.queue.length,
    });
    // Reject queued jobs
    for (const item of this.queue) item.reject(new Error('Shutting down'));
    this.queue.length = 0;
    if (this.current) {
      this.current.reject(new Error('Shutting down'));
      this.current = null;
    }
    if (this.worker) {
      this.worker.removeAllListeners();
      try {
        await this.worker.terminate();
      } catch {}
      this.worker = null;
    }
    if (this.heartbeatMonitor) clearInterval(this.heartbeatMonitor);
  }
}

const manager = new WorkerManager();
export default manager;
