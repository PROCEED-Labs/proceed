'use server';

import { isUserErrorResponse, userError } from '../user-error';
import { deployProcess as _deployProcess } from './deployment';
import { Engine, getProceedEngines as _getEngines } from './machines';
import { getSpaceEngines } from '@/lib/data/space-engines';
import { spaceEnginesToEngines } from './space-engines-helpers';

export async function deployProcess(
  definitionId: string,
  version: number,
  spaceId: string,
  method: 'static' | 'dynamic' = 'dynamic',
) {
  try {
    // TODO: manage permissions
    // TODO: get machines allowed for user

    const [proceedEngines, spaceEngines] = await Promise.all([
      _getEngines(),
      getSpaceEngines(spaceId),
    ]);

    let engines = proceedEngines;
    if (!isUserErrorResponse(spaceEngines)) engines = await spaceEnginesToEngines(spaceEngines);

    await _deployProcess(definitionId, version, spaceId, method, engines);
  } catch (e) {
    return userError('Something went wrong');
  }
}
