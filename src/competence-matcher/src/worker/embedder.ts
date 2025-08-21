import { parentPort, threadId, workerData } from 'worker_threads';
import Embedding from '../tasks/embedding';
import { splitSemantically } from '../tasks/semantic-split';
import { withJobUpdates } from '../utils/worker';
import { EmbeddingJob } from '../utils/types';
import { workerLogger } from '../utils/worker';
import { getLogger, createLoggerConfig, Logger } from '../utils/logger';

// Initialise logger for this worker thread
try {
  Logger.getInstance(createLoggerConfig());
} catch (error) {
  // Logger already initialised
}

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

  // Set global job context for logging
  (global as any).CURRENT_JOB = job.jobId;

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

    workerLogger(job.jobId, 'info', `Embedding job completed`, {
      threadId,
      taskCount: job.tasks.length,
    });
  } catch (error) {
    // Handle job-level errors
    workerLogger(
      job.jobId,
      'error',
      `Embedding job failed`,
      {
        threadId,
      },
      error instanceof Error ? error : new Error(String(error)),
    );

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

workerLogger('system', 'info', `Embedder worker thread ready`, {
  threadId,
});
