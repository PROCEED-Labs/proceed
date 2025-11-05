import * as fs from 'node:fs';
import * as path from 'node:path';
import { Worker, parentPort, threadId } from 'worker_threads';
import VectorDataBase from '../db/db';
import { getDB } from './db';
import { config } from '../config';

const {} = config;

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
    const error = err instanceof Error ? err : new Error(String(err));

    if (options && options.onError) {
      options.onError(error);
    } else {
      // Update job status in database
      db.updateJobStatus(job.jobId, 'failed');

      // Send error message to parent thread
      parentPort!.postMessage({
        type: 'error',
        jobId: job.jobId,
        error: error.message,
      });
    }

    // Always re-throw the error so the worker can handle it appropriately
    throw error;
  } finally {
    // Don't close the database connection - let DBManager handle connection lifecycle
    // Don't close parentPort or exit process for static worker pools
    // Workers need to stay alive to process more jobs
  }
} /**
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

  // For Node.js worker threads, we use parentPort
  if (parentPort) {
    parentPort.postMessage(logData);
  }
}

/**
 * Start sending heartbeat messages to the main thread
 * This should be called once when a worker starts up
 *
 * @param workerType - Type of worker (e.g., 'embedder', 'matcher')
 * @param intervalMs - Heartbeat interval in milliseconds (default: 20000ms = 20s)
 * @returns Function to stop the heartbeat
 */
export function startHeartbeat(workerType: string, intervalMs: number = 20000): () => void {
  if (!parentPort) {
    throw new Error('startHeartbeat can only be called from worker threads');
  }

  const sendHeartbeat = () => {
    workerLogger('system', 'debug', `${workerType} worker sending heartbeat`, {
      workerType,
      threadId,
    });

    parentPort!.postMessage({
      type: 'heartbeat',
      workerType,
      threadId,
      timestamp: Date.now(),
    });
  };

  // Send initial heartbeat immediately
  sendHeartbeat();

  // Set up interval for regular heartbeats
  const heartbeatInterval = setInterval(sendHeartbeat, intervalMs);

  // Return cleanup function
  return () => {
    clearInterval(heartbeatInterval);
  };
}

export function sendHeartbeat(workerType: string): void {
  if (!parentPort) {
    throw new Error('sendHeartbeat can only be called from worker threads');
  }

  parentPort.postMessage({
    type: 'heartbeat',
    workerType,
    threadId,
    timestamp: Date.now(),
    source: 'manual',
  });
}
