import { parentPort, threadId } from 'worker_threads';
import Embedding from '../tasks/embedding';
import { splitSemantically } from '../tasks/semantic-split';
import { withJobUpdates } from '../utils/worker';
import { config } from '../config';
import { EmbeddingJob } from '../utils/types';

const { verbose } = config;

/**
 * New embedder worker that stays alive and processes jobs sequentially
 */
if (!parentPort) {
  throw new Error('This file must be run as a Worker thread');
}

// Set up health check handler immediately, before any heavy initialisation
parentPort.on('message', async (message: any) => {
  // Handle health checks with highest priority
  if (message?.type === 'health_check') {
    if (verbose) {
      console.log(`[Embedder Worker] Thread ${threadId} received health check ${message.checkId}`);
    }
    parentPort!.postMessage({
      type: 'health_check_response',
      checkId: message.checkId,
      timestamp: Date.now(),
      workerType: 'embedder',
      threadId: threadId,
    });
    if (verbose) {
      console.log(`[Embedder Worker] Thread ${threadId} sent health check response`);
    }
    return;
  }

  // Handle job messages
  const job = message as EmbeddingJob;

  // Set global job context for logging
  (global as any).CURRENT_JOB = job.jobId;

  if (verbose) {
    console.log(
      `[Embedder Worker] Received and starting job ${job.jobId} with ${job.tasks.length} tasks`,
    );
  }

  try {
    await withJobUpdates<EmbeddingJob>(job, async (db, { tasks, jobId }) => {
      let work = tasks;

      // TODO: Re-enable semantic splitting once the worker crash issue is resolved
      // Split tasks semantically
      // work = await splitSemantically(tasks);

      // Process each embedding task
      for (const { listId, resourceId, competenceId, text, type } of work) {
        try {
          // Generate embedding for the text
          const [vector] = await Embedding.embed(text);

          if (verbose) {
            console.log(`[Embedder Worker] Generated embedding for ${type} text (job ${jobId})`);
          }

          // Store embedding in database
          db.upsertEmbedding({
            listId,
            resourceId,
            competenceId,
            text,
            type,
            embedding: vector,
          });
        } catch (error) {
          // Log the error but continue with other tasks
          parentPort!.postMessage({
            type: 'error',
            jobId,
            error: `Failed to process embedding task: ${error instanceof Error ? error.message : String(error)}`,
          });
        }
      }
    });

    // Notify that job is completed
    parentPort!.postMessage({
      type: 'job_completed',
      jobId: job.jobId,
    });

    if (verbose) {
      console.log(`[Embedder Worker] Completed job ${job.jobId}`);
    }
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

if (verbose) {
  console.log(`[Embedder Worker] Worker thread ${threadId} ready to process embedding jobs`);
}
