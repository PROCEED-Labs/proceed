import { parentPort } from 'worker_threads';
import Embedding from '../tasks/embedding';
import { splitSemantically } from '../tasks/semantic-split';
import { withJobUpdates } from '../utils/worker';
import { config } from '../config';
import { EmbeddingJob } from '../utils/types';

parentPort!.once('message', async (job: EmbeddingJob) => {
  (global as any).CURRENT_JOB = job.jobId;

  await withJobUpdates<EmbeddingJob>(job, async (db, { tasks, jobId }) => {
    let work = tasks;
    // TODO: This appears to cause the worker to crash silently
    // Split tasks semantically
    // work = await splitSemantically(tasks);

    // For each task: embed & upsert
    for (const { listId, resourceId, competenceId, text, type } of work) {
      const [vector] = await Embedding.embed(text);
      // console.log(`Embedded text for job ${jobId}:`, text, '->', vector);

      db.upsertEmbedding({ listId, resourceId, competenceId, text, type, embedding: vector });
    }
  });
});
