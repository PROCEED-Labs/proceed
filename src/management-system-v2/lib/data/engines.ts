'use server';

import { UnauthorizedError } from '@/lib/ability/abilityHelper';
import { SpaceEngineInput } from '@/lib/space-engine-schema';
import {
  getDbEngines as _getDbEngines,
  getDbEngineById as _getDbEngineById,
  addDbEngines as _addDbEngines,
  updateDbEngine as _updateDbEngine,
  deleteSpaceEngine as _deleteDbEngine,
} from '@/lib/data/db/engines';
import { getCurrentEnvironment, getCurrentUser } from '@/components/auth';
import { UserErrorType, userError } from '../user-error';
import { z } from 'zod';
import { enableUseDB } from 'FeatureFlags';

export async function getDbEngines(environmentId: string | null) {
  if (!enableUseDB) throw new Error('Not implemented for enableUseDB=false');

  let ability;
  if (environmentId) ability = (await getCurrentEnvironment(environmentId)).ability;
  const systemAdmin = (await getCurrentUser()).systemAdmin;

  try {
    return await _getDbEngines(environmentId ?? null, ability, systemAdmin);
  } catch (e) {
    if (e instanceof UnauthorizedError)
      return userError('Permission denied', UserErrorType.PermissionError);
    else return userError('Error getting space engines');
  }
}

export async function getDbEngineById(engineId: string, environmentId: string | null) {
  if (!enableUseDB) throw new Error('Not implemented for enableUseDB=false');

  let ability;
  if (environmentId) ability = (await getCurrentEnvironment(environmentId)).ability;
  const systemAdmin = (await getCurrentUser()).systemAdmin;

  try {
    return await _getDbEngineById(engineId, environmentId ?? null, ability, systemAdmin);
  } catch (e) {
    if (e instanceof UnauthorizedError)
      return userError('Permission denied', UserErrorType.PermissionError);
    else return userError('Error getting space engines');
  }
}

export async function addDbEngines(enginesInput: SpaceEngineInput[], environmentId: string | null) {
  if (!enableUseDB) throw new Error('Not implemented for enableUseDB=false');

  let ability;
  if (environmentId) ability = (await getCurrentEnvironment(environmentId)).ability;
  const systemAdmin = (await getCurrentUser()).systemAdmin;

  try {
    return await _addDbEngines(enginesInput, environmentId ?? null, ability, systemAdmin);
  } catch (e) {
    if (e instanceof UnauthorizedError)
      return userError('Permission denied', UserErrorType.PermissionError);
    else if (e instanceof z.ZodError)
      return userError('Schema validation failed', UserErrorType.SchemaValidationError);
    else return userError('Error getting space engines');
  }
}

export async function updateDbEngine(
  engineId: string,
  engineInput: Partial<SpaceEngineInput>,
  environmentId: string | null,
) {
  if (!enableUseDB) throw new Error('Not implemented for enableUseDB=false');

  let ability;
  if (environmentId) ability = (await getCurrentEnvironment(environmentId)).ability;
  const systemAdmin = (await getCurrentUser()).systemAdmin;

  try {
    return await _updateDbEngine(
      engineId,
      engineInput,
      environmentId ?? null,
      ability,
      systemAdmin,
    );
  } catch (e) {
    if (e instanceof UnauthorizedError)
      return userError('Permission denied', UserErrorType.PermissionError);
    else if (e instanceof z.ZodError)
      return userError('Schema validation failed', UserErrorType.SchemaValidationError);
    else return userError('Error getting space engines');
  }
}

export async function deleteSpaceEngine(engineId: string, environmentId: string | null) {
  if (!enableUseDB) throw new Error('Not implemented for enableUseDB=false');

  let ability;
  if (environmentId) ability = (await getCurrentEnvironment(environmentId)).ability;
  const systemAdmin = (await getCurrentUser()).systemAdmin;

  try {
    return await _deleteDbEngine(engineId, environmentId ?? null, ability, systemAdmin);
  } catch (e) {
    if (e instanceof UnauthorizedError)
      return userError('Permission denied', UserErrorType.PermissionError);
    else return userError('Error getting space engines');
  }
}
