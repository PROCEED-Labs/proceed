'use server';

import { userError } from '../user-error';
import { deployProcess as _deployProcess } from './deployment';
import { SpaceEngine, getProceedEngines as _getEngines, getProceedEngines } from './machines';
import { spaceEnginesToEngines } from './space-engines-helpers';
import { getCurrentEnvironment } from '@/components/auth';
import { enableUseDB } from 'FeatureFlags';
import {
  getDbEngines as getSpaceEnginesFromDb,
  getDbEngineByAddress as getSpaceEngineByAddressFromDb,
} from '@/lib/data/db/engines';

export async function deployProcess(
  definitionId: string,
  versionId: string,
  spaceId: string,
  method: 'static' | 'dynamic' = 'dynamic',
  _forceEngine?: SpaceEngine | 'PROCEED',
) {
  try {
    // TODO: manage permissions for deploying a process

    if (!enableUseDB)
      throw new Error('getAvailableEnginesForSpace only available with enableUseDB');

    const { ability } = await getCurrentEnvironment(spaceId);

    const [proceedEngines, spaceEngines] = await Promise.allSettled([
      getProceedEngines(),
      getSpaceEnginesFromDb(spaceId, ability),
    ]);
    if (proceedEngines.status === 'rejected' && spaceEngines.status === 'rejected')
      throw new Error('Failed to fetch engines');

    // Start with PROCEED engines and overwrite them later if needed
    let engines = proceedEngines.status === 'fulfilled' ? proceedEngines.value : [];

    // TODO: refactor spaceEnginesToEngines and calls to db potentially happening twice
    let forceEngine: SpaceEngine | undefined = undefined;
    if (_forceEngine && _forceEngine !== 'PROCEED') {
      const address =
        _forceEngine.type === 'http' ? _forceEngine.address : _forceEngine.brokerAddress;
      const spaceEngine = await getSpaceEngineByAddressFromDb(address, spaceId, ability);
      if (!spaceEngine) throw new Error('No matching space engine found');

      const engine = await spaceEnginesToEngines([spaceEngine]);
      if (engine.length === 0) throw new Error("Engine couldn't be reached");
      forceEngine = engine[0];
    } else if (!_forceEngine && spaceEngines.status === 'fulfilled') {
      // If we don't want to force PROCEEDE engines use space engines if available
      const availableSpaceEngines = await spaceEnginesToEngines(spaceEngines.value);
      if (availableSpaceEngines.length > 0) engines = availableSpaceEngines;
    }

    await _deployProcess(definitionId, versionId, spaceId, method, engines, forceEngine);
  } catch (e) {
    return userError('Something went wrong');
  }
}

/** Returns space engines that are currently online */
export async function getAvailableSpaceEngines(spaceId: string) {
  try {
    if (!enableUseDB)
      throw new Error('getAvailableEnginesForSpace only available with enableUseDB');

    const { ability } = await getCurrentEnvironment(spaceId);
    const spaceEngines = await getSpaceEnginesFromDb(spaceId, ability);
    return await spaceEnginesToEngines(spaceEngines);
  } catch (e) {
    return userError('Something went wrong');
  }
}
