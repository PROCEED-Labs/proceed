'use server';

import { userError } from '../user-error';
import { deployProcess as _deployProcess } from './deployment';
import { Engine, getProceedEngines as _getEngines, getProceedEngines } from './machines';
import { spaceEnginesToEngines } from './space-engines-helpers';
import { getCurrentEnvironment } from '@/components/auth';
import { enableUseDB } from 'FeatureFlags';
import {
  getSpaceEngines as getSpaceEnginesFromDb,
  getSpaceEngineByAddress as getSpaceEngineByAddressFromDb,
} from '@/lib/data/db/space-engines';

export async function deployProcess(
  definitionId: string,
  version: number,
  spaceId: string,
  method: 'static' | 'dynamic' = 'dynamic',
  _forceEngine?: Extract<Engine, { spaceEngine: true }>,
) {
  try {
    // TODO: manage permissions for deploying a process

    if (!enableUseDB)
      throw new Error('getAvailableEnginesForSpace only available with enableUseDB');

    const { ability } = await getCurrentEnvironment(spaceId);

    let forceEngine: Extract<Engine, { spaceEngine: true }> | undefined = undefined;
    if (_forceEngine) {
      const address =
        _forceEngine.type === 'http' ? _forceEngine.address : _forceEngine.brokerAddress;
      const spaceEngine = await getSpaceEngineByAddressFromDb(address, spaceId, ability);
      if (!spaceEngine) throw new Error('No matching space engine found');

      const engine = await spaceEnginesToEngines([spaceEngine]);
      if (engine.length === 0) throw new Error("Engine couldn't be reached");
      forceEngine = engine[0];
    }

    const [proceedEngines, spaceEngines] = await Promise.allSettled([
      getProceedEngines(),
      getSpaceEnginesFromDb(spaceId, ability),
    ]);
    if (proceedEngines.status === 'rejected' && spaceEngines.status === 'rejected')
      throw new Error('Failed to fetch engines');

    // If there are any space engines, use them instead of the proceed engines
    let engines = proceedEngines.status === 'fulfilled' ? proceedEngines.value : [];
    if (spaceEngines.status === 'fulfilled') {
      const availableSpaceEngines = await spaceEnginesToEngines(spaceEngines.value);
      if (availableSpaceEngines.length > 0) engines = availableSpaceEngines;
    }

    await _deployProcess(definitionId, version, spaceId, method, engines, forceEngine);
  } catch (e) {
    return userError('Something went wrong');
  }
}
