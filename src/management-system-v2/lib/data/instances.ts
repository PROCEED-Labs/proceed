'use server';

import { z } from 'zod';
import { enableUseDB } from 'FeatureFlags';
import {
  getInstances as _getInstances,
  getInstanceById as _getInstanceById,
  addInstance as _addInstance,
  deleteInstances as _deleteInstances,
  Instance,
} from './db/instances';
import { UnauthorizedError } from '../ability/abilityHelper';
import { UserErrorType, userError } from '../user-error';

export async function getInstances(spaceId: string) {
  if (!enableUseDB) throw new Error('Not implemented for enableUseDB=false');

  try {
    return await _getInstances(spaceId);
  } catch (err) {
    if (err instanceof UnauthorizedError)
      return userError('Permission denied', UserErrorType.PermissionError);
    else return userError('Error getting instances');
  }
}

export async function getInstanceById(instanceId: string) {
  if (!enableUseDB) throw new Error('Not implemented for enableUseDB=false');

  try {
    return await _getInstanceById(instanceId);
  } catch (err) {
    if (err instanceof UnauthorizedError)
      return userError('Permission denied', UserErrorType.PermissionError);
    else return userError(`Error getting instance ${instanceId}`);
  }
}

export async function addInstance(instance: Instance) {
  if (!enableUseDB) throw new Error('Not implemented for enableUseDB=false');

  try {
    return await _addInstance(instance);
  } catch (e) {
    if (e instanceof UnauthorizedError)
      return userError('Permission denied', UserErrorType.PermissionError);
    else if (e instanceof z.ZodError)
      return userError('Schema validation failed', UserErrorType.SchemaValidationError);
    else return userError('Error adding an instance');
  }
}

export async function deleteInstances(definitionId: string) {
  if (!enableUseDB) throw new Error('Not implemented for enableUseDB=false');

  try {
    return await _deleteInstances(definitionId);
  } catch (e) {
    if (e instanceof UnauthorizedError)
      return userError('Permission denied', UserErrorType.PermissionError);
    else return userError('Error deleting instances');
  }
}
