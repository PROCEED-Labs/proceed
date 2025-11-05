import { parentPort, threadId } from 'worker_threads';
import Embedding from '../tasks/embedding';
import { withJobUpdates, workerLogger, startHeartbeat, sendHeartbeat } from '../utils/worker';
import { EmbeddingJob, ResourceEmbeddingJob, TaskEmbeddingJob } from '../utils/types';
import { getDB } from '../utils/db';
import { config } from '../config';

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
    workerLogger('system', 'debug', 'Embedder worker online', { threadId });
  } catch (err) {
    throw err;
  }
}

// Start heartbeat immediately
startHeartbeat('embedder', config.workerHeartbeatInterval);

// Set up job message handler
parentPort.on('message', async (message: any) => {
  // Handle job messages
  const job = message as EmbeddingJob;

  workerLogger(job.jobId || 'system', 'debug', 'Embedder worker received job', {
    threadId,
    jobId: job.jobId,
    taskCount: job.tasks?.length || 0,
    mode: job.mode ?? 'resource',
  });

  // ensure models are initialised (but do not run this for health_check)
  try {
    await ensureModelsInitialised();
  } catch (err) {
    workerLogger(
      job.jobId || 'system',
      'debug',
      'Embedder worker failed to initialize models',
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

  try {
    if (job.mode === 'task') {
      await processTaskEmbeddingJob(job as TaskEmbeddingJob);
    } else {
      await processResourceEmbeddingJob(job as ResourceEmbeddingJob);
    }

    workerLogger(job.jobId, 'debug', `Embedding job completed`, {
      threadId,
      taskCount: job.tasks.length,
      mode: job.mode ?? 'resource',
    });
  } catch (error) {
    workerLogger(
      job.jobId,
      'debug',
      `Embedding job failed`,
      {
        threadId,
        mode: job.mode ?? 'resource',
      },
      error instanceof Error ? error : new Error(String(error)),
    );
  } finally {
    parentPort!.postMessage({
      type: 'job_completed',
      jobId: job.jobId,
    });
  }
});

workerLogger('system', 'debug', `Embedder worker thread ready`, {
  threadId,
});

async function processResourceEmbeddingJob(job: ResourceEmbeddingJob): Promise<void> {
  workerLogger(
    job.jobId,
    'debug',
    `Starting resource embedding job with ${job.tasks.length} tasks`,
    {
      threadId,
      taskCount: job.tasks.length,
    },
  );

  await withJobUpdates<ResourceEmbeddingJob>(job, async (db, { tasks, jobId }) => {
    let work = tasks;

    // TODO: Re-enable semantic splitting once the worker crash issue is resolved
    // work = await splitSemantically(tasks);

    for (const { listId, resourceId, competenceId, text, type } of work) {
      sendHeartbeat('embedder');
      try {
        const [vector] = await Embedding.embed(text);

        sendHeartbeat('embedder');

        workerLogger(jobId, 'debug', `Generated embedding for ${type} text`, {
          threadId,
          competenceId,
          textLength: text.length,
        });

        db.upsertEmbedding({
          listId,
          resourceId,
          competenceId,
          text,
          type,
          embedding: vector,
        });

        sendHeartbeat('embedder');
      } catch (error) {
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
}

async function processTaskEmbeddingJob(job: TaskEmbeddingJob): Promise<void> {
  workerLogger(job.jobId, 'debug', `Starting task embedding job with ${job.tasks.length} tasks`, {
    threadId,
    taskCount: job.tasks.length,
  });

  const dbInstance = getDB(job.dbName);

  await withJobUpdates<TaskEmbeddingJob>(
    job,
    async (db, { tasks, jobId }) => {
      for (const task of tasks) {
        const { taskId, description } = task;
        if (!description) {
          workerLogger(jobId, 'warn', 'Skipping task without description for embedding', {
            threadId,
            taskId,
          });
          continue;
        }

        sendHeartbeat('embedder');

        try {
          const [vector] = await Embedding.embed(description);

          sendHeartbeat('embedder');

          workerLogger(jobId, 'debug', 'Generated task embedding', {
            threadId,
            taskId,
            textLength: description.length,
          });

          db.upsertTaskEmbedding(jobId, taskId, vector);

          sendHeartbeat('embedder');
        } catch (error) {
          workerLogger(
            jobId,
            'error',
            'Failed to generate task embedding',
            {
              threadId,
              taskId,
            },
            error instanceof Error ? error : new Error(String(error)),
          );

          parentPort!.postMessage({
            type: 'error',
            jobId,
            error: `Failed to process task ${taskId}: ${error instanceof Error ? error.message : String(error)}`,
          });
        }
      }
    },
    {
      onStart: () => {
        dbInstance.updateJobStatus(job.jobId, 'preprocessing');
        parentPort!.postMessage({
          type: 'status',
          jobId: job.jobId,
          status: 'preprocessing',
        });
      },
      onDone: () => {
        dbInstance.updateJobStatus(job.jobId, 'pending');
        parentPort!.postMessage({
          type: 'status',
          jobId: job.jobId,
          status: 'pending',
        });
      },
    },
  );
}
