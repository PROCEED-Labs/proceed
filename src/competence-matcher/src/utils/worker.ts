import * as fs from 'node:fs';
import * as path from 'node:path';
import { Worker, parentPort } from 'worker_threads';
import VectorDataBase from '../db/db';
import { getDB } from './db';
import { config } from '../config';

const { maxJobTime } = config;

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
    parentPort!.close();
    process.exit(exitCode);
  }
}

export function log(...args: any[]) {
  parentPort?.postMessage({ type: 'log', message: args.map(String).join(' ') });
}
