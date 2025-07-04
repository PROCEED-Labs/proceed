import { parentPort } from 'worker_threads';
import Embedding from '../tasks/embedding';
import DBManager from '../db/db-manager';
import { getDB } from '../utils/db';

parentPort!.once('message', async (job: MatchingJob) => {
  const { jobId, dbName, listId, resourceId, tasks } = job;

  // Open the DB in this thread
  // Note: This is another DB instance, not the one used by the main thread
  const db = getDB(dbName);

  try {
    // Mark job as running
    db.updateJobStatus(jobId, 'running');
    parentPort!.postMessage({ type: 'status', status: 'running', jobId });

    // For each task: embed text and search for matches
    for (const task of tasks) {
      const { taskId, name, description, executionInstructions, requiredCompetencies } = task;
      if (!description) {
        continue; // Skip tasks without description
      }
      // Embed the task description
      const [vector] = await Embedding.embed(description);

      // Search for matches in the competence list (and resource if provided)
      const matches = db.searchEmbedding(vector, {
        filter: {
          listId: listId,
          resourceId: resourceId, // Optional: If matching against a single resource
        },
      });

      for (const match of matches) {
        db.addMatchResult({
          jobId,
          taskId,
          competenceId: match.competenceId,
          text: match.text,
          type: match.type as 'name' | 'description' | 'proficiencyLevel',
          distance: match.distance,
        });
      }
      console.log(matches);
    }

    // Mark job completed
    db.updateJobStatus(jobId, 'completed');
    // Notify parent (not really necessary)
    parentPort!.postMessage({ type: 'status', status: 'completed', jobId });
  } catch (err) {
    // On any error: mark job as failed
    !parentPort?.postMessage({
      jobId,
      status: 'failed',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
    // Update job status in DB
    try {
      db.updateJobStatus(jobId, 'failed');
    } catch {}
  } finally {
    // Clean up: close DB and exit
    db.close();
    parentPort!.close();
    process.exit(0);
  }
});
