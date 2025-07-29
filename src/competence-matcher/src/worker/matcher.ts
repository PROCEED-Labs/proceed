import { parentPort } from 'worker_threads';
import Embedding from '../tasks/embedding';
import { withJobUpdates } from '../utils/worker';
import { addReason } from '../tasks/reason';
import { Match, MatchingJob } from '../utils/types';
import ZeroShot from '../tasks/semantic-zeroshot';

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
    async (db, { jobId, tasks, listId: listIdFilter, resourceId: resourceIdFilter }) => {
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
            listId: listIdFilter,
            resourceId: resourceIdFilter, // Optional: If matching against a single resource
          },
        });

        // TODO: This appears to cause the worker to not start at all
        // Invert potentially contrastive matches
        // Add reasoning for matching score
        // matches = await addReason(matches, description);

        for (const match of matches) {
          // Check for semantic opposites
          const zeroshotText = `Task description: ${description}\nSkill/Capability description: ${match.text}`;
          // From unsuitable to suitable
          const contraLabels = ['contradicting', 'aligning'];
          const contraHypothesis = 'Task description and Skill/Capability descriptions are {}.';
          const scalingLabls = ['perfect', 'mediocre'];
          const scalingHypothesis =
            'Task description and Skill/Capability descriptions are a {} match.';
          const labelScalar = [
            0.25, // Contradicting matches should be penalised
            0.5, // Scale it down a bit to avoid too high scores for irrelevant matches
            1, // keep the best matches as is
          ];
          const contraClassification = await ZeroShot.classify(
            zeroshotText,
            contraLabels,
            contraHypothesis,
          );
          let flag: 'contradicting' | 'neutral' | 'aligning' = 'neutral';
          // console.log(contraClassification);

          // @ts-ignore
          if (contraClassification.labels[0] === contraLabels[0]) {
            // Invert the match distance (since it's normalised to [0,1]: 1 - distance)
            match.distance = (1 - match.distance) * labelScalar[0];
            flag = 'contradicting';
          } else {
            const scalingClassification = await ZeroShot.classify(
              zeroshotText,
              scalingLabls,
              scalingHypothesis,
            );

            // console.log(scalingClassification);
            if (
              // @ts-ignore
              scalingClassification.labels[0] === scalingLabls[0] &&
              // @ts-ignore
              scalingClassification.scores[0] > 0.65
            ) {
              // Keep the match as is
              match.distance *= labelScalar[2];
              flag = 'aligning';
            }
            // @ts-ignore
            else if (scalingClassification.labels[0] === scalingLabls[1]) {
              // Scale it down a bit
              match.distance *= labelScalar[1];
              flag = 'neutral';
            }
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
            taskText: description,
            competenceId: match.competenceId,
            resourceId: match.resourceId,
            text: match.text,
            type: match.type as 'name' | 'description' | 'proficiencyLevel',
            alignment: flag,
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
