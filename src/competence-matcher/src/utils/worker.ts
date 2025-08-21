import * as fs from 'node:fs';
import * as path from 'node:path';
import { Worker, parentPort } from 'worker_threads';
import VectorDataBase from '../db/db';
import { getDB } from './db';
import { config } from '../config';
import { getLogger, createLoggerConfig } from './logger';

const { maxJobTime } = config;

// Initialise logger for worker if not already done
let logger: ReturnType<typeof getLogger> | null = null;

function ensureLogger() {
  if (!logger) {
    try {
      logger = getLogger();
    } catch (error) {
      // Logger not initialised yet, initialise it
      const { getLogger: initLogger } = require('./logger');
      initLogger(createLoggerConfig());
      logger = getLogger();
    }
  }
  return logger;
}

export function createWorker(filename: string): Worker {
  const tsPath = path.resolve(__dirname, `../worker/${filename}.ts`);
  const jsPath = path.resolve(__dirname, `../worker/${filename}.js`);
  const isTs = fs.existsSync(tsPath);

  const workerFile = isTs ? tsPath : jsPath;

  const execArgv = isTs
    ? [...process.execArgv, '-r', 'ts-node/register/transpile-only']
    : process.execArgv;

  const worker = new Worker(workerFile, { execArgv });

  return worker;
}

export async function withJobUpdates<T>(
  job: { jobId: string; dbName: string },
  cb: (db: VectorDataBase, payload: T) => Promise<void>,
  options?: {
    onStart?: () => void;
    onDone?: () => void;
    onError?: (error: Error) => void;
  },
) {
  const db = getDB(job.dbName);
  let exitCode = 0; // success by default
  let maxTimeCheck = setTimeout(() => {
    // if not completed by then, timeout
    process.exit(2);
  }, maxJobTime);
  try {
    if (options && options.onStart) {
      options.onStart();
    } else {
      db.updateJobStatus(job.jobId, 'running');
      parentPort!.postMessage({ type: 'status', jobId: job.jobId, status: 'running' });
    }

    await cb(db, job as any as T);

    if (options && options.onDone) {
      options.onDone();
    } else {
      db.updateJobStatus(job.jobId, 'completed');
      parentPort!.postMessage({ type: 'status', jobId: job.jobId, status: 'completed' });
    }
  } catch (err) {
    if (options && options.onError) {
      options.onError(err as Error);
    } else {
      exitCode = 1; // indicate failure
      parentPort!.postMessage({
        type: 'error',
        jobId: job.jobId,
        error: err instanceof Error ? err.message : String(err),
      });
      db.updateJobStatus(job.jobId, 'failed');
    }
  } finally {
    clearTimeout(maxTimeCheck);
    db.close();
    // Don't close parentPort or exit process for static worker pools
    // Workers need to stay alive to process more jobs
  }
}

export function log(...args: any[]) {
  parentPort?.postMessage({ type: 'log', message: args.map(String).join(' ') });
}

/**
 * Context manager for propagating request IDs through worker threads
 */
export class WorkerContext {
  private static contexts: Map<string, string> = new Map(); // jobId -> requestId

  /**
   * Set context for a job
   */
  static setContext(jobId: string, requestId: string): void {
    this.contexts.set(jobId, requestId);
    ensureLogger().debug('worker', `Context set for job ${jobId}`, { requestId });
  }

  /**
   * Get context for a job
   */
  static getContext(jobId: string): string | undefined {
    return this.contexts.get(jobId);
  }

  /**
   * Remove context for a completed job
   */
  static clearContext(jobId: string): void {
    const removed = this.contexts.delete(jobId);
    if (removed) {
      ensureLogger().debug('worker', `Context cleared for job ${jobId}`);
    }
  }

  /**
   * Log worker activity with proper context
   */
  static logWorker(
    level: 'debug' | 'info' | 'warn' | 'error',
    jobId: string,
    message: string,
    data?: any,
    error?: Error,
  ): void {
    const requestId = this.getContext(jobId);

    switch (level) {
      case 'debug':
        ensureLogger().worker(message, { jobId, ...data }, requestId);
        break;
      case 'info':
        ensureLogger().workerInfo(message, { jobId, ...data }, requestId);
        break;
      case 'warn':
        ensureLogger().warn('worker', message, { jobId, ...data }, requestId);
        break;
      case 'error':
        ensureLogger().workerError(message, error, { jobId, ...data }, requestId);
        break;
    }
  }

  /**
   * Enhanced worker creation with context support
   */
  static createWorkerWithContext(
    filename: string,
    jobId: string,
    requestId: string,
    workerData?: any,
  ): Worker {
    this.setContext(jobId, requestId);

    const worker = createWorker(filename);

    // Log worker lifecycle events
    worker.on('online', () => {
      this.logWorker('debug', jobId, `Worker ${worker.threadId} started`);
    });

    worker.on('exit', (code) => {
      this.logWorker('debug', jobId, `Worker ${worker.threadId} exited with code ${code}`);
      this.clearContext(jobId);
    });

    worker.on('error', (error) => {
      this.logWorker('error', jobId, `Worker ${worker.threadId} error`, undefined, error);
      this.clearContext(jobId);
    });

    return worker;
  }
}

/**
 * Enhanced worker message handling with logging
 */
export function handleWorkerMessage(
  worker: Worker,
  jobId: string,
  onMessage: (message: any) => void,
  onError?: (error: Error) => void,
): void {
  worker.on('message', (message) => {
    WorkerContext.logWorker('debug', jobId, 'Received message from worker', {
      threadId: worker.threadId,
      messageType: message.type || 'unknown',
    });
    onMessage(message);
  });

  worker.on('error', (error) => {
    WorkerContext.logWorker(
      'error',
      jobId,
      'Worker error occurred',
      {
        threadId: worker.threadId,
      },
      error,
    );
    if (onError) {
      onError(error);
    }
  });
}

/**
 * Utility to log from within worker threads
 * This should be used in worker files to maintain context
 */
export function workerLogger(
  type: string,
  level: 'debug' | 'info' | 'warn' | 'error',
  message: string,
  data?: any,
  error?: Error,
): void {
  // In worker threads, we'll post messages back to main thread for logging
  // This ensures all logs go through the central logger
  const logData = {
    type: 'log',
    level,
    logType: type, // Add type field for consistency with main logger
    message,
    data,
    error: error
      ? {
          message: error.message,
          stack: error.stack,
          name: error.name,
        }
      : undefined,
    timestamp: new Date().toISOString(),
    threadId: process.env.WORKER_THREAD_ID || 'unknown',
  };

  // If we're in a worker thread, post message to parent
  if (typeof process !== 'undefined' && process.send) {
    process.send(logData);
  }
  // For Node.js worker threads, we use parentPort
  try {
    const { parentPort } = require('worker_threads');
    if (parentPort) {
      parentPort.postMessage(logData);
    }
  } catch {
    // Fallback - not in worker thread context
  }
}
