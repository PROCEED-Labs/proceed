'use server';

import db from '@/lib/data/db';

import { UnauthorizedError } from '../ability/abilityHelper';
import { UserErrorType, isUserErrorResponse, userError } from '../user-error';
import {
  ExtendedTaskListEntry,
  UserTask,
  UserTaskInput,
  UserTaskInputSchema,
} from '../user-task-schema';
import { getCurrentEnvironment } from '@/components/auth';
import { getAllAvailableEngines } from './engines';
import { getSpaceUsers } from './db/iam/users';
import { truthyFilter } from '../typescript-utils';

export async function getUserTasks(spaceId: string) {
  const {
    activeEnvironment: { isOrganization },
  } = await getCurrentEnvironment(spaceId);

  try {
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
                  { version: { process: { environmentId: spaceId } } },
                  { removeTime: null, toRemove: false },
                ],
              },
            },
          },
        ],
      },
    })) as UserTask[];
    const users = await getSpaceUsers(spaceId, isOrganization);
    const reachableEngines = await getAllAvailableEngines(spaceId, undefined, true);

    if (isUserErrorResponse(reachableEngines)) return reachableEngines;

    // map the ids in the actualOwner array to the users of the current space so the frontend can
    // show richer information about who is working on the task
    return userTasks.map((uT) => ({
      ...uT,
      offline: !uT.engineId || reachableEngines.some((e) => e.id === uT.engineId) ? false : true,
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
  } catch (err) {
    if (err instanceof UnauthorizedError)
      return userError('Permission denied', UserErrorType.PermissionError);
    else return userError('Error getting user tasks');
  }
}

export async function getUserTaskById(userTaskId: string) {
  try {
    const userTask = await db.userTask.findUnique({
      where: {
        id: userTaskId,
      },
    });

    return userTask as UserTask;
  } catch (err) {
    return userError('Error getting user tasks');
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

export async function updateUserTask(userTaskId: string, userTaskInput: Partial<UserTaskInput>) {
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

    return res;
  } catch (e) {
    return userError('Error getting updating user task');
  }
}
