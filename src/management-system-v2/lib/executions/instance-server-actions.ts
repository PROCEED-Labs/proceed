'use server';

import { asyncForEach } from '@/lib/helpers/javascriptHelpers';
import { getCurrentUser } from '@/components/auth';
import { UserErrorType, getErrorMessage, isUserErrorResponse, userError } from '@/lib/user-error';

import { getAllAvailableEngines } from '@/lib/data/engines';

import {
  deployProcess as _deployProcess,
  getDeployment,
  changeDeploymentActivation as _changeDeploymentActivation,
} from '@/lib/engines/deployment';
import {
  getFileFromMachine,
  startInstanceOnMachine,
  updateVariablesOnMachine,
} from '@/lib/engines/instances';
import { Engine } from '../engines/types';
import { getProcessDeployments } from '../data/deployment';
import { addInstance, getInstance, updateInstance } from '../data/instance';

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
      const result = await startInstanceOnMachine(definitionId, versionId, engine, variables, {
        processInitiator: userId,
        spaceIdOfProcessInitiator: spaceId,
      });

      if (isUserErrorResponse(result)) continue;

      await addInstance(spaceId, {
        id: result.processInstanceId,
        deploymentId: deployment.id,
        engineIds: [engine.id],
        initiatorId: userId,
        state: result,
      });

      return result.processInstanceId;
    }
  }

  return userError('Failed to start an instance.');
}

export async function updateVariables(
  spaceId: string,
  definitionId: string,
  instanceId: string,
  variables: Record<string, any>,
) {
  try {
    const instance = await getInstance(spaceId, instanceId);
    if (isUserErrorResponse(instance)) return instance;
    if (!instance) {
      return userError('Could not find the instance to change.', UserErrorType.NotFoundError);
    }

    // find the engine the instance is running on
    let availableEngines = await getAllAvailableEngines(spaceId);
    if (isUserErrorResponse(availableEngines)) return availableEngines;
    availableEngines = availableEngines.filter((engine) => instance.engineIds.includes(engine.id));

    await asyncForEach(
      availableEngines,
      async (engine) => await updateVariablesOnMachine(definitionId, instanceId, engine, variables),
    );

    // TODO: try to get the engine to only return when the update has actually been applied to the
    // state instead of waiting an arbitrary amount of time
    await new Promise((res) => setTimeout(res, 1000));

    // TODO: handle that we need to merge data if the instance exists on multiple machines
    const newData = await getDeployment(availableEngines[0], definitionId);

    const newInstanceData = newData.instances.find((i) => i.processInstanceId === instanceId);

    await updateInstance(spaceId, instanceId, { state: newInstanceData });
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
  const instance = await getInstance(spaceId, instanceId);
  if (isUserErrorResponse(instance)) return instance;
  if (!instance) {
    return userError('Unknown Instance', UserErrorType.NotFoundError);
  }

  try {
    // find the engine the instance is running on
    let availableEngines = await getAllAvailableEngines(spaceId);
    if (isUserErrorResponse(availableEngines)) return availableEngines;
    availableEngines = availableEngines.filter((engine) => instance.engineIds.includes(engine.id));

    if (!availableEngines.length) {
      return userError('Failed to find the engine the instance is running on!');
    }

    const file = await getFileFromMachine(definitionId, instanceId, fileName, availableEngines[0]);

    return file;
  } catch (err) {
    const message = getErrorMessage(err);
    return userError(message);
  }
}
