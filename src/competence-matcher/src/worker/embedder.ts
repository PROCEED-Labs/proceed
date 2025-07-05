import { parentPort } from 'worker_threads';
import Embedding from '../tasks/embedding';
import { getDB } from '../utils/db';
import { splitSemantically } from '../tasks/semantic-split';
import { workerWrapper } from '../utils/worker';

parentPort!.once('message', async (job: EmbeddingJob) => {
  const { jobId, dbName, tasks } = job;

  // Open the DB in this thread
  // Note: This is another DB-Connector instance, not the one used by the main thread
  // But it refers to the same database file
  const db = getDB(dbName);

  workerWrapper(db, jobId, async () => {
    let work = tasks;
    try {
      work = await splitSemantically(tasks);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      parentPort!.postMessage({ type: 'error', error: errorMessage });
    }

    // For each task: embed & upsert
    for (const { listId, resourceId, competenceId, text, type } of work) {
      const [vector] = await Embedding.embed(text);
      // console.log(`Embedded text for job ${jobId}:`, text, '->', vector);
      db.upsertEmbedding({ listId, resourceId, competenceId, text, type, embedding: vector });
    }
  });
});
