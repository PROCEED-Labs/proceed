'use server';

import { z } from 'zod';
import { enableUseDB } from 'FeatureFlags';
import {
  getUserTasks as _getUserTasks,
  getUserTaskById as _getUserTaskById,
  addUserTasks as _addUserTasks,
  updateUserTask as _updateUserTask,
  deleteUserTask as _deleteUserTask,
} from './db/user-tasks';
import { UnauthorizedError } from '../ability/abilityHelper';
import { UserErrorType, getErrorMessage, userError } from '../server-error-handling/user-error';
import { UserTaskInput } from '../user-task-schema';

export async function getUserTasks() {
  if (!enableUseDB) throw new Error('Not implemented for enableUseDB=false');

  try {
    const result = await _getUserTasks();
    if (result.isErr()) return userError(getErrorMessage(result.error));

    return result.value;
  } catch (err) {
    return userError('Error getting user tasks');
  }
}

export async function getUserTaskById(userTaskId: string) {
  if (!enableUseDB) throw new Error('Not implemented for enableUseDB=false');

  try {
    const result = await _getUserTaskById(userTaskId);
    if (result.isErr()) return userError(getErrorMessage(result.error));

    return result.value;
  } catch (err) {
    return userError('Error getting user tasks');
  }
}

export async function addUserTasks(userTasks: UserTaskInput[]) {
  if (!enableUseDB) throw new Error('Not implemented for enableUseDB=false');

  try {
    const result = await _addUserTasks(userTasks);
    if (result.isErr()) return userError(getErrorMessage(result.error));

    return result.value;
  } catch (e) {
    if (e instanceof UnauthorizedError)
      return userError('Permission denied', UserErrorType.PermissionError);
    else if (e instanceof z.ZodError)
      return userError('Schema validation failed', UserErrorType.SchemaValidationError);
    else return userError('Error getting user task');
  }
}

export async function updateUserTask(userTaskId: string, userTaskInput: Partial<UserTaskInput>) {
  if (!enableUseDB) throw new Error('Not implemented for enableUseDB=false');

  try {
    const result = await _updateUserTask(userTaskId, userTaskInput);
    if (result.isErr()) return userError(getErrorMessage(result.error));

    return result.value;
  } catch (e) {
    return userError('Error getting updating user task');
  }
}

export async function deleteUserTask(userTaskId: string) {
  if (!enableUseDB) throw new Error('Not implemented for enableUseDB=false');

  try {
    const result = await _deleteUserTask(userTaskId);
    if (result.isErr()) return userError(getErrorMessage(result.error));

    return result.value;
  } catch (e) {
    return userError('Error deleting user task');
  }
}
