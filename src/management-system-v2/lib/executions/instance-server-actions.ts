'use server';

import { asyncFilter, asyncForEach } from '@/lib/helpers/javascriptHelpers';
import { getCurrentEnvironment, getCurrentUser } from '@/components/auth';
import { UserFacingError, getErrorMessage, isUserErrorResponse, userError } from '@/lib/user-error';

import { getAllAvailableEngines } from '@/lib/data/engines';

import {
  deployProcess as _deployProcess,
  getDeployments as fetchDeployments,
  changeDeploymentActivation as _changeDeploymentActivation,
} from '@/lib/engines/deployment';
import {
  getFileFromMachine,
  startInstanceOnMachine,
  updateVariablesOnMachine,
} from '@/lib/engines/instances';
import { Engine } from '../engines/types';
import { getProcessDeployments } from '../data/deployment';

export async function startInstance(
  spaceId: string,
  definitionId: string,
  versionId: string,
  variables: { [key: string]: any } = {},
) {
  const engines = await getAllAvailableEngines(spaceId);
  if (isUserErrorResponse(engines)) return engines;

  const engineMap = engines.reduce(
    (acc, curr) => {
      acc[curr.id] = curr;
      return acc;
    },
    {} as Record<string, Engine>,
  );

  const deployments = await getProcessDeployments(spaceId, definitionId);
  if (isUserErrorResponse(deployments)) return deployments;

  const { userId } = await getCurrentUser();

  const versionDeployments = deployments.filter((d) => {
    return d.versionId === versionId;
  });

  // TODO: automatically deploy the version if possible
  if (!versionDeployments.length) return userError('This process version is not deployed.');

  for (const deployment of deployments) {
    const engine = engineMap[deployment.engineId];

    if (engine) {
      return await startInstanceOnMachine(definitionId, versionId, engine, variables, {
        processInitiator: userId,
        spaceIdOfProcessInitiator: spaceId,
      });
    }
  }

  return userError('Failed to start the instance.');
}

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
