'use server';

import { userError } from '../user-error';
import {
  deployProcess as _deployProcess,
  getDeployments,
  removeDeploymentFromMachines,
} from './deployment';
import {
  Engine,
  SpaceEngine,
  getProceedEngines as _getEngines,
  getProceedEngines,
} from './machines';
import { spaceEnginesToEngines } from './space-engines-helpers';
import { getCurrentEnvironment } from '@/components/auth';
import { enableUseDB } from 'FeatureFlags';
import {
  getSpaceEngines as getSpaceEnginesFromDb,
  getSpaceEngineByAddress as getSpaceEngineByAddressFromDb,
} from '@/lib/data/db/space-engines';
import {
  pauseInstanceOnMachine,
  resumeInstanceOnMachine,
  startInstanceOnMachine,
  stopInstanceOnMachine,
} from './instances';
import { asyncFilter, asyncForEach } from '../helpers/javascriptHelpers';

async function getCorrectTargetEngines(
  spaceId: string,
  _forceEngine?: SpaceEngine | 'PROCEED',
  validatorFunc?: (engine: Engine) => Promise<boolean>,
) {
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
  if (_forceEngine === 'PROCEED' && validatorFunc) {
    engines = await asyncFilter(engines, validatorFunc);
  } else if (_forceEngine && _forceEngine !== 'PROCEED') {
    const address =
      _forceEngine.type === 'http' ? _forceEngine.address : _forceEngine.brokerAddress;
    const spaceEngine = await getSpaceEngineByAddressFromDb(address, spaceId, ability);
    if (!spaceEngine) throw new Error('No matching space engine found');

    const engine = await spaceEnginesToEngines([spaceEngine]);
    if (engine.length === 0) throw new Error("Engine couldn't be reached");
    forceEngine = engine[0];
  } else if (!_forceEngine && spaceEngines.status === 'fulfilled') {
    // If we don't want to force PROCEEDE engines use space engines if available
    let availableSpaceEngines = await spaceEnginesToEngines(spaceEngines.value);
    if (validatorFunc) {
      availableSpaceEngines = await asyncFilter(availableSpaceEngines, validatorFunc);
    }
    if (availableSpaceEngines.length > 0) engines = availableSpaceEngines;
  }

  return { forceEngine, engines };
}

export async function getAllDeployments(spaceId: string) {
  const { engines } = await getCorrectTargetEngines(spaceId);

  return await getDeployments(engines);
}

export async function deployProcess(
  definitionId: string,
  versionId: string,
  spaceId: string,
  method: 'static' | 'dynamic' = 'dynamic',
  _forceEngine?: SpaceEngine | 'PROCEED',
) {
  try {
    // TODO: manage permissions for deploying a process

    if (!enableUseDB) throw new Error('deployProcess only available with enableUseDB');

    const { forceEngine, engines } = await getCorrectTargetEngines(spaceId, _forceEngine);

    await _deployProcess(definitionId, versionId, spaceId, method, engines, forceEngine);
  } catch (e) {
    return userError('Something went wrong');
  }
}

export async function removeDeployment(definitionId: string, spaceId: string) {
  try {
    if (!enableUseDB) throw new Error('removeDeployment only available with enableUseDB');

    const { engines } = await getCorrectTargetEngines(
      spaceId,
      undefined,
      async (engine: Engine) => {
        const deployments = await getDeployments([engine]);

        return deployments.some((deployment) => deployment.definitionId === definitionId);
      },
    );

    await removeDeploymentFromMachines(engines, definitionId);
  } catch (e) {
    return userError('Something went wrong');
  }
}

export async function startInstance(
  definitionId: string,
  versionId: string,
  spaceId: string,
  variables: { [key: string]: any } = {},
) {
  try {
    // TODO: manage permissions for starting an instance

    if (!enableUseDB) throw new Error('startInstance is only available with enableUseDB');

    const { engines } = await getCorrectTargetEngines(
      spaceId,
      undefined,
      async (engine: Engine) => {
        const deployments = await getDeployments([engine]);

        // TODO: in case of static deployment we will need to only return the engines that are
        // assigned an entry point of the process
        return deployments.some(
          (deployment) =>
            deployment.definitionId === definitionId &&
            deployment.versions.some((version) => version.versionId === versionId),
        );
      },
    );

    if (engines.length === 0)
      return userError('Could not find an engine that the selected process could be started on.');

    // TODO: if there are multiple possible engines maybe try to find the one that fits the best
    // (e.g. the one with the least load)
    return await startInstanceOnMachine(definitionId, versionId, engines[0], variables);
  } catch (e) {
    return userError('Something went wrong');
  }
}

export async function resumeInstance(definitionId: string, instanceId: string, spaceId: string) {
  try {
    // TODO: manage permissions for starting an instance

    if (!enableUseDB) throw new Error('resumeInstance is only available with enableUseDB');

    const { engines } = await getCorrectTargetEngines(
      spaceId,
      undefined,
      async (engine: Engine) => {
        const deployments = await getDeployments([engine]);

        // TODO: check if the instance is paused on this machine
        return deployments.some(
          (deployment) =>
            deployment.definitionId === definitionId &&
            deployment.instances.some((instance) => instance.processInstanceId === instanceId),
        );
      },
    );

    if (engines.length === 0)
      return userError('Could not find an engine the instance is currently running on.');

    // TODO: if there are multiple possible engines maybe try to find the one that fits the best
    // (e.g. the one with the least load)
    await asyncForEach(engines, async (engine) => {
      resumeInstanceOnMachine(definitionId, instanceId, engine);
    });
  } catch (e) {
    return userError('Something went wrong');
  }
}

export async function pauseInstance(definitionId: string, instanceId: string, spaceId: string) {
  try {
    // TODO: manage permissions for starting an instance

    if (!enableUseDB) throw new Error('pauseInstance is only available with enableUseDB');

    const { engines } = await getCorrectTargetEngines(
      spaceId,
      undefined,
      async (engine: Engine) => {
        const deployments = await getDeployments([engine]);

        // TODO: check if the instance is running on this machine
        return deployments.some(
          (deployment) =>
            deployment.definitionId === definitionId &&
            deployment.instances.some((instance) => instance.processInstanceId === instanceId),
        );
      },
    );

    if (engines.length === 0)
      return userError('Could not find an engine the instance is currently running on.');

    // TODO: if there are multiple possible engines maybe try to find the one that fits the best
    // (e.g. the one with the least load)
    await asyncForEach(engines, async (engine) => {
      pauseInstanceOnMachine(definitionId, instanceId, engine);
    });
  } catch (e) {
    return userError('Something went wrong');
  }
}

export async function stopInstance(definitionId: string, instanceId: string, spaceId: string) {
  try {
    // TODO: manage permissions for starting an instance

    if (!enableUseDB) throw new Error('stopInstance is only available with enableUseDB');

    const { engines } = await getCorrectTargetEngines(
      spaceId,
      undefined,
      async (engine: Engine) => {
        const deployments = await getDeployments([engine]);

        // TODO: check if the instance is still running on this machine
        return deployments.some(
          (deployment) =>
            deployment.definitionId === definitionId &&
            deployment.instances.some((instance) => instance.processInstanceId === instanceId),
        );
      },
    );

    if (engines.length === 0)
      return userError('Could not find an engine the instance is currently running on.');

    // TODO: if there are multiple possible engines maybe try to find the one that fits the best
    // (e.g. the one with the least load)
    await asyncForEach(engines, async (engine) => {
      stopInstanceOnMachine(definitionId, instanceId, engine);
    });
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
