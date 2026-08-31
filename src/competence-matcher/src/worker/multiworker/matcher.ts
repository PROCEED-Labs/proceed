// Backup original matcher worker (multi-worker mode)
import { parentPort, threadId } from 'worker_threads';
import { withJobUpdates, workerLogger, startHeartbeat, sendHeartbeat } from '../../utils/worker';
import { addReason } from '../../tasks/reason';
import { Match, MatchingJob } from '../../utils/types';
import ZeroShot from '../../tasks/semantic-zeroshot';
import { config } from '../../config';
import { getDB } from '../../utils/db';
import { withOnnxLock } from '../../utils/onnx-lock';

if (!parentPort) throw new Error('This file must be run as a Worker thread');

let modelsInitialised = false;
async function ensureModelsInitialised() {
  if (modelsInitialised) return;
  await withOnnxLock(() => ZeroShot.getInstance());
  modelsInitialised = true;
  workerLogger('system', 'debug', 'Matcher worker online', { threadId });
}

startHeartbeat('matcher', config.workerHeartbeatInterval);

parentPort.on('message', async (message: any) => {
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
    parentPort!.postMessage({
      type: 'error',
      jobId: job.jobId,
      error: `Model initialisation failed: ${err instanceof Error ? err.message : String(err)}`,
    });
    parentPort!.postMessage({ type: 'job_completed', jobId: job.jobId });
    return;
  }
  workerLogger(job.jobId, 'debug', `Starting matching job with ${job.tasks.length} tasks`, {
    threadId,
    taskCount: job.tasks.length,
  });
  try {
    const matchResults: { [description: string]: any[] } = {};
    for (const task of job.tasks) if (task.description) matchResults[task.description] = [];
    await withJobUpdates<MatchingJob>(
      job,
      async (db, { jobId, tasks, listId: listIdFilter, resourceId: resourceIdFilter }) => {
        for (const task of tasks) {
          const { taskId, description } = task;
          if (!description) continue;
          sendHeartbeat('matcher');
          try {
            const vector = job.taskEmbeddings?.[taskId] ?? db.getTaskEmbedding(jobId, taskId);
            if (!vector) throw new Error(`No embedding stored for task ${taskId}`);
            if (vector.length !== config.embeddingDim)
              throw new Error(
                `Embedding length mismatch for task ${taskId}: expected ${config.embeddingDim}, received ${vector.length}`,
              );
            sendHeartbeat('matcher');
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
              const sentiment = await withOnnxLock(() =>
                ZeroShot.nliBiDirectional(description, match.text),
              );
              sendHeartbeat('matcher');
              const contradiction = await withOnnxLock(() =>
                ZeroShot.contradictionCheck(description, match.text),
              );
              const alignment = await withOnnxLock(() =>
                ZeroShot.alignmentCheck(description, match.text),
              );
              sendHeartbeat('matcher');
              if (
                sentiment.ranking[0] === 'contradict' ||
                sentiment.contradict > config.contradictionThreshold ||
                contradiction.contradicting
              ) {
                flag = 'contradicting';
                newDistance = 0.0;
              } else if (
                sentiment.entail > config.entailmentThreshold &&
                match.distance > config.alignmentDistanceThreshold &&
                alignment.aligning
              ) {
                flag = 'aligning';
                newDistance = Math.min(1, newDistance * config.alignmentBoostMultiplier);
              } else {
                flag = 'neutral';
                newDistance *= config.neutralReductionMultiplier;
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
          } catch (error) {
            workerLogger(
              jobId,
              'error',
              `Failed to process task ${taskId}`,
              { threadId, taskId },
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
        onDone: () =>
          parentPort!.postMessage({ type: 'job', job: 'reason', workload: matchResults }),
      },
    );
    workerLogger(job.jobId, 'debug', 'Matching job completed', {
      threadId,
      taskCount: job.tasks.length,
    });
  } catch (error) {
    workerLogger(
      job.jobId,
      'debug',
      'Matching job failed',
      { threadId },
      error instanceof Error ? error : new Error(String(error)),
    );
  } finally {
    try {
      getDB(job.dbName).deleteTaskEmbeddings(job.jobId);
    } catch (error) {
      workerLogger(
        job.jobId,
        'warn',
        'Failed to clean up task embeddings after matching job',
        { threadId },
        error instanceof Error ? error : new Error(String(error)),
      );
    }
    parentPort!.postMessage({ type: 'job_completed', jobId: job.jobId });
  }
});

workerLogger('system', 'debug', 'Matcher worker thread ready', { threadId });
