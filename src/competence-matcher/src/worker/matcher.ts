import { parentPort, threadId } from 'worker_threads';
import Embedding from '../tasks/embedding';
import { withJobUpdates, workerLogger } from '../utils/worker';
import { addReason } from '../tasks/reason';
import { Match, MatchingJob } from '../utils/types';
import ZeroShot from '../tasks/semantic-zeroshot';

// // Initialise models on startup
// try {
//   Embedding.getInstance();
//   ZeroShot.getInstance();
// } catch (error) {
//   // Models already initialised
// }

/**
 * New matcher worker that stays alive and processes jobs sequentially
 */
if (!parentPort) {
  throw new Error('This file must be run as a Worker thread');
}

let modelsInitialised = false;
async function ensureModelsInitialised() {
  if (modelsInitialised) return;
  try {
    await Embedding.getInstance();
    await ZeroShot.getInstance();
    modelsInitialised = true;
    workerLogger('system', 'info', 'Matcher worker models initialized', { threadId });
  } catch (err) {
    // Bubble up so job handling can report the error
    throw err;
  }
}

// Set up health check handler immediately, before any heavy initialisation
parentPort.on('message', async (message: any) => {
  // Handle health checks with highest priority
  if (message?.type === 'health_check') {
    workerLogger('system', 'debug', `Health check received: ${message.checkId}`, {
      threadId,
      checkId: message.checkId,
    });

    parentPort!.postMessage({
      type: 'health_check_response',
      checkId: message.checkId,
      timestamp: Date.now(),
      workerType: 'matcher',
      threadId: threadId,
    });

    workerLogger('system', 'debug', `Health check response sent: ${message.checkId}`, {
      threadId,
    });
    return;
  }

  // Handle job messages
  const job = message as MatchingJob;

  try {
    await ensureModelsInitialised();
  } catch (err) {
    workerLogger(
      job.jobId || 'system',
      'error',
      'Failed to initialise models',
      { threadId },
      err instanceof Error ? err : new Error(String(err)),
    );
    // Notify parent and exit or mark job failed
    parentPort!.postMessage({
      type: 'error',
      jobId: job.jobId,
      error: `Model initialisation failed: ${err instanceof Error ? err.message : String(err)}`,
    });
    // still send job_completed so worker pool can continue
    parentPort!.postMessage({ type: 'job_completed', jobId: job.jobId });
    return;
  }

  workerLogger(job.jobId, 'info', `Starting matching job with ${job.tasks.length} tasks`, {
    threadId,
    taskCount: job.tasks.length,
  });

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
            const labelScalar = [0.05, 0.25, 1];

            // Process each match
            for (const match of matches) {
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
                // @ts-ignore - ZeroShot classification result structure
                else if (scalingClassification.labels[0] === scalingLabels[0]) {
                  // Poor match - scale it down significantly
                  match.distance *= labelScalar[0];
                  flag = 'contradicting';
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
            }
          } catch (error) {
            // Log error for task processing but continue with other tasks
            workerLogger(
              jobId,
              'error',
              `Failed to process task ${taskId}`,
              {
                threadId,
                taskId,
              },
              error instanceof Error ? error : new Error(String(error)),
            );

            // Individual task errors don't fail the entire job
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

    // Job completed successfully
    workerLogger(job.jobId, 'info', `Matching job completed`, {
      threadId,
      taskCount: job.tasks.length,
    });
  } catch (error) {
    // Job-level error - already handled by withJobUpdates
    // Just log it for worker context
    workerLogger(
      job.jobId,
      'error',
      `Matching job failed`,
      {
        threadId,
      },
      error instanceof Error ? error : new Error(String(error)),
    );
  } finally {
    // Always notify job completion so worker can process next job
    parentPort!.postMessage({
      type: 'job_completed',
      jobId: job.jobId,
    });
  }
});

workerLogger('system', 'info', `Matcher worker thread ready`, {
  threadId,
});
