'use server';

import { UnauthorizedError } from '../ability/abilityHelper';
import { UserErrorType, isUserErrorResponse, userError } from '../user-error';
import {
  UserTaskInput,
  UserTask,
  ExtendedTaskListEntry,
  UserTaskInputSchema,
} from '../user-task-schema';
import { cacheLife, cacheTag, updateTag } from 'next/cache';
import db from '@/lib/data/db';
import { getCurrentEnvironment } from '@/components/auth';
import { truthyFilter } from '../typescript-utils';
import { getSpaceUsers } from './db/iam/users';
import { getAllAvailableMachines } from './engines';

export async function getUserTasks(spaceId: string) {
  const {
    activeEnvironment: { isOrganization },
  } = await getCurrentEnvironment(spaceId);

  try {
    const dbFetch = async () => {
      'use cache';
      cacheTag(`space/${spaceId}/userTasks`);
      cacheLife({ stale: 10, revalidate: 10, expire: 15 });

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

      const users = await getSpaceUsers(spaceId, isOrganization);
      const reachableMachines = await getAllAvailableMachines(spaceId, true);

      // map the ids in the actualOwner array to the users of the current space so the frontend can
      // show richer information about who is working on the task
      return userTasks.map((uT) => ({
        ...uT,
        offline:
          uT.machineId === 'ms-local' || reachableMachines.some((m) => m.id === uT.machineId)
            ? false
            : true,
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

export async function getUserTaskById(spaceId: string, userTaskId: string) {
  try {
    const spaceTasks = await getUserTasks(spaceId);
    if (isUserErrorResponse(spaceTasks)) return spaceTasks;
    return spaceTasks.find((t) => t.id === userTaskId);
  } catch (err) {
    if (err instanceof UnauthorizedError)
      return userError('Permission denied', UserErrorType.PermissionError);
    else return userError('Error getting user tasks');
  }
}

export async function addUserTasks(userTasks: UserTaskInput[]) {
  try {
    const newUserTasks = UserTaskInputSchema.array().safeParse(userTasks);

    if (!newUserTasks.success) {
      return userError('Schema validation failed', UserErrorType.SchemaValidationError);
    }

    // TODO: maybe check if the user can work on/add user tasks

    return await db.userTask.createMany({
      data: newUserTasks.data,
    });
  } catch (e) {
    return userError('Error getting user task');
  }
}

export async function updateUserTask(
  spaceId: string,
  userTaskId: string,
  userTaskInput: Partial<UserTaskInput>,
) {
  try {
    const newUserTaskData = UserTaskInputSchema.partial().safeParse(userTaskInput);

    if (!newUserTaskData.success) {
      return userError('Schema validation failed', UserErrorType.SchemaValidationError);
    }

    const res = await db.userTask.update({
      data: newUserTaskData.data,
      where: {
        id: userTaskId,
      },
    });

    updateTag(`space/${spaceId}/userTasks`);

    return res;
  } catch (e) {
    return userError('Error getting updating user task');
  }
}
