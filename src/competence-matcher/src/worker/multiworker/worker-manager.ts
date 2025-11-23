// Backup original multi-worker manager
import { Worker } from 'worker_threads';
import { config } from '../../config';
import { createWorker } from '../../utils/worker';
import { EmbeddingJob, JobQueueItem, MatchingJob, workerTypes } from '../../utils/types';
import { WorkerError } from '../../utils/errors';
import { getLogger } from '../../utils/logger';
import { addReason } from '../../tasks/reason';
import { getDB } from '../../utils/db';

const { embeddingWorkers, matchingWorkers, workerDeathTimeout, jobMaxRetries } = config;
const logger = getLogger();

class WorkerPool {
  private workers: Worker[] = [];
  private availableWorkers: Set<Worker> = new Set();
  private busyWorkers: Map<Worker, string> = new Map();
  private activeJobs: Map<Worker, JobQueueItem> = new Map();
  private jobQueue: JobQueueItem[] = [];
  private workerDeathTimers: Map<Worker, NodeJS.Timeout> = new Map();
  private workersBeingReplaced: Set<number> = new Set();
  private readonly workerType: workerTypes;
  private readonly poolSize: number;
  private readonly maxJobRetries: number;
  private readonly workerInitData?: Record<string, unknown>;
  constructor(workerType: workerTypes, poolSize: number, workerInitData?: Record<string, unknown>) {
    this.workerType = workerType;
    this.poolSize = poolSize;
    this.maxJobRetries = Math.max(0, jobMaxRetries);
    this.workerInitData = workerInitData;
    this.initialiseWorkers();
  }
  private initialiseWorkers(): void {
    for (let i = 0; i < this.poolSize; i++) this.createWorker();
  }
  private createWorker(): void {
    const worker = createWorker(`multiworker/${this.workerType}`, this.workerInitData);
    this.workers.push(worker);
    const deathTimer = setTimeout(() => this.killWorker(worker), workerDeathTimeout);
    this.workerDeathTimers.set(worker, deathTimer);
    worker.on('message', (m: any) => {
      if (m.type === 'heartbeat') this.handleHeartbeat(worker);
      else if (m.type === 'log') this.handleWorkerLog(m);
    });
    worker.on('error', (e) => this.handleWorkerFailure(worker, e));
    worker.once('exit', () => this.handleWorkerFailure(worker, new Error('Worker exited')));
  }
  private handleHeartbeat(worker: Worker): void {
    const existing = this.workerDeathTimers.get(worker);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => this.killWorker(worker), workerDeathTimeout);
    this.workerDeathTimers.set(worker, timer);
    if (!this.busyWorkers.has(worker)) {
      this.availableWorkers.add(worker);
      this.processNextJob();
    }
  }
  private handleWorkerLog(message: any): void {
    const { level, logType, message: logMessage, data, error } = message;
    if (error) {
      const reconstructed = new Error(error.message);
      reconstructed.stack = error.stack;
      reconstructed.name = error.name;
      getLogger()[level as 'debug' | 'info' | 'warn' | 'error'](
        logType,
        logMessage,
        reconstructed,
        data,
      );
    } else {
      getLogger()[level as 'debug' | 'info' | 'warn' | 'error'](logType, logMessage, data);
    }
  }
  private killWorker(worker: Worker): void {
    if (this.workersBeingReplaced.has(worker.threadId)) return;
    this.workersBeingReplaced.add(worker.threadId);
    const activeJob = this.activeJobs.get(worker);
    if (activeJob) {
      this.activeJobs.delete(worker);
      this.busyWorkers.delete(worker);
      this.handleJobFailure(activeJob, new Error('Worker heartbeat timeout'));
    }
    this.removeWorker(worker);
    this.createWorker();
    this.workersBeingReplaced.delete(worker.threadId);
    this.processNextJob();
  }
  private handleWorkerFailure(worker: Worker, error: Error): void {
    if (this.workersBeingReplaced.has(worker.threadId)) return;
    this.workersBeingReplaced.add(worker.threadId);
    const activeJob = this.activeJobs.get(worker);
    if (activeJob) {
      this.activeJobs.delete(worker);
      this.busyWorkers.delete(worker);
      this.handleJobFailure(activeJob, error);
    }
    this.removeWorker(worker);
    this.createWorker();
    this.workersBeingReplaced.delete(worker.threadId);
    if (activeJob) this.processNextJob();
  }
  private removeWorker(worker: Worker): void {
    this.availableWorkers.delete(worker);
    this.busyWorkers.delete(worker);
    this.activeJobs.delete(worker);
    const timer = this.workerDeathTimers.get(worker);
    if (timer) {
      clearTimeout(timer);
      this.workerDeathTimers.delete(worker);
    }
    const index = this.workers.indexOf(worker);
    if (index > -1) this.workers.splice(index, 1);
    worker.removeAllListeners();
    worker.terminate();
    this.workersBeingReplaced.delete(worker.threadId);
  }
  public async executeJob(job: EmbeddingJob | MatchingJob): Promise<any> {
    return new Promise((resolve, reject) => {
      this.jobQueue.push({ job, resolve, reject, retryCount: 0 });
      this.processNextJob();
    });
  }
  private processing = false;
  private processNextJob(): void {
    if (this.processing) return;
    if (this.jobQueue.length === 0 || this.availableWorkers.size === 0) return;
    this.processing = true;
    const worker = this.availableWorkers.values().next().value as Worker;
    const item = this.jobQueue.shift()!;
    this.assignJobToWorker(worker, item);
    this.processing = false;
  }
  private assignJobToWorker(worker: Worker, queueItem: JobQueueItem): void {
    const { job, resolve, reject, retryCount } = queueItem;
    this.availableWorkers.delete(worker);
    this.busyWorkers.set(worker, job.jobId);
    this.activeJobs.set(worker, queueItem);
    const handler = (message: any) => {
      if (message.type === 'job_completed' && message.jobId === job.jobId) {
        worker.removeListener('message', handler);
        this.activeJobs.delete(worker);
        this.markWorkerAvailable(worker);
        resolve(message.result || 'Job completed');
        this.processNextJob();
      } else if (message.type === 'error' && message.jobId === job.jobId) {
        worker.removeListener('message', handler);
        this.activeJobs.delete(worker);
        this.markWorkerAvailable(worker);
        this.handleJobFailure(queueItem, new Error(message.error));
        this.processNextJob();
      } else if (message.type === 'job' && message.job === 'reason') {
        this.handleReasoning(job, message);
      }
    };
    worker.on('message', handler);
    worker.postMessage(job);
  }
  private markWorkerAvailable(worker: Worker): void {
    this.busyWorkers.delete(worker);
    this.availableWorkers.add(worker);
  }
  private handleJobFailure(queueItem: JobQueueItem, error: Error): void {
    const { job, resolve, reject, retryCount } = queueItem;
    if (retryCount < this.maxJobRetries) {
      this.jobQueue.unshift({ job, resolve, reject, retryCount: retryCount + 1 });
    } else {
      reject(new WorkerError(this.workerType, job.jobId, error));
    }
  }
  private async handleReasoning(job: any, message: any): Promise<void> {
    const finalMatches = [];
    for (const [task, matches] of Object.entries(message.workload)) {
      try {
        const taskMatches = await addReason(matches as any[], task);
        finalMatches.push(...taskMatches);
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
  }
  public async shutdown(): Promise<void> {
    this.jobQueue.forEach((i) => i.reject(new Error('Shutting down')));
    this.activeJobs.forEach((i) => i.reject(new Error('Shutting down')));
    this.workerDeathTimers.forEach((t) => clearTimeout(t));
    this.workers.forEach((w) => w.terminate());
    this.jobQueue.length = 0;
    this.activeJobs.clear();
    this.workerDeathTimers.clear();
    this.workers.length = 0;
    this.availableWorkers.clear();
    this.busyWorkers.clear();
  }
}
class WorkerManager {
  private embeddingPool: WorkerPool;
  private matchingPool: WorkerPool;
  constructor() {
    const onnxLockBuffer = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT);
    const view = new Int32Array(onnxLockBuffer);
    Atomics.store(view, 0, 0);
    const sharedWorkerData = { onnxLock: onnxLockBuffer } as Record<string, unknown>;
    this.embeddingPool = new WorkerPool('embedder', embeddingWorkers, sharedWorkerData);
    this.matchingPool = new WorkerPool('matcher', matchingWorkers, sharedWorkerData);
  }
  public async enqueue(job: EmbeddingJob | MatchingJob, workerType: workerTypes): Promise<any> {
    if (workerType === 'embedder') return this.embeddingPool.executeJob(job);
    if (workerType === 'matcher') return this.matchingPool.executeJob(job);
    throw new Error(`Unknown worker type: ${workerType}`);
  }
  public async shutdown(): Promise<void> {
    await Promise.all([this.embeddingPool.shutdown(), this.matchingPool.shutdown()]);
  }
}
const manager = new WorkerManager();
export default manager;
