'use server';

import { UserFacingError, getErrorMessage, userError } from '../user-error';
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

import { startInstanceOnMachine } from './instances';
import { asyncFilter, asyncMap } from '../helpers/javascriptHelpers';
import {
  completeTasklistEntryOnMachine,
  getTaskListFromMachine,
  getTasklistEntryHTMLFromMachine,
  setTasklistEntryVariableValuesOnMachine,
} from './tasklist';
import { truthyFilter } from '../typescript-utils';

async function getCorrectTargetEngines(
  spaceId: string,
  onlyProceedEngines = false,
  validatorFunc?: (engine: Engine) => Promise<boolean>,
) {
  const { ability } = await getCurrentEnvironment(spaceId);

  let engines: Engine[] = [];
  if (onlyProceedEngines) {
    // force that only proceed engines are supposed to be used
    engines = await getProceedEngines();
  } else {
    // use all available engines
    const [proceedEngines, spaceEngines] = await Promise.allSettled([
      getProceedEngines(),
      getSpaceEnginesFromDb(spaceId, ability),
    ]);

    if (proceedEngines.status === 'fulfilled') engines = proceedEngines.value;

    if (spaceEngines.status === 'fulfilled') {
      let availableSpaceEngines = await spaceEnginesToEngines(spaceEngines.value);
      engines = engines.concat(availableSpaceEngines);
    }
  }

  if (validatorFunc) engines = await asyncFilter(engines, validatorFunc);

  if (engines.length === 0) throw new UserFacingError('No fitting engine found.');

  return engines;
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

    let engines;
    if (_forceEngine && _forceEngine !== 'PROCEED') {
      // forcing a specific engine
      const { ability } = await getCurrentEnvironment(spaceId);
      const address =
        _forceEngine.type === 'http' ? _forceEngine.address : _forceEngine.brokerAddress;
      const spaceEngine = await getSpaceEngineByAddressFromDb(address, spaceId, ability);
      if (!spaceEngine) throw new Error('No matching space engine found');
      engines = await spaceEnginesToEngines([spaceEngine]);
      if (engines.length === 0) throw new Error("Engine couldn't be reached");
    } else {
      engines = await getCorrectTargetEngines(spaceId, _forceEngine === 'PROCEED');
    }

    await _deployProcess(definitionId, versionId, spaceId, method, engines);
  } catch (e) {
    const message = getErrorMessage(e);
    return userError(message);
  }
}

export async function removeDeployment(definitionId: string, spaceId: string) {
  try {
    if (!enableUseDB) throw new Error('removeDeployment only available with enableUseDB');

    const engines = await getCorrectTargetEngines(spaceId, false, async (engine: Engine) => {
      const deployments = await getDeployments([engine]);

      return deployments.some((deployment) => deployment.definitionId === definitionId);
    });

    await removeDeploymentFromMachines(engines, definitionId);
  } catch (e) {
    const message = getErrorMessage(e);
    return userError(message);
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

    const engines = await getCorrectTargetEngines(spaceId, false, async (engine: Engine) => {
      const deployments = await getDeployments([engine]);

      // TODO: in case of static deployment we will need to only return the engines that are
      // assigned an entry point of the process
      return deployments.some(
        (deployment) =>
          deployment.definitionId === definitionId &&
          deployment.versions.some((version) => version.versionId === versionId),
      );
    });

    if (engines.length === 0)
      return userError('Could not find an engine that the selected process could be started on.');

    // TODO: if there are multiple possible engines maybe try to find the one that fits the best
    // (e.g. the one with the least load)
    return await startInstanceOnMachine(definitionId, versionId, engines[0], variables);
  } catch (e) {
    const message = getErrorMessage(e);
    return userError(message);
  }
}

export async function getAvailableTaskListEntries(spaceId: string) {
  try {
    if (!enableUseDB)
      throw new Error('getAvailableTaskListEntries only available with enableUseDB');

    const engines = await getCorrectTargetEngines(spaceId);

    const results = (
      await asyncMap(engines, async (engine) => {
        try {
          return getTaskListFromMachine(engine);
        } catch (e) {
          return null;
        }
      })
    ).filter(truthyFilter);

    return results.flat();
  } catch (e) {
    const message = getErrorMessage(e);
    return userError(message);
  }
}

export async function getTasklistEntryHTML(
  spaceId: string,
  instanceId: string,
  userTaskId: string,
  startTime: number,
) {
  try {
    if (!enableUseDB)
      throw new Error('getAvailableTaskListEntries only available with enableUseDB');

    // find the engine the user task is running on
    const engines = await getCorrectTargetEngines(spaceId, false, async (engine) => {
      const deployments = await getDeployments([engine]);

      const instance = deployments
        .find((deployment) => deployment.instances.some((i) => i.processInstanceId === instanceId))
        ?.instances.find((i) => i.processInstanceId === instanceId);

      if (!instance) return false;

      const userTaskIsCurrentlyRunning = instance.tokens.some(
        (token) =>
          token.currentFlowElementId === userTaskId &&
          token.currentFlowElementStartTime === startTime,
      );

      const userTaskWasCompleted = instance.log.some(
        (entry) => entry.flowElementId === userTaskId && entry.startTime === startTime,
      );

      return userTaskIsCurrentlyRunning || userTaskWasCompleted;
    });

    if (!engines.length) throw new Error('Failed to find the engine the user task is running on!');

    return await getTasklistEntryHTMLFromMachine(engines[0], instanceId, userTaskId, startTime);
  } catch (e) {
    const message = getErrorMessage(e);
    return userError(message);
  }
}

export async function setTasklistEntryVariableValues(
  spaceId: string,
  instanceId: string,
  userTaskId: string,
  variables: { [key: string]: any },
) {
  try {
    if (!enableUseDB)
      throw new Error('getAvailableTaskListEntries only available with enableUseDB');

    // find the engine the user task is running on
    const engines = await getCorrectTargetEngines(spaceId, false, async (engine) => {
      const deployments = await getDeployments([engine]);

      const instance = deployments
        .find((deployment) => deployment.instances.some((i) => i.processInstanceId === instanceId))
        ?.instances.find((i) => i.processInstanceId === instanceId);

      if (!instance) return false;

      return instance.tokens.some((token) => token.currentFlowElementId === userTaskId);
    });

    if (!engines.length) throw new Error('Failed to find the engine the user task is running on!');

    await setTasklistEntryVariableValuesOnMachine(engines[0], instanceId, userTaskId, variables);
  } catch (e) {
    const message = getErrorMessage(e);
    return userError(message);
  }
}

export async function completeTasklistEntry(
  spaceId: string,
  instanceId: string,
  userTaskId: string,
  variables: { [key: string]: any },
) {
  try {
    if (!enableUseDB)
      throw new Error('getAvailableTaskListEntries only available with enableUseDB');

    // find the engine the user task is running on
    const engines = await getCorrectTargetEngines(spaceId, false, async (engine) => {
      const deployments = await getDeployments([engine]);

      const instance = deployments
        .find((deployment) => deployment.instances.some((i) => i.processInstanceId === instanceId))
        ?.instances.find((i) => i.processInstanceId === instanceId);

      if (!instance) return false;

      return instance.tokens.some((token) => token.currentFlowElementId === userTaskId);
    });

    if (!engines.length) throw new Error('Failed to find the engine the user task is running on!');

    await completeTasklistEntryOnMachine(engines[0], instanceId, userTaskId, variables);
  } catch (e) {
    const message = getErrorMessage(e);
    return userError(message);
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
    const message = getErrorMessage(e);
    return userError(message);
  }
}
