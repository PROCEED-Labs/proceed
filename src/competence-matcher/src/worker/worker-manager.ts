import { Worker, workerData, parentPort } from 'worker_threads';
import { config } from '../config';
import { createWorker } from '../utils/worker';

const { numberOfThreads } = config;
