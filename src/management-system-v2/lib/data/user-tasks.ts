'use server';

import db from '@/lib/data/db';

import Ability, { UnauthorizedError } from '../ability/abilityHelper';
import { UserErrorType, userError } from '../user-error';
import {
  ExtendedTaskListEntry,
  UserTask,
  UserTaskInput,
  UserTaskInputSchema,
} from '../user-task-schema';
import { getSpaceUsers } from './db/iam/users';
import { truthyFilter } from '../typescript-utils';
import { getEnvironmentById } from './db/iam/environments';
import { Engine } from '../engines/types';
import { cacheLife, cacheTag, revalidateTag } from 'next/cache';

export async function getUserTasks(spaceId: string, ability?: Ability) {
  const space = await getEnvironmentById(spaceId, ability);
  if (!space) return userError('Unknown Space');

  try {
    async function getFromDBOrCache(environmentId: string, isOrganization: boolean) {
      'use cache';
      cacheLife({ revalidate: 10, expire: 15 });
      cacheTag(`space/${environmentId}/tasks`);
      const userTasks = (await db.userTask.findMany({
        where: {
          OR: [
            // get all user tasks that were created in the task editor of the MS
            { instance: null },
            // and all user tasks that belong to instances of processes belonging to this space
            {
              instance: {
                deployment: {
                  AND: [
                    { version: { process: { environmentId } } },
                    { removeTime: null, toRemove: false },
                  ],
                },
              },
            },
          ],
        },
        include: {
          engine: {
            include: {
              connections: {
                where: {
                  reachable: true,
                },
                include: {
                  connection: true,
                },
              },
            },
          },
        },
      })) as (UserTask & { engine: Engine | null })[];

      const users = await getSpaceUsers(spaceId, isOrganization);

      // map the ids in the actualOwner array to the users of the current space so the frontend can
      // show richer information about who is working on the task
      return userTasks.map((uT) => ({
        ...uT,
        offline: !!uT.engine && !uT.engine.connections.some((c) => c.reachable),
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
    }

    return await getFromDBOrCache(spaceId, space.isOrganization);
  } catch (err) {
    if (err instanceof UnauthorizedError)
      return userError('Permission denied', UserErrorType.PermissionError);
    else return userError('Error getting user tasks');
  }
}

export async function getUserTaskById(userTaskId: string) {
  try {
    async function getFromDBOrCache(userTaskId: string) {
      'use cache';
      cacheLife({ revalidate: 10, expire: 15 });
      cacheTag(`userTask/${userTaskId}`);
      return await db.userTask.findUnique({
        where: {
          id: userTaskId,
        },
        include: {
          engine: {
            include: {
              connections: {
                where: {
                  reachable: true,
                },
                include: { connection: true },
              },
            },
          },
        },
      });
    }

    const userTask = await getFromDBOrCache(userTaskId);

    return userTask as UserTask & { engine: Engine | null };
  } catch (err) {
    return userError('Error getting user task');
  }
}

export async function addUserTasks(spaceId: string, userTasks: UserTaskInput[]) {
  try {
    const newUserTasks = UserTaskInputSchema.array().safeParse(userTasks);

    if (!newUserTasks.success) {
      return userError('Schema validation failed', UserErrorType.SchemaValidationError);
    }

    // TODO: maybe check if the user can work on/add user tasks
    const res = await db.userTask.createMany({
      data: newUserTasks.data,
    });

    revalidateTag(`space/${spaceId}/tasks`, 'max');

    return res;
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

    revalidateTag(`userTask/${userTaskId}`, 'max');
    revalidateTag(`space/${spaceId}/tasks`, 'max');

    return res;
  } catch (e) {
    return userError('Error getting updating user task');
  }
}
