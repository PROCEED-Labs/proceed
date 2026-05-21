'use server';

import { asyncFilter, asyncForEach } from '@/lib/helpers/javascriptHelpers';
import { getCurrentEnvironment } from '@/components/auth';
import { UserFacingError, getErrorMessage, isUserErrorResponse, userError } from '@/lib/user-error';

import { getAllAvailableEngines } from '@/lib/data/engines';

import {
  deployProcess as _deployProcess,
  getDeployments as fetchDeployments,
  changeDeploymentActivation as _changeDeploymentActivation,
} from '@/lib/engines/deployment';
import { getFileFromMachine, updateVariablesOnMachine } from '@/lib/engines/instances';

export async function updateVariables(
  spaceId: string,
  definitionId: string,
  instanceId: string,
  variables: Record<string, any>,
) {
  try {
    // find the engine the instance is running on
    const availableEngines = await getAllAvailableEngines(spaceId);
    if (isUserErrorResponse(availableEngines)) return availableEngines;
    const engines = await asyncFilter(availableEngines, async (engine) => {
      const deployments = await fetchDeployments([engine]);

      return deployments.some((deployment) =>
        deployment.instances.some((i) => i.processInstanceId === instanceId),
      );
    });

    await asyncForEach(
      engines,
      async (engine) => await updateVariablesOnMachine(definitionId, instanceId, engine, variables),
    );
  } catch (err) {
    const message = getErrorMessage(err);
    return userError(message);
  }
}

export async function getFile(
  spaceId: string,
  definitionId: string,
  instanceId: string,
  fileName: string,
) {
  const { ability } = await getCurrentEnvironment(spaceId);

  try {
    // find the engine the instance is running on
    const availableEngines = await getAllAvailableEngines(spaceId);
    if (isUserErrorResponse(availableEngines)) return availableEngines;
    let engines = await asyncFilter(availableEngines, async (engine) => {
      const deployments = await fetchDeployments([engine]);

      return deployments.some((deployment) =>
        deployment.instances.some((i) => i.processInstanceId === instanceId),
      );
    });

    engines = ability ? ability.filter('view', 'Machine', engines) : engines;

    if (!engines.length) {
      throw new UserFacingError('Failed to find the engine the instance is running on!');
    }

    return await getFileFromMachine(definitionId, instanceId, fileName, engines[0]);
  } catch (err) {
    const message = getErrorMessage(err);
    return userError(message);
  }
}
