import { parentPort, threadId } from 'worker_threads';
import Embedding from '../tasks/embedding';
import { splitSemantically } from '../tasks/semantic-split';
import { withJobUpdates, workerLogger } from '../utils/worker';
import { EmbeddingJob } from '../utils/types';

// // Initialise embedding model on startup
// try {
//   Embedding.getInstance();
// } catch (error) {
//   // Model already initialised
// }

/**
 * New embedder worker that stays alive and processes jobs sequentially
 */
if (!parentPort) {
  throw new Error('This file must be run as a Worker thread');
}

let modelsInitialised = false;
async function ensureModelsInitialised() {
  if (modelsInitialised) return;
  try {
    await Embedding.getInstance();
    modelsInitialised = true;
    workerLogger('system', 'info', 'Embedder worker model initialised', { threadId });
  } catch (err) {
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
      workerType: 'embedder',
      threadId: threadId,
    });

    workerLogger('system', 'debug', `Health check response sent: ${message.checkId}`, {
      threadId,
    });
    return;
  }

  // Handle job messages
  const job = message as EmbeddingJob;

  // ensure models are initialised (but do not run this for health_check)
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

  workerLogger(job.jobId, 'info', `Starting embedding job with ${job.tasks.length} tasks`, {
    threadId,
    taskCount: job.tasks.length,
  });

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

          workerLogger(jobId, 'debug', `Generated embedding for ${type} text`, {
            threadId,
            competenceId,
            textLength: text.length,
          });

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
          workerLogger(
            jobId,
            'error',
            `Failed to process embedding task`,
            {
              threadId,
              competenceId,
              type,
            },
            error instanceof Error ? error : new Error(String(error)),
          );

          // Individual task errors don't fail the entire job
          // Send error notification but continue processing
          parentPort!.postMessage({
            type: 'error',
            jobId,
            error: `Failed to process embedding task: ${error instanceof Error ? error.message : String(error)}`,
          });
        }
      }
    });

    // Job completed successfully
    workerLogger(job.jobId, 'info', `Embedding job completed`, {
      threadId,
      taskCount: job.tasks.length,
    });
  } catch (error) {
    // Job-level error - already handled by withJobUpdates
    // Just log it for worker context
    workerLogger(
      job.jobId,
      'error',
      `Embedding job failed`,
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

workerLogger('system', 'info', `Embedder worker thread ready`, {
  threadId,
});
