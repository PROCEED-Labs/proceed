import { parentPort, threadId } from 'worker_threads';
import Embedding from '../tasks/embedding';
import { withJobUpdates, workerLogger, startHeartbeat } from '../utils/worker';
import { addReason } from '../tasks/reason';
import { Match, MatchingJob } from '../utils/types';
import ZeroShot, { labels } from '../tasks/semantic-zeroshot';
import CrossEncoder from '../tasks/cross-encode';
import { config } from '../config';

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
    workerLogger('system', 'debug', 'Matcher worker online', { threadId });
  } catch (err) {
    // Bubble up so job handling can report the error
    throw err;
  }
}

// Start heartbeat immediately
startHeartbeat('matcher', config.workerHeartbeatInterval);

// Set up job message handler
parentPort.on('message', async (message: any) => {
  // Handle job messages
  const job = message as MatchingJob;

  workerLogger(job.jobId || 'system', 'debug', 'Matcher worker received job', {
    threadId,
    jobId: job.jobId,
    taskCount: job.tasks?.length || 0,
    listId: job.listId,
  });

  try {
    await ensureModelsInitialised();
  } catch (err) {
    workerLogger(
      job.jobId || 'system',
      'debug',
      'Matcher worker failed to initialize models',
      { threadId, jobId: job.jobId },
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

  workerLogger(job.jobId, 'debug', `Starting matching job with ${job.tasks.length} tasks`, {
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

            // Process each match
            for (const match of matches) {
              let flag = 'neutral'; // Default flag

              // Balance distance
              let newDistance = Math.min(1, Math.max(0, match.distance - 0.45) * 2);

              // Get Alignment via Zero-Shot
              const sentiment = await ZeroShot.nliBiDirectional(description, match.text);

              const contradiction = await ZeroShot.contradictionCheck(description, match.text);
              const alignment = await ZeroShot.alignmentCheck(description, match.text);

              // console.log('task: ', description);
              // console.log('capability: ', match.text);
              // console.log('alignment: ', alignment);
              // console.log('________________________________________');

              // First: Contradicting?
              if (
                sentiment.ranking[0] == 'contradict' ||
                sentiment.contradict > 0.3 ||
                contradiction.contradicting
              ) {
                flag = 'contradicting';
                newDistance = 0.0;
                // Second: Aligning?
              } else if (sentiment.entail > 0.55 && match.distance > 0.65 && alignment.aligning) {
                flag = 'aligning';
                // Boost similarity-based distance
                newDistance = Math.min(1, newDistance * 1.5);
              } else {
                flag = 'neutral';
                // Reduce distance for neutral
                newDistance *= 0.65;
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
                distance: newDistance,
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
    workerLogger(job.jobId, 'debug', `Matching job completed`, {
      threadId,
      taskCount: job.tasks.length,
    });
  } catch (error) {
    // Job-level error - already handled by withJobUpdates
    // Just log it for worker context
    workerLogger(
      job.jobId,
      'debug',
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

workerLogger('system', 'debug', `Matcher worker thread ready`, {
  threadId,
});
