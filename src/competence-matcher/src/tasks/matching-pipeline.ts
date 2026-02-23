import workerManager from '../worker/worker-manager';
import { MatchingJob, MatchingTask, TaskEmbeddingJob } from '../utils/types';
import { getLogger } from '../utils/logger';
import { getDB } from '../utils/db';

/**
 * Coordinates the two-step matching workflow by first embedding tasks and then
 * handing the job over to the matcher worker pool.
 */
export function scheduleMatchingPipeline(
  matchingJob: MatchingJob,
  tasks: MatchingTask[],
  requestId?: string,
): void {
  const logger = getLogger();

  const taskEmbeddingJob: TaskEmbeddingJob = {
    jobId: matchingJob.jobId,
    dbName: matchingJob.dbName,
    mode: 'task',
    tasks,
  };

  workerManager
    .enqueue(taskEmbeddingJob, 'embedder')
    .then(() => workerManager.enqueue(matchingJob, 'matcher'))
    .catch((error) => {
      logger.error(
        'system',
        'Task embedding stage failed before matcher enqueue',
        error instanceof Error ? error : new Error(String(error)),
        { jobId: matchingJob.jobId },
        requestId,
      );

      try {
        const db = getDB(matchingJob.dbName);
        db.updateJobStatus(matchingJob.jobId, 'failed');
      } catch (dbError) {
        logger.error(
          'system',
          'Failed to mark job as failed after embedding stage error',
          dbError instanceof Error ? dbError : new Error(String(dbError)),
          { jobId: matchingJob.jobId },
          requestId,
        );
      }
    });
}
