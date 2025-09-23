import { CronJob } from 'cron';
import { getMSConfig } from './ms-config/ms-config';
import db from '@/lib/data/db';
import { removeDeletedArtifactsFromDb } from './data/file-manager-facade';
import { deleteInactiveGuestUsers } from './data/db/iam/users';
import { removeInactiveSpaces } from './data/db/iam/environments';
import { removeExpiredEmailVerificationTokens } from './data/db/iam/verification-tokens';

const global = globalThis as any;

/** Restart cronjob with new ms config values or start it, in the case that no job was running */
export async function restartInternalScheduler() {
  try {
    const msConfig = await getMSConfig({ dontForceDynamicThroughHeaders: true });

    if (global.schedulerCronJob) {
      await global.schedulerCronJob.stop();
      global.schedulerCronJob = undefined;
    }

    // NOTE: not sure if doing this here may be too much functionality in one function
    if (!msConfig.SCHEDULER_INTERNAL_ACTIVE) return;

    global.schedulerCronJob = CronJob.from({
      cronTime: msConfig.SCHEDULER_INTERVAL,
      onTick: async function () {
        try {
          const message = await allSchedulerTasks();
          console.log('Scheduler results:\n' + message);
        } catch (e) {
          console.error('Scheduler failed', e);
        }
      },
      start: true,
    });
  } catch (e) {
    console.error('Failed to start/restart scheduler', e);
  }
}

const MS_IN_DAY = 1000 * 60 * 60 * 24;

// For now we simply define all tasks here
export async function allSchedulerTasks() {
  const msConfig = await getMSConfig({ dontForceDynamicThroughHeaders: true });

  let message = '';
  await db.$transaction(async (tx) => {
    const removedArtifacts = await removeDeletedArtifactsFromDb(
      msConfig.SCHEDULER_TASK_DELETE_OLD_ARTIFACTS * MS_IN_DAY,
      tx,
    );
    message += `Removed ${removedArtifacts.count} artifacts.\n`;

    const removedInactiveGuests = await deleteInactiveGuestUsers(
      msConfig.SCHEDULER_TASK_DELETE_INACTIVE_GUESTS * MS_IN_DAY,
      tx,
    );
    message += `Removed ${removedInactiveGuests.count} inactive guests.\n`;

    const inactiveSpaces = await removeInactiveSpaces(
      msConfig.SCHEDULER_TASK_DELETE_INACTIVE_SPACES * MS_IN_DAY,
      tx,
    );
    message += `Removed ${inactiveSpaces.count} inactive spaces.\n`;

    const removedVerificationTokens = await removeExpiredEmailVerificationTokens(tx);
    message += `Removed ${removedVerificationTokens.count} expired verification tokens.`;
  });

  return message;
}
