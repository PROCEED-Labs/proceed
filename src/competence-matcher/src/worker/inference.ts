import { parentPort, threadId } from 'worker_threads';
import Embedding from '../tasks/embedding';
import ZeroShot from '../tasks/semantic-zeroshot';
import { withJobUpdates, workerLogger, startHeartbeat, sendHeartbeat } from '../utils/worker';
import {
  EmbeddingJob,
  ResourceEmbeddingJob,
  TaskEmbeddingJob,
  MatchingJob,
  Match,
} from '../utils/types';
import { getDB } from '../utils/db';
import { config } from '../config';

if (!parentPort) throw new Error('This file must be run as a Worker thread');

let embeddingInitialised = false;
let matchingInitialised = false;

async function ensureEmbeddingInitialised() {
  if (embeddingInitialised) return;
  await Embedding.getInstance();
  embeddingInitialised = true;
  workerLogger('system', 'info', 'Inference worker embedding pipeline ready', { threadId });
}
async function ensureMatchingInitialised() {
  if (matchingInitialised) return;
  await ZeroShot.getInstance();
  matchingInitialised = true;
  workerLogger('system', 'info', 'Inference worker matching pipeline ready', { threadId });
}

startHeartbeat('inference', config.workerHeartbeatInterval);

parentPort.on('message', async (raw: any) => {
  const possible = raw as EmbeddingJob & MatchingJob;
  const isEmbeddingJob =
    (possible as EmbeddingJob).tasks && (possible as EmbeddingJob).mode !== undefined;
  const jobId = possible.jobId;
  workerLogger(jobId || 'system', 'debug', 'Inference worker received job', {
    threadId,
    jobId,
    kind: isEmbeddingJob ? 'embedding' : 'matching',
    taskCount: possible.tasks?.length || 0,
  });
  try {
    if (isEmbeddingJob) await ensureEmbeddingInitialised();
    else await ensureMatchingInitialised();
  } catch (err) {
    workerLogger(
      jobId || 'system',
      'error',
      'Inference worker failed model init',
      { threadId, kind: isEmbeddingJob ? 'embedding' : 'matching' },
      err instanceof Error ? err : new Error(String(err)),
    );
    parentPort!.postMessage({
      type: 'error',
      jobId,
      error: `Model initialisation failed: ${err instanceof Error ? err.message : String(err)}`,
    });
    parentPort!.postMessage({ type: 'job_completed', jobId });
    return;
  }
  if (isEmbeddingJob) {
    await handleEmbeddingJob(raw as EmbeddingJob);
  } else {
    await handleMatchingJob(raw as MatchingJob);
  }
});

async function handleEmbeddingJob(job: EmbeddingJob) {
  try {
    if ((job as TaskEmbeddingJob).mode === 'task')
      await processTaskEmbeddingJob(job as TaskEmbeddingJob);
    else await processResourceEmbeddingJob(job as ResourceEmbeddingJob);
    workerLogger(job.jobId, 'info', 'Embedding job completed', { threadId });
  } catch (error) {
    workerLogger(
      job.jobId,
      'error',
      'Embedding job failed',
      { threadId },
      error instanceof Error ? error : new Error(String(error)),
    );
  } finally {
    parentPort!.postMessage({ type: 'job_completed', jobId: job.jobId });
  }
}

