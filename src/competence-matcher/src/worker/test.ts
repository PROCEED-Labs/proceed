import { parentPort } from 'worker_threads';
import { splitSemantically } from '../tasks/semantic-split';
import { EmbeddingJob } from '../utils/types';

parentPort!.once('message', async (job: EmbeddingJob) => {
  const { tasks, jobId } = job;
  parentPort!.postMessage({ type: 'status', jobId, status: 'running' });
  parentPort!.postMessage(await splitSemantically(tasks));
});
