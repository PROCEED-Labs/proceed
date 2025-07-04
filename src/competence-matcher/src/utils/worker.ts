import * as fs from 'node:fs';
import * as path from 'node:path';
import { Worker } from 'worker_threads';

export function createWorker(filename: string): Worker {
  const tsPath = path.resolve(__dirname, `../worker/${filename}.ts`);
  const jsPath = path.resolve(__dirname, `../worker/${filename}.js`);
  const isTs = fs.existsSync(tsPath);

  const workerFile = isTs ? tsPath : jsPath;

  const execArgv = isTs
    ? [...process.execArgv, '-r', 'ts-node/register/transpile-only']
    : process.execArgv;

  const worker = new Worker(workerFile, { execArgv });

  worker.on('error', (err) => {
    console.error('Embedding worker crashed:', err);
  });
  worker.on('exit', (code) => {
    if (code !== 0) {
      console.error(`Worker exited with code ${code}`);
    }
  });
  worker.on('message', (message) => {
    switch (message.type) {
      case 'status':
        console.log(`Worker for job ${message.jobId} status:`, message.status);
        break;
      case 'error':
        console.error(`Worker for job ${message.jobId} error:`, message.error);
        break;
    }
  });

  return worker;
}
