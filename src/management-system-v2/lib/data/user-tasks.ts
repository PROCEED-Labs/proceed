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
import { UserErrorType, userError } from '../user-error';
import { UserTaskInput } from '../user-task-schema';

export async function getUserTasks() {
  if (!enableUseDB) throw new Error('Not implemented for enableUseDB=false');

  try {
    return await _getUserTasks();
  } catch (err) {
    if (err instanceof UnauthorizedError)
      return userError('Permission denied', UserErrorType.PermissionError);
    else return userError('Error getting user tasks');
  }
}

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

export async function updateUserTask(userTaskId: string, userTaskInput: Partial<UserTaskInput>) {
  if (!enableUseDB) throw new Error('Not implemented for enableUseDB=false');

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
  if (!enableUseDB) throw new Error('Not implemented for enableUseDB=false');

  try {
    return await _deleteUserTask(userTaskId);
  } catch (e) {
    if (e instanceof UnauthorizedError)
      return userError('Permission denied', UserErrorType.PermissionError);
    else return userError('Error deleting user task');
  }
}
