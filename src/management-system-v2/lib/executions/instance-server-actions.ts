'use server';

import db from '@/lib/data/db';

import { asyncForEach, asyncMap } from '@/lib/helpers/javascriptHelpers';
import { getCurrentEnvironment, getCurrentUser } from '@/components/auth';
import {
  UserError,
  UserErrorType,
  getErrorMessage,
  isUserErrorResponse,
  permissionDenied,
  userError,
} from '@/lib/user-error';

import {
  deployProcess as _deployProcess,
  getDeployment,
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
import { getDBInstance, getInstance, updateInstance } from '@/lib/data/instance';
import { getProcessBPMN, getProcessHtmlFormHTML } from '@/lib/data/processes';
import {
  getDefinitionsInfos,
  getElementById,
  getStartFormFileNameMapping,
  toBpmnObject,
} from '@proceed/bpmn-helper';
import { truthyFilter } from '@/lib/typescript-utils';
import { getInstanceFile, saveInstanceArtifact } from '../data/file-manager-facade';
import { getProcessVersion } from '../data/db/process';
import Ability from '../ability/abilityHelper';
import { revalidateTag, updateTag } from 'next/cache';
import { deployProcess } from './deployment-server-actions';

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
  // defines if the request was made in the context of a browser session
  // this allows us to use "updateTag" to instantly invalidate the cached instance data
  isBrowserRequest = false,
  ability?: Ability,
  userId?: string,
) {
  if (!ability) ({ ability } = await getCurrentEnvironment(spaceId));

  if (!ability.can('create', 'Execution'))
    return userError('Invalid Permissions', UserErrorType.PermissionError);

  let deployments: { id: string; versionId: string; engine: Engine }[] | { error: UserError } =
    await getProcessDeployments(spaceId, definitionId, ability);
  if (isUserErrorResponse(deployments)) return deployments;

  if (!userId) ({ userId } = await getCurrentUser());

  const versionDeployments = deployments.filter((d) => {
    return d.versionId === versionId;
  });

  if (!versionDeployments.length) {
    const res = await deployProcess(
      definitionId,
      versionId,
      spaceId,
      'dynamic',
      undefined,
      isBrowserRequest,
      ability,
      userId,
    );

    if (isUserErrorResponse(res)) return res;

    if (!res) return userError('Failed to start an instance');

    deployments = res.map((d) => ({ ...d }));
  }

  for (const deployment of deployments) {
    const { engine } = deployment;

    if (engine.connections.some((c) => c.reachable)) {
      const result = await startInstanceOnMachine(definitionId, versionId, engine, variables, {
        processInstanceInitiator: userId,
        processInstanceInitiatorSpaceId: spaceId,
      });

      if (isUserErrorResponse(result)) continue;

      await db.processInstance.create({
        data: {
          id: result.processInstanceId,
          deploymentId: deployment.id,
          initiatorId: userId,
          state: result,
          logs: [],
          engines: {
            connect: { id: engine.id },
          },
        },
      });

      if (isBrowserRequest) {
        updateTag(`space/${spaceId}/instances`);
        updateTag(`deployments/process/${definitionId}`);
      } else {
        revalidateTag(`space/${spaceId}/instances`, 'max');
        revalidateTag(`deployments/process/${definitionId}`, 'max');
      }

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
    const { ability } = await getCurrentEnvironment(spaceId);

    if (!ability.can('update', 'Execution')) {
      return permissionDenied();
    }

    const instance = await getDBInstance(spaceId, instanceId);
    if (isUserErrorResponse(instance)) return instance;
    if (!instance) {
      return userError('Could not find the instance to change.', UserErrorType.NotFoundError);
    }

    await asyncForEach(
      instance.engines,
      async (engine) => await updateVariablesOnMachine(definitionId, instanceId, engine, variables),
    );

    // TODO: try to get the engine to only return when the update has actually been applied to the
    // state instead of waiting an arbitrary amount of time
    await new Promise((res) => setTimeout(res, 1000));

    // TODO: handle that we need to merge data if the instance exists on multiple machines
    const newData = await getDeployment(instance.engines[0], definitionId);

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
    return permissionDenied();
  }

  const instance = await getDBInstance(spaceId, instanceId);
  if (isUserErrorResponse(instance)) return instance;
  if (!instance) {
    return userError('Unknown Instance', UserErrorType.NotFoundError);
  }

  const savedFile = await getInstanceFile(instanceId, fileName);
  if (savedFile) return savedFile;

  try {
    const file = await getFileFromMachine(definitionId, instanceId, fileName, instance.engines[0]);

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

  const instance = await getDBInstance(spaceId, instanceId);

  if (isUserErrorResponse(instance)) return instance;
  if (!instance) return userError('Unknown instance!', UserErrorType.NotFoundError);

  if (!instance.engines.length) return userError('The instance is not being executed anymore.');

  try {
    let instanceEnginesToChange = await asyncMap(instance.engines, async (engine) => {
      try {
        const deployment = await getDeployment(engine, definitionId);

        const instance = deployment.instances.find(
          (instance) => instance.processInstanceId === instanceId,
        );

        if (!instance) return 'Instance not found';

        const hasState = !stateValidator(instance.instanceState);

        if (hasState) return false;

        return engine;
      } catch (err) {
        return false;
      }
    });
    instanceEnginesToChange = instanceEnginesToChange.filter((res) => !!res);

    if (instanceEnginesToChange.some((res) => typeof res === 'string')) {
      return userError('Instance information was lost from one of the executing engines.');
    }

    await asyncForEach(instanceEnginesToChange as Engine[], async (engine) => {
      await stateChangeFunction(definitionId, instanceId, engine);

      // TODO: handle this better (the engine should only return after the state change has
      // completed
      await new Promise((res) => setTimeout(res, 1000));
      // TODO: actually handle that the instance might exist on multiple engines
      const newDeploymentData = await getDeployment(engine, definitionId);
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

type VersionCache = Record<
  string,
  {
    versionName: string;
    versionDescription: string;
    basedOnVersion?: string;
    createdOn: number;
    bpmnObj: any;
  }
>;

export async function exportInstanceCSV(
  spaceId: string,
  instanceId: string,
  versionCache: VersionCache,
) {
  const instance = await getInstance(spaceId, instanceId);

  if (!instance || isUserErrorResponse(instance)) return undefined;

  if (!versionCache[instance.versionId]) {
    const versionBpmn = await getProcessBPMN(instance.state.processId, spaceId, instance.versionId);
    if (isUserErrorResponse(versionBpmn)) return undefined;
    const version = await getProcessVersion(instance.state.processId, instance.versionId);
    if (!version) return undefined;
    const bpmnObj = await toBpmnObject(versionBpmn);
    versionCache[instance.versionId] = {
      versionName: version.name,
      versionDescription: version.description,
      basedOnVersion: version.versionBasedOn || undefined,
      createdOn: version.createdOn.getTime(),
      bpmnObj,
    };
  }

  const correspondingVersion = versionCache[instance.versionId];
  const { bpmnObj } = correspondingVersion;
  const definitionInfos = await getDefinitionsInfos(bpmnObj);

  const { initiator } = instance;
  let initiatorInfo = {
    ProcessInstanceInitiatorId: '',
    ProcessInstanceInitiatorFullName: 'Unknown',
    ProcessInstanceInitiatorUsername: 'Unknown',
  };
  if (initiator) {
    if (typeof initiator === 'string') {
      initiatorInfo.ProcessInstanceInitiatorId =
        initiatorInfo.ProcessInstanceInitiatorUsername =
        initiatorInfo.ProcessInstanceInitiatorFullName =
          initiator;
    } else {
      initiatorInfo.ProcessInstanceInitiatorId = initiator.id;
      initiatorInfo.ProcessInstanceInitiatorFullName = initiator.fullName;
      initiatorInfo.ProcessInstanceInitiatorUsername = initiator.username || '';
    }
  }

  const initiatorSpace = instance.state.spaceOfProcessInstanceInitiator;

  return {
    ...instance.state,
    ProcessName: definitionInfos.name,
    ProcessShortName: definitionInfos.userDefinedId,
    ProcessVersionName: correspondingVersion.versionName,
    ProcessVersionDescription: correspondingVersion.versionDescription,
    ProcessVersionCreatedOn: new Date(correspondingVersion.createdOn).getTime(),
    ProcessVersionBasedOn: correspondingVersion.basedOnVersion,
    ...initiatorInfo,
    ProcessInstanceInitiatorSpaceName: initiatorSpace?.name || 'Unknown',
    ProcessEngineId: instance.state.log[0].machine.id,
    correspondingVersion,
  };
}

export async function exportInstanceData(
  spaceId: string,
  definitionId: string,
  instanceId?: string,
) {
  const objectOrderTemplate = {
    ProcessId: null,
    ProcessName: null,
    ProcessShortName: null,
    ProcessVersionId: null,
    ProcessVersionName: null,
    ProcessVersionDescription: null,
    ProcessVersionCreatedOn: null,
    ProcessVersionBasedOn: null,
    ProcessInstanceId: null,
    ProcessInstanceInitiatorId: null,
    ProcessInstanceInitiatorFullName: null,
    ProcessInstanceInitiatorUsername: null,
    ProcessInstanceInitiatorSpaceId: null,
    ProcessInstanceInitiatorSpaceName: null,
    InstanceStartTime: null,
    ProcessStepId: null,
    ProcessStepName: null,
    ProcessStepType: null,
    ProcessStepStatus: null,
    ProcessStepStartTime: null,
    ProcessStepEndTime: null,
    PreviousProcessStepId: null,
    ProcessStepTokenId: null,
    ActualPerformerId: null,
    ActualPerformerName: null,
    ActualPerformerUsername: null,
    ProcessEngineId: null,
    ProcessEngineName: null, //tofind
    Log: null,
  };

  let selectedInstances;
  if (instanceId) {
    selectedInstances = [instanceId];
  } else {
    const processDeployments = await getProcessDeployments(spaceId, definitionId);
    if (isUserErrorResponse(processDeployments)) return processDeployments;
    selectedInstances = processDeployments.flatMap((d) => d.instances);
  }

  const versionCache: VersionCache = {};

  // pasting metadata from VersionInfo
  const instancesWithVersionData = (
    await asyncMap(selectedInstances, async (instanceId) =>
      exportInstanceCSV(spaceId, instanceId, versionCache),
    )
  ).filter(truthyFilter);

  // retrieve and flatten event data
  const instanceEvents = (
    await asyncMap(instancesWithVersionData, async (instance) => {
      const { bpmnObj } = versionCache[instance.processVersion];

      return instance
        ? instance.log.map((eventEntry) => {
            const eventElement = getElementById(bpmnObj, eventEntry.flowElementId) as {
              $type?: string;
              name?: string;
              outgoing?: any;
              incoming?: any;
            };
            const ActualPerformer = eventEntry.actualOwner?.[0];
            return {
              ...instance,
              ...eventEntry,
              ProcessStepName: eventElement?.name,
              ProcessStepType: eventElement?.$type?.split(':')[1],
              ActualPerformerId: ActualPerformer?.id,
              ActualPerformerName: ActualPerformer?.fullName,
              ActualPerformerUsername: ActualPerformer?.username,
              Log: JSON.stringify(eventEntry.variableChanges),
              PreviousProcessStepId: eventElement.incoming?.map((flow: any) => flow.sourceRef.id),
            };
          })
        : [];
    })
  ).flat();

  // renaming
  const keyMap: Record<string, string> = {
    processId: 'ProcessId',
    processVersion: 'ProcessVersionId',
    processInstanceId: 'ProcessInstanceId',
    processInstanceInitiatorSpaceId: 'ProcessInstanceInitiatorSpaceId',
    globalStartTime: 'InstanceStartTime',
    flowElementId: 'ProcessStepId',
    executionState: 'ProcessStepStatus',
    startTime: 'ProcessStepStartTime',
    endTime: 'ProcessStepEndTime',
    tokenId: 'ProcessStepTokenId',
  };

  const renamedInstanceEvents: Record<string, any>[] = instanceEvents.map((instance) =>
    Object.fromEntries(Object.entries(instance).map(([k, v]) => [keyMap[k] ?? k, v])),
  );

  // converting dates
  const datedInstanceEvents = renamedInstanceEvents.map((instance) => ({
    ...instance,
    InstanceStartTime: new Date(instance.InstanceStartTime).toISOString(),
    ProcessStepEndTime: new Date(instance.ProcessStepEndTime).toISOString(),
    ProcessStepStartTime: new Date(instance.ProcessStepStartTime).toISOString(),
    ProcessVersionCreatedOn: new Date(instance.ProcessVersionCreatedOn).toISOString(),
  }));

  // reordering
  const structuredInstanceEvents = datedInstanceEvents.map((instance) =>
    Object.entries(instance).reduce(
      (acc, [key, value]) => {
        if (key in acc) {
          acc[key] = value;
        }
        return acc;
      },
      { ...objectOrderTemplate } as Record<string, any>,
    ),
  );

  return structuredInstanceEvents;
}
