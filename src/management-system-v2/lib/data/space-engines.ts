'use server';

import { UnauthorizedError } from '@/lib/ability/abilityHelper';
import { SpaceEngineInput } from '@/lib/space-engine-schema';
import {
  getSpaceEngines as _getSpaceEngines,
  getSpaceEngineById as _getSpaceEngineById,
  addSpaceEngines as _addSpaceEngines,
  updateSpaceEngine as _updateSpaceEngine,
  deleteSpaceEngine as _deleteSpaceEngine,
} from '@/lib/data/db/space-engines';
import { getCurrentEnvironment } from '@/components/auth';
import { UserErrorType, userError } from '../user-error';
import { z } from 'zod';
import { enableUseDB } from 'FeatureFlags';

export async function getSpaceEngines(environmentId: string) {
  if (!enableUseDB) throw new Error('Not implemented for enableUseDB=false');

  const { ability } = await getCurrentEnvironment(environmentId);

  try {
    return await _getSpaceEngines(environmentId, ability);
  } catch (e) {
    if (e instanceof UnauthorizedError)
      return userError('Permission denied', UserErrorType.PermissionError);
    else return userError('Error getting space engines');
  }
}

export async function getSpaceEngineById(environmentId: string, engineId: string) {
  if (!enableUseDB) throw new Error('Not implemented for enableUseDB=false');

  const { ability } = await getCurrentEnvironment(environmentId);

  try {
    return await _getSpaceEngineById(environmentId, engineId, ability);
  } catch (e) {
    if (e instanceof UnauthorizedError)
      return userError('Permission denied', UserErrorType.PermissionError);
    else return userError('Error getting space engines');
  }
}

export async function addSpaceEngines(environmentId: string, enginesInput: SpaceEngineInput[]) {
  if (!enableUseDB) throw new Error('Not implemented for enableUseDB=false');

  const { ability } = await getCurrentEnvironment(environmentId);

  try {
    return await _addSpaceEngines(environmentId, enginesInput, ability);
  } catch (e) {
    if (e instanceof UnauthorizedError)
      return userError('Permission denied', UserErrorType.PermissionError);
    else if (e instanceof z.ZodError)
      return userError('Schema validation failed', UserErrorType.SchemaValidationError);
    else return userError('Error getting space engines');
  }
}

export async function updateSpaceEngine(
  environmentId: string,
  engineId: string,
  engineInput: Partial<SpaceEngineInput>,
) {
  if (!enableUseDB) throw new Error('Not implemented for enableUseDB=false');

  const { ability } = await getCurrentEnvironment(environmentId);

  try {
    return await _updateSpaceEngine(environmentId, engineId, engineInput, ability);
  } catch (e) {
    if (e instanceof UnauthorizedError)
      return userError('Permission denied', UserErrorType.PermissionError);
    else if (e instanceof z.ZodError)
      return userError('Schema validation failed', UserErrorType.SchemaValidationError);
    else return userError('Error getting space engines');
  }
}

export async function deleteSpaceEngine(environmentId: string, engineId: string) {
  if (!enableUseDB) throw new Error('Not implemented for enableUseDB=false');

  const { ability } = await getCurrentEnvironment(environmentId);

  try {
    return await _deleteSpaceEngine(environmentId, engineId, ability);
  } catch (e) {
    if (e instanceof UnauthorizedError)
      return userError('Permission denied', UserErrorType.PermissionError);
    else return userError('Error getting space engines');
  }
}
