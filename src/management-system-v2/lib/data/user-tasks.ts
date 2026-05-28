'use server';

import { z } from 'zod';
import {
  getUserTasks as _getUserTasks,
  getUserTaskById as _getUserTaskById,
  addUserTasks as _addUserTasks,
  updateUserTask as _updateUserTask,
  deleteUserTask as _deleteUserTask,
} from './db/user-tasks';
import { UnauthorizedError } from '../ability/abilityHelper';
import { UserErrorType, isUserErrorResponse, userError } from '../user-error';
import { ExtendedTaskListEntry, UserTaskInput } from '../user-task-schema';
import { getCurrentEnvironment } from '@/components/auth';
import { getAllAvailableEngines } from './engines';
import { getSpaceUsers } from './db/iam/users';
import { truthyFilter } from '../typescript-utils';

export async function getUserTasks(spaceId: string) {
  const {
    activeEnvironment: { isOrganization },
  } = await getCurrentEnvironment(spaceId);

  try {
    const userTasks = await _getUserTasks(spaceId);
    const users = await getSpaceUsers(spaceId, isOrganization);
    const reachableEngines = await getAllAvailableEngines(spaceId, undefined, true);

    if (isUserErrorResponse(reachableEngines)) return reachableEngines;

    // map the ids in the actualOwner array to the users of the current space so the frontend can
    // show richer information about who is working on the task
    return userTasks.map((uT) => ({
      ...uT,
      offline:
        uT.machineId === 'ms-local' || reachableEngines.some((e) => e.id === uT.machineId)
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
  } catch (err) {
    if (err instanceof UnauthorizedError)
      return userError('Permission denied', UserErrorType.PermissionError);
    else return userError('Error getting user tasks');
  }
}

export async function getUserTaskById(userTaskId: string) {
  try {
    return await _getUserTaskById(userTaskId);
  } catch (err) {
    if (err instanceof UnauthorizedError)
      return userError('Permission denied', UserErrorType.PermissionError);
    else return userError('Error getting user tasks');
  }
}

export async function addUserTasks(userTasks: UserTaskInput[]) {
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

export async function updateUserTask(userTaskId: string, userTaskInput: Partial<UserTaskInput>) {
  try {
    return await _updateUserTask(userTaskId, userTaskInput);
  } catch (e) {
    if (e instanceof UnauthorizedError)
      return userError('Permission denied', UserErrorType.PermissionError);
    else if (e instanceof z.ZodError)
      return userError('Schema validation failed', UserErrorType.SchemaValidationError);
    else return userError('Error getting updating user task');
  }
}

export async function deleteUserTask(userTaskId: string) {
  try {
    return await _deleteUserTask(userTaskId);
  } catch (e) {
    if (e instanceof UnauthorizedError)
      return userError('Permission denied', UserErrorType.PermissionError);
    else return userError('Error deleting user task');
  }
}
