'use server';

import { z } from 'zod';
import { enableUseDB } from 'FeatureFlags';
import {
  getUserTaskById as _getUserTaskById,
  addUserTasks as _addUserTasks,
  updateUserTask as _updateUserTask,
} from './db/user-tasks';
import { UnauthorizedError } from '../ability/abilityHelper';
import { UserErrorType, userError } from '../user-error';
import { UserTaskInput, UserTask, ExtendedTaskListEntry } from '../user-task-schema';
import { cacheLife, cacheTag, updateTag } from 'next/cache';
import db from '@/lib/data/db';
import { getCurrentEnvironment } from '@/components/auth';
import { User } from '@prisma/client';
import { truthyFilter } from '../typescript-utils';

export async function getUserTasks(spaceId: string) {
  if (!enableUseDB) throw new Error('Not implemented for enableUseDB=false');

  const {
    activeEnvironment: { isOrganization },
  } = await getCurrentEnvironment(spaceId);

  try {
    const dbFetch = async () => {
      'use cache';
      cacheTag(`space/${spaceId}/userTasks`);
      cacheLife({ stale: 10, revalidate: 10, expire: 15 });

      console.log('Fetching tasks for ', spaceId);

      const userTasks = (await db.userTask.findMany({
        where: {
          OR: [
            // get all user tasks that were created in the task editor of the MS
            { instance: null },
            // and all user tasks that belong to instances of processes belonging to this space
            { instance: { deployment: { version: { process: { environmentId: spaceId } } } } },
          ],
        },
      })) as UserTask[];

      let users: User[];
      // get the users for the current space
      if (isOrganization) {
        users = await db.user.findMany({
          where: { memberIn: { some: { environmentId: spaceId } } },
        });
      } else {
        const user = await db.user.findUnique({ where: { id: spaceId } });
        users = user ? [user] : [];
      }

      // map the ids in the actualOwner array to the users of the current space so the frontend can
      // show richer information about who is working on the task
      return userTasks.map((uT) => ({
        ...uT,
        actualOwner: uT.actualOwner
          .map((id) => {
            const user = users.find((u) => u.id === id);
            if (user) {
              return { id, name: user.firstName + ' ' + user.lastName, username: user.username };
            } else {
              return { id, name: '' };
            }
          })
          .filter(truthyFilter),
      })) satisfies ExtendedTaskListEntry[];
    };

    return dbFetch();
  } catch (err) {
    if (err instanceof UnauthorizedError)
      return userError('Permission denied', UserErrorType.PermissionError);
    else return userError('Error getting user tasks');
  }
}

// TODO: add spaceId as parameter and use the cached data from "getUserTasks" and then remove
// "getUserTaskById" from the db/user-tasks.ts file
export async function getUserTaskById(userTaskId: string) {
  if (!enableUseDB) throw new Error('Not implemented for enableUseDB=false');

  try {
    return await _getUserTaskById(userTaskId);
  } catch (err) {
    if (err instanceof UnauthorizedError)
      return userError('Permission denied', UserErrorType.PermissionError);
    else return userError('Error getting user tasks');
  }
}

export async function addUserTasks(userTasks: UserTaskInput[]) {
  if (!enableUseDB) throw new Error('Not implemented for enableUseDB=false');

  try {
    return await _addUserTasks(userTasks);
  } catch (e) {
    if (e instanceof UnauthorizedError)
      return userError('Permission denied', UserErrorType.PermissionError);
    else if (e instanceof z.ZodError)
      return userError('Schema validation failed', UserErrorType.SchemaValidationError);
    else return userError('Error getting user task');
  }
}

export async function updateUserTask(
  spaceId: string,
  userTaskId: string,
  userTaskInput: Partial<UserTaskInput>,
) {
  if (!enableUseDB) throw new Error('Not implemented for enableUseDB=false');

  try {
    const res = await _updateUserTask(userTaskId, userTaskInput);

    updateTag(`space/${spaceId}/userTasks`);

    return res;
  } catch (e) {
    if (e instanceof UnauthorizedError)
      return userError('Permission denied', UserErrorType.PermissionError);
    else if (e instanceof z.ZodError)
      return userError('Schema validation failed', UserErrorType.SchemaValidationError);
    else return userError('Error getting updating user task');
  }
}
