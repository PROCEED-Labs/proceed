'use server';

import { asyncForEach, asyncMap } from '@/lib/helpers/javascriptHelpers';
import { getCurrentEnvironment, getCurrentUser } from '@/components/auth';
import { UserErrorType, getErrorMessage, isUserErrorResponse, userError } from '@/lib/user-error';

import { getAllAvailableEngines } from '@/lib/data/engines';

import {
  deployProcess as _deployProcess,
  getDeployment,
  changeDeploymentActivation as _changeDeploymentActivation,
  InstanceInfo,
} from '@/lib/engines/deployment';
import {
  getFileFromMachine,
  startInstanceOnMachine,
  pauseInstanceOnMachine,
  resumeInstanceOnMachine,
  stopInstanceOnMachine,
  updateVariablesOnMachine,
} from '@/lib/engines/instances';
import { Engine } from '../engines/types';
import { getProcessDeployments } from '../data/deployment';
import { addInstance, getInstance, updateInstance } from '@/lib/data/instance';
import { getProcessBPMN, getProcessHtmlFormHTML } from '@/lib/data/processes';
import { getStartFormFileNameMapping } from '@proceed/bpmn-helper';
import { truthyFilter } from '@/lib/typescript-utils';

export async function getProcessStartForm(
  spaceId: string,
  definitionId: string,
  versionId: string,
) {
  try {
    const bpmn = await getProcessBPMN(definitionId, spaceId, versionId);
    const [startForm] = Object.values(await getStartFormFileNameMapping(bpmn)).filter(truthyFilter);
    if (!startForm) return '';

    return getProcessHtmlFormHTML(definitionId, startForm, spaceId);
  } catch (e) {
    const message = getErrorMessage(e);
    return userError(message);
  }
}

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

const activeStates = ['PAUSED', 'RUNNING', 'READY', 'DEPLOYMENT-WAITING', 'WAITING'];
async function changeInstanceState(
  spaceId: string,
  definitionId: string,
  instanceId: string,
  stateValidator: (state: InstanceInfo['instanceState']) => boolean,
  stateChangeFunction: typeof resumeInstanceOnMachine,
) {
  const { ability } = await getCurrentEnvironment(spaceId);

  if (!ability.can('update', 'Execution')) {
    return userError('Invalid Permissions', UserErrorType.PermissionError);
  }

  const instance = await getInstance(spaceId, instanceId);

  if (isUserErrorResponse(instance)) return instance;
  if (!instance) return userError('Unknown instance!', UserErrorType.NotFoundError);

  if (!instance.engineIds.length) return userError('The instance is not being executed anymore.');

  try {
    // TODO: how do we handle this correctly if some engines are reachable but others aren't?
    const engines = await getAllAvailableEngines(spaceId);
    if (isUserErrorResponse(engines)) return engines;
    const engineMap = engines.reduce(
      (acc, curr) => {
        acc[curr.id] = curr;
        return acc;
      },
      {} as Record<string, Engine>,
    );

    let instanceMachinesToChange = await asyncMap(instance.engineIds, async (id) => {
      const machine = engineMap[id];
      if (!machine) return false;

      try {
        const deployment = await getDeployment(machine, definitionId);

        const instance = deployment.instances.find(
          (instance) => instance.processInstanceId === instanceId,
        );

        if (!instance) return 'Instance not found';

        const hasState = !stateValidator(instance.instanceState);

        if (hasState) return false;

        return machine;
      } catch (err) {
        return false;
      }
    });
    instanceMachinesToChange = instanceMachinesToChange.filter((res) => !!res);

    if (instanceMachinesToChange.some((res) => typeof res === 'string')) {
      return userError('Instance information was lost from one of the executing engines.');
    }

    await asyncForEach(instanceMachinesToChange as Engine[], async (machine) => {
      await stateChangeFunction(definitionId, instanceId, machine);

      // TODO: handle this better (the engine should only return after the state change has
      // completed
      await new Promise((res) => setTimeout(res, 1000));
      // TODO: actually handle that the instance might exist on multiple engines
      const newDeploymentData = await getDeployment(machine, definitionId);
      const newInstanceData = newDeploymentData.instances.find(
        (instance) => instance.processInstanceId === instanceId,
      );
      await updateInstance(spaceId, instanceId, { state: newInstanceData });
    });
  } catch (e) {
    const message = getErrorMessage(e);
    return userError(message);
  }
}

export async function resumeInstance(spaceId: string, definitionId: string, instanceId: string) {
  return await changeInstanceState(
    spaceId,
    definitionId,
    instanceId,
    (tokenStates) => tokenStates.some((tokenState) => tokenState === 'PAUSED'),
    resumeInstanceOnMachine,
  );
}

export async function pauseInstance(spaceId: string, definitionId: string, instanceId: string) {
  return await changeInstanceState(
    spaceId,
    definitionId,
    instanceId,
    (tokenStates) =>
      tokenStates.some((state) => activeStates.includes(state) && state !== 'PAUSED'),
    pauseInstanceOnMachine,
  );
}

export async function stopInstance(spaceId: string, definitionId: string, instanceId: string) {
  return await changeInstanceState(
    spaceId,
    definitionId,
    instanceId,
    (tokenStates) => tokenStates.some((state) => activeStates.includes(state)),
    stopInstanceOnMachine,
  );
}
