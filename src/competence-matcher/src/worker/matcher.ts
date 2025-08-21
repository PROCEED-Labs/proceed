import { parentPort, threadId } from 'worker_threads';
import Embedding from '../tasks/embedding';
import { withJobUpdates } from '../utils/worker';
import { addReason } from '../tasks/reason';
import { Match, MatchingJob } from '../utils/types';
import ZeroShot from '../tasks/semantic-zeroshot';
import { Logger, createLoggerConfig } from '../utils/logger';

// Initialise logger for this worker thread & Initialise ZeroShot model
try {
  Logger.getInstance(createLoggerConfig());
  Embedding.getInstance();
  ZeroShot.getInstance();
} catch (error) {
  // Logger already initialised
}

// Note: Verbose logging has been replaced with the new logger system

/**
 * New matcher worker that stays alive and processes jobs sequentially
 */
if (!parentPort) {
  throw new Error('This file must be run as a Worker thread');
}

// Set up health check handler immediately, before any heavy initialisation
parentPort.on('message', async (message: any) => {
  // Handle health checks with highest priority
  if (message?.type === 'health_check') {
    parentPort!.postMessage({
      type: 'health_check_response',
      checkId: message.checkId,
      timestamp: Date.now(),
      workerType: 'matcher',
      threadId: threadId,
    });

    return;
  }

  // Handle job messages
  const job = message as MatchingJob;

  // Set global job context for logging
  (global as any).CURRENT_JOB = job.jobId;

  try {
    // Store match results for reasoning workaround
    const matchResults: { [description: string]: any[] } = {};
    for (const task of job.tasks) {
      const { description } = task;
      if (!description) {
        continue; // Skip tasks without description
      }
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

          try {
            // Generate embedding for the task description
            // Todo: Handle embedding via the dedicated embedding worker
            const [vector] = await Embedding.embed(description);

            // Search for matches in the competence database
            let matches: Match[] = db.searchEmbedding(vector, {
              filter: {
                listId: listIdFilter,
                resourceId: resourceIdFilter, // Optional: If matching against a single resource
              },
            });

            // TODO: Re-enable reasoning once worker stability issues are resolved
            // Apply reasoning to each match to enhance context
            // matches = await addReason(description, matches);

            // Zero-shot classification for scaling scores based on alignment
            const scalingLabels = ['conflicting', 'neutral', 'aligning'];
            const labelScalar = [0.8, 1.0, 1.2];

            // Process each match
            for (const match of matches) {
              try {
                let flag = 'neutral'; // Default flag

                // Apply zero-shot classification
                const scalingClassification = await ZeroShot.classify(
                  `Task: ${description} | Competence: ${match.text}`,
                  scalingLabels,
                );

                if (scalingClassification) {
                  if (
                    // @ts-ignore - ZeroShot classification result structure
                    scalingClassification.labels[0] === scalingLabels[2] &&
                    // @ts-ignore
                    scalingClassification.scores[0] > 0.65
                  ) {
                    // Perfect match - keep as is
                    match.distance *= labelScalar[2];
                    flag = 'aligning';
                  }
                  // @ts-ignore - ZeroShot classification result structure
                  else if (scalingClassification.labels[0] === scalingLabels[1]) {
                    // Mediocre match - scale it down
                    match.distance *= labelScalar[1];
                    flag = 'neutral';
                  }
                }

                // Store match result for reasoning workaround
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
              } catch (error) {
                // Log error for individual match processing but continue
                parentPort!.postMessage({
                  type: 'error',
                  jobId,
                  error: `Failed to process match for task ${taskId}: ${error instanceof Error ? error.message : String(error)}`,
                });
              }
            }
          } catch (error) {
            // Log error for task processing but continue with other tasks
            parentPort!.postMessage({
              type: 'error',
              jobId,
              error: `Failed to process task ${taskId}: ${error instanceof Error ? error.message : String(error)}`,
            });
          }
        }
      },
      {
        // When job processing is done, send results for reasoning
        onDone: () => {
          parentPort!.postMessage({
            type: 'job',
            job: 'reason',
            workload: matchResults,
          });
        },
      },
    );

    // Notify that job is completed
    parentPort!.postMessage({
      type: 'job_completed',
      jobId: job.jobId,
    });
  } catch (error) {
    // Handle job-level errors
    parentPort!.postMessage({
      type: 'error',
      jobId: job.jobId,
      error: `Job failed: ${error instanceof Error ? error.message : String(error)}`,
    });

    // Still notify completion so the worker can move to next job
    parentPort!.postMessage({
      type: 'job_completed',
      jobId: job.jobId,
    });
  }
});
