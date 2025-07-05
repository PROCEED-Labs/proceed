import { parentPort } from 'worker_threads';
import Embedding from '../tasks/embedding';
import DBManager from '../db/db-manager';
import { getDB } from '../utils/db';
import { workerWrapper } from '../utils/worker';
import { addReason } from '../tasks/reason';

parentPort!.once('message', async (job: MatchingJob) => {
  const { jobId, dbName, listId, resourceId, tasks } = job;

  // Open the DB in this thread
  // Note: This is another DB instance, not the one used by the main thread
  const db = getDB(dbName);

  workerWrapper(db, jobId, async () => {
    // For each task: embed text and search for matches
    for (const task of tasks) {
      const { taskId, name, description, executionInstructions, requiredCompetencies } = task;
      if (!description) {
        continue; // Skip tasks without description
      }
      // Embed the task description
      const [vector] = await Embedding.embed(description);

      // Search for matches in the competence list (and resource if provided)
      let matches: Match[] = db.searchEmbedding(vector, {
        filter: {
          listId: listId,
          resourceId: resourceId, // Optional: If matching against a single resource
        },
      });

      // Add reasoning for matching score
      matches = await addReason(matches, description);

      for (const match of matches) {
        db.addMatchResult({
          jobId,
          taskId,
          competenceId: match.competenceId,
          text: match.text,
          type: match.type as 'name' | 'description' | 'proficiencyLevel',
          distance: match.distance,
          reason: match.reason,
        });
      }
    }
  });
});
