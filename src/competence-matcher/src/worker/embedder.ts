import { parentPort } from 'worker_threads';
import Embedding from '../tasks/embedding';
import DBManager from '../db/db-manager';

parentPort!.once('message', async (job: EmbeddingJob) => {
  const { jobId, dbName, tasks } = job;

  // Open the DB in this thread
  // Note: This is another DB instance, not the one used by the main thread
  const db = DBManager.getInstance().getDB(dbName);

  try {
    // Mark job as running
    db.updateJobStatus(jobId, 'running');

    // For each task: embed & upsert
    for (const { listId, resourceId, competenceId, text, type } of tasks) {
      const [vector] = await Embedding.embed(text);
      // console.log(`Embedded text for job ${jobId}:`, text, '->', vector);
      db.upsertEmbedding({ listId, resourceId, competenceId, text, type, embedding: vector });
    }

    // Mark job completed
    db.updateJobStatus(jobId, 'completed');
  } catch (err) {
    // On any error: mark job as failed
    console.error('Worker error for job', jobId, err);
    try {
      db.updateJobStatus(jobId, 'failed');
    } catch {}
  }

  // Notify parent (not really necessary)
  //   parentPort!.postMessage({ done: true, jobId });

  // Clean up: close DB and exit
  db.close();
  parentPort!.close();
  process.exit(0);
});
