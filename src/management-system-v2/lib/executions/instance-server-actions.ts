'use server';

import { getStartFormFileNameMapping } from '@proceed/bpmn-helper';
import {
  getProcessBPMN,
  getProcessHtmlFormHTML,
  getProcessImage as getStoredProcessImage,
} from '../data/processes';
import { truthyFilter } from '../typescript-utils';
import {
  UserErrorType,
  UserFacingError,
  getErrorMessage,
  isUserErrorResponse,
  userError,
} from '../user-error';
import { getCurrentEnvironment, getCurrentUser } from '@/components/auth';
import { getAllAvailableMachines } from '../data/engines';
import { getProcessDeployments } from '../data/deployment';
import {
  getFileFromMachine,
  pauseInstanceOnMachine,
  resumeInstanceOnMachine,
  startInstanceOnMachine,
  stopInstanceOnMachine,
  updateVariablesOnMachine,
} from '../engines/instances';

import {
  getDeployment as fetchDeployment,
  getProcessImageFromMachine,
  InstanceInfo,
} from '../engines/deployment';
import { updateInstance, addInstance, getInstance as getStoredInstance } from '../data/instance';
import { AsyncArray, asyncForEach, asyncMap } from '../helpers/javascriptHelpers';
import { Engine } from '../engines/machines';
import { getInstanceFile, saveInstanceArtifact } from '../data/file-manager-facade';

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
  const { ability } = await getCurrentEnvironment(spaceId);

  if (!ability.can('create', 'Execution')) {
    return userError('Invalid Permissions', UserErrorType.PermissionError);
  }

  const machines = await getAllAvailableMachines(spaceId);
  const machineMap = machines.reduce(
    (acc, curr) => {
      acc[curr.id] = curr;
      return acc;
    },
    {} as Record<string, Engine>,
  );
  const deployments = await getProcessDeployments(spaceId, definitionId);
  const { userId } = await getCurrentUser();

  if (isUserErrorResponse(deployments)) return deployments;

  const versionDeployments = deployments.filter((d) => {
    return d.versionId === versionId && d.machineIds.some((id) => !!machineMap[id]);
  });

  // TODO: automatically deploy the version if possible
  if (!versionDeployments.length) return userError('This process version is not deployed.');

  for (const deployment of deployments) {
    const availableMachines = deployment.machineIds.map((id) => machineMap[id]).filter((m) => !!m);

    for (const machine of availableMachines) {
      // TODO: maybe have the engine return the complete instance information instead of just the id on
      // instance creation
      const result = await startInstanceOnMachine(definitionId, versionId, machine, variables, {
        processInitiator: userId,
        spaceIdOfProcessInitiator: spaceId,
      });

      if (isUserErrorResponse(result)) continue;

      const engineDeploymentInfo = await fetchDeployment(machine, definitionId);
      const instance = engineDeploymentInfo.instances.find((i) => i.processInstanceId === result);

      if (!instance) return userError('Failed to fetch the newly created instance');

      await addInstance(spaceId, {
        id: result,
        versionId,
        deploymentId: versionDeployments[0].id,
        machineIds: [machine.id],
        initiatorId: userId,
        state: instance,
      });

      return result;
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
    const { ability } = await getCurrentEnvironment(spaceId);

    if (!ability.can('update', 'Execution')) {
      return userError('Invalid Permissions', UserErrorType.PermissionError);
    }

    const instance = await getStoredInstance(spaceId, instanceId);

    if (isUserErrorResponse(instance)) return instance;

    if (!instance) return userError('Could not find the instance to change.');

    // find the engine the instance is running on
    const engines = await AsyncArray.from(getAllAvailableMachines(spaceId)).filter((engine) => {
      return instance.machineIds.includes(engine.id);
    });

    if (!engines.length) return userError('Could not reach the engines the instance is running on');

    await asyncForEach(
      engines,
      async (engine) => await updateVariablesOnMachine(definitionId, instanceId, engine, variables),
    );

    await new Promise((res) => setTimeout(res, 1000));

    // TODO: handle that we need to merge data if the instance exists on multiple machines
    const newData = await fetchDeployment(engines[0], definitionId, 'instances');

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
  const { ability } = await getCurrentEnvironment(spaceId);

  if (!ability.can('view', 'Execution')) {
    return userError('Invalid Permissions', UserErrorType.PermissionError);
  }

  const instance = await getStoredInstance(spaceId, instanceId);

  if (isUserErrorResponse(instance)) return instance;

  if (!instance) {
    throw new UserFacingError('Unknown instance.');
  }

  const savedFile = await getInstanceFile(instanceId, fileName);
  if (savedFile) {
    return savedFile;
  }

  try {
    // find the engine the instance is running on
    const engines = await AsyncArray.from(getAllAvailableMachines(spaceId)).filter((engine) => {
      return instance.machineIds.includes(engine.id);
    });

    if (!engines.length) {
      throw new UserFacingError('Failed to find the engine the instance is running on!');
    }

    const file = await getFileFromMachine(definitionId, instanceId, fileName, engines[0]);

    try {
      const res = await saveInstanceArtifact(
        spaceId,
        instanceId,
        fileName,
        file.type,
        Buffer.from(await file.arrayBuffer()),
      );

      if (res.presignedUrl) {
        // TODO: handle cloud storage case
      }
    } catch (err) {
      console.error(`Failed to cache instance file ${fileName}.`);
    }

    return file;
  } catch (err) {
    const message = getErrorMessage(err);
    return userError(message);
  }
}

export async function getProcessImage(spaceId: string, instanceId: string, fileName: string) {
  try {
    const { ability } = await getCurrentEnvironment(spaceId);

    if (!ability.can('view', 'Execution')) {
      return userError('Invalid Permissions', UserErrorType.PermissionError);
    }

    const instance = await getStoredInstance(spaceId, instanceId);
    if (isUserErrorResponse(instance)) return instance;
    if (!instance) return userError('Unknown instance');

    // try to get the image locally
    const image = await getStoredProcessImage(instance.state.processId, fileName, spaceId);

    if (!isUserErrorResponse(image)) {
      return new Blob([image]);
    }

    // if the image is not found locally try to get it from the engines that are executing the
    // process
    const engines = await AsyncArray.from(getAllAvailableMachines(spaceId)).filter((engine) => {
      return instance.machineIds.includes(engine.id);
    });

    if (!engines.length) throw new Error('Failed to get an engine the process was deployed to!');

    return await getProcessImageFromMachine(engines[0], instance.state.processId, fileName);
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

  const instance = await getStoredInstance(spaceId, instanceId);

  if (isUserErrorResponse(instance)) return instance;
  if (!instance) return userError('Unknown instance!', UserErrorType.NotFoundError);

  if (!instance.machineIds.length) return userError('The instance is not being executed anymore.');

  try {
    // TODO: how do we handle this correctly if some engines are reachable but others aren't?
    const machines = await getAllAvailableMachines(spaceId);
    const machineMap = machines.reduce(
      (acc, curr) => {
        acc[curr.id] = curr;
        return acc;
      },
      {} as Record<string, Engine>,
    );

    const instanceMachines = await asyncMap(instance.machineIds, async (id) => {
      const machine = machineMap[id];
      if (!machine) return false;

      try {
        const deployment = await fetchDeployment(machine, definitionId);

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
    }).filter((res) => !!res);

    console.log(instanceMachines);
    if (instanceMachines.some((res) => typeof res === 'string')) {
      return userError('Instance information was lost from one of the executing engines.');
    }

    await asyncForEach(instanceMachines as Engine[], async (machine) => {
      await stateChangeFunction(definitionId, instanceId, machine);

      // TODO: handle this better (the engine should only return after the state change has
      // completed
      await new Promise((res) => setTimeout(res, 1000));
      // TODO: actually handle that the instance might exist on multiple engines
      const newDeploymentData = await fetchDeployment(machine, definitionId);
      const newInstanceData = newDeploymentData.instances.find(
        (instance) => instance.processInstanceId === instanceId,
      );
      await updateInstance(spaceId, instanceId, { state: newInstanceData });
    });
  } catch (e) {
    console.log(e);
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