async function processResourceEmbeddingJob(job: ResourceEmbeddingJob): Promise<void> {
  workerLogger(job.jobId, 'debug', `Resource embedding job start (${job.tasks.length} tasks)`, {
    threadId,
  });
  await withJobUpdates<ResourceEmbeddingJob>(job, async (db, { tasks, jobId }) => {
    for (const { listId, resourceId, competenceId, text, type } of tasks) {
      sendHeartbeat('inference');
      try {
        const vectors = await Embedding.embed(text);
        const [vector] = vectors;
        sendHeartbeat('inference');
        db.upsertEmbedding({ listId, resourceId, competenceId, text, type, embedding: vector });
      } catch (err) {
        workerLogger(
          jobId,
          'error',
          'Failed embedding task',
          { threadId, competenceId, type },
          err instanceof Error ? err : new Error(String(err)),
        );
        parentPort!.postMessage({
          type: 'error',
          jobId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  });
}

async function processTaskEmbeddingJob(job: TaskEmbeddingJob): Promise<void> {
  workerLogger(job.jobId, 'debug', `Task embedding job start (${job.tasks.length} tasks)`, {
    threadId,
  });
  const dbInstance = getDB(job.dbName);
  await withJobUpdates<TaskEmbeddingJob>(
    job,
    async (db, { tasks, jobId }) => {
      for (const task of tasks) {
        const { taskId, description } = task;
        if (!description) continue;
        sendHeartbeat('inference');
        try {
          const vectors = await Embedding.embed(description);
          const [vector] = vectors;
          db.upsertTaskEmbedding(jobId, taskId, vector);
          sendHeartbeat('inference');
        } catch (err) {
          workerLogger(
            jobId,
            'error',
            'Failed task embedding',
            { threadId, taskId },
            err instanceof Error ? err : new Error(String(err)),
          );
          parentPort!.postMessage({
            type: 'error',
            jobId,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    },
    {
      onStart: () => {
        dbInstance.updateJobStatus(job.jobId, 'preprocessing');
        parentPort!.postMessage({ type: 'status', jobId: job.jobId, status: 'preprocessing' });
      },
      onDone: () => {
        dbInstance.updateJobStatus(job.jobId, 'pending');
        parentPort!.postMessage({ type: 'status', jobId: job.jobId, status: 'pending' });
      },
    },
  );
}

async function handleMatchingJob(job: MatchingJob) {
  workerLogger(job.jobId, 'debug', `Matching job start (${job.tasks.length} tasks)`, { threadId });
  try {
    const matchResults: Record<string, any[]> = {};
    for (const t of job.tasks) if (t.description) matchResults[t.description] = [];
    await withJobUpdates<MatchingJob>(
      job,
      async (db, { jobId, tasks, listId: listIdFilter, resourceId: resourceIdFilter }) => {
        for (const task of tasks) {
          const { taskId, description } = task;
          if (!description) continue;
          sendHeartbeat('inference');
          try {
            const vector = job.taskEmbeddings?.[taskId] ?? db.getTaskEmbedding(jobId, taskId);
            if (!vector) throw new Error(`No embedding stored for task ${taskId}`);
            if (vector.length !== config.embeddingDim)
              throw new Error(`Embedding length mismatch for task ${taskId}`);
            sendHeartbeat('inference');
            const matches: Match[] = db.searchEmbedding(vector, {
              filter: { listId: listIdFilter, resourceId: resourceIdFilter },
            });
            for (const match of matches) {
              let flag = 'neutral';
              let newDistance = Math.min(
                1,
                Math.max(0, match.distance - config.matchDistanceOffset) *
                  config.matchDistanceMultiplier,
              );
              const sentiment = await ZeroShot.nliBiDirectional(description, match.text);
              sendHeartbeat('inference');
              const contradiction = await ZeroShot.contradictionCheck(description, match.text);
              const alignment = await ZeroShot.alignmentCheck(description, match.text);
              sendHeartbeat('inference');
              if (
                sentiment.ranking[0] === 'contradict' ||
                sentiment.contradict > config.contradictionThreshold ||
                contradiction.contradicting
              ) {
                flag = 'contradicting';
                newDistance = 0.0;
              } else if (
                sentiment.entail > config.entailmentThreshold &&
                match.distance > (config as any).alignmentDistanceThreshold &&
                alignment.aligning
              ) {
                newDistance = Math.min(1, newDistance * (config as any).alignmentBoostMultiplier);
                flag = 'aligning';
              } else {
                newDistance *= (config as any).neutralReductionMultiplier || 1;
              }
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
          } catch (err) {
            workerLogger(
              jobId,
              'error',
              `Failed to process task ${taskId}`,
              { threadId, taskId },
              err instanceof Error ? err : new Error(String(err)),
            );
            parentPort!.postMessage({
              type: 'error',
              jobId,
              error: err instanceof Error ? err.message : String(err),
            });
          }
        }
      },
      {
        onDone: () =>
          parentPort!.postMessage({ type: 'job', job: 'reason', workload: matchResults }),
      },
    );
    workerLogger(job.jobId, 'info', 'Matching job completed', { threadId });
  } catch (err) {
    workerLogger(
      job.jobId,
      'error',
      'Matching job failed',
      { threadId },
      err instanceof Error ? err : new Error(String(err)),
    );
  } finally {
    try {
      getDB(job.dbName).deleteTaskEmbeddings(job.jobId);
    } catch {}
    parentPort!.postMessage({ type: 'job_completed', jobId: job.jobId });
  }
}

workerLogger('system', 'debug', 'Inference worker ready', { threadId });
