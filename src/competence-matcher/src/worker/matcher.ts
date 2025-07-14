import { parentPort } from 'worker_threads';
import Embedding from '../tasks/embedding';
import { withJobUpdates } from '../utils/worker';
import { addReason } from '../tasks/reason';
import { Match, MatchingJob } from '../utils/types';
import ZeroShot from '../tasks/semantic-opposites';

parentPort!.once('message', async (job: MatchingJob) => {
  // For workaround:
  const matchResults: { [description: string]: any[] } = {};
  for (const task of job.tasks) {
    const { taskId, name, description, executionInstructions, requiredCompetencies } = task;
    if (!description) {
      continue; // Skip tasks without description
    }
    // Add task description to match results
    matchResults[description] = [];
  }

  await withJobUpdates<MatchingJob>(
    job,
    async (db, { jobId, tasks, listId, resourceId }) => {
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

        // TODO: This appears to cause the worker to not start at all
        // Invert potentially contrastive matches
        // Add reasoning for matching score
        // matches = await addReason(matches, description);

        for (const match of matches) {
          // Check for semantic opposites
          const zeroshotText = `Task description: ${description}\nSkill/Capability description: ${match.text}`;
          const classification = await ZeroShot.classify(zeroshotText);
          // @ts-ignore
          switch (classification.labels[0]) {
            case 'contradicting':
              // Invert the match distance (since it's normalised to [0,1]: 1 - distance)
              match.distance = 1 - match.distance;
              break;
            // switch instead of if, as we may want to have additional label-based checks in the future
          }
          //   db.addMatchResult({
          //     jobId,
          //     taskId,
          //     competenceId: match.competenceId,
          //     text: match.text,
          //     type: match.type as 'name' | 'description' | 'proficiencyLevel',
          //     distance: match.distance,
          //     reason: match.reason,
          //   });
          // }

          // Workaround to avoid the worker crashing silently
          matchResults[description].push({
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
    },
    {
      onDone: () => {
        parentPort!.postMessage({ type: 'job', job: 'reason', workload: matchResults });
      },
    },
  );
});
