import { getEnv, getUser } from '@/lib/data/db/machine-config';
import { DeployedProcessInfo, InstanceInfo, VersionInfo } from '@/lib/engines/deployment';
import { asyncMap } from '@/lib/helpers/javascriptHelpers';
import { truthyFilter } from '@/lib/typescript-utils';
import { getDefinitionsInfos, getDefinitionsName, toBpmnObject } from '@proceed/bpmn-helper';
import { convertISODurationToMiliseconds } from '@proceed/bpmn-helper/src/getters';
import type { ElementLike } from 'diagram-js/lib/core/Types';
import jsonToCsvExport from 'json-to-csv-export';

export type ElementStatus =
  | 'PAUSED'
  | 'DEPLOYMENT_WAITING'
  | 'READY'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FORWARDED'
  | 'ENDED'
  | 'ABORTED'
  | 'ERROR-SEMANTIC'
  | 'ERROR-TECHNICAL'
  | 'ERROR-INTERRUPTED'
  | 'ERROR-CONSTRAINT-UNFULFILLED'
  | 'STOPPED';

export function statusToType(status: string) {
  switch (status) {
    case 'PAUSED':
    case 'DEPLOYMENT_WAITING':
      return 'warning';
    case 'READY':
    case 'RUNNING':
    case 'COMPLETED':
    case 'FORWARDED':
    case 'ENDED':
      return 'success';
    case 'ABORTED':
    case 'ERROR-INTERRUPTED':
    case 'ERROR-CONSTRAINT-UNFULFILLED':
    case 'STOPPED':
      return 'error';
    default:
      return 'info';
  }
}

export function getTimeInfo({
  element,
  logInfo,
  token,
  instance,
}: {
  element: ElementLike;
  /** Log entry for element in instance information */
  logInfo?: InstanceInfo['log'][number];
  /** Token where currentFlowElementId is the element   */
  token?: InstanceInfo['tokens'][number];
  instance?: InstanceInfo;
}) {
  if (!instance) return { start: undefined, end: undefined, duration: undefined };

  const isRootElement = element && element.type === 'bpmn:Process';

  let start: Date | undefined = undefined;
  if (isRootElement) start = new Date(instance.globalStartTime);
  else if (logInfo) start = new Date(logInfo.startTime);
  else if (token) start = new Date(token.currentFlowElementStartTime);

  let end;
  if (isRootElement) {
    const ended = instance.instanceState.every(
      (state) =>
        state !== 'RUNNING' &&
        state !== 'READY' &&
        state !== 'DEPLOYMENT-WAITING' &&
        state !== 'PAUSING' &&
        state !== 'PAUSED',
    );

    if (ended) {
      const lastLog = instance.log[instance.log.length - 1];
      if (lastLog) end = new Date(lastLog.endTime);
    }
  } else if (logInfo) {
    end = new Date(logInfo.endTime);
  }

  let duration: number | undefined;
  if (start && end) duration = end.getTime() - start.getTime();

  return { start, end, duration };
}

export function getPlanDelays({
  elementMetaData,
  start,
  end,
  duration,
}: {
  elementMetaData: {
    [key: string]: any;
  };

  start?: Date;
  end?: Date;
  duration?: number;
}) {
  const plan = {
    end: elementMetaData.timePlannedEnd ? new Date(elementMetaData.timePlannedEnd) : undefined,
    start: elementMetaData.timePlannedOccurrence
      ? new Date(elementMetaData.timePlannedOccurrence)
      : undefined,
    duration: elementMetaData.timePlannedDuration
      ? convertISODurationToMiliseconds(elementMetaData.timePlannedDuration)
      : undefined,
  };

  // The order in which missing times are derived from the others is irrelevant
  // If there is only one -> not possible to derive the others
  // If there are two -> derive the missing one (order doesn't matter)
  // If there are three -> nothing to do

  if (!plan.end && plan.start && plan.duration)
    plan.end = new Date(plan.start.getTime() + plan.duration);

  if (!plan.start && plan.end && plan.duration)
    plan.start = new Date(plan.end.getTime() - plan.duration);

  if (!plan.duration && plan.start && plan.end)
    plan.duration = plan.end.getTime() - plan.start.getTime();

  const delays = {
    start: plan.start && start && start.getTime() - plan.start.getTime(),
    end: plan.end && end && end.getTime() - plan.end.getTime(),
    duration: plan.duration && duration && duration - plan.duration,
  };

  return { plan, delays };
}

export function getVersionInstances(process: DeployedProcessInfo, version?: string) {
  const instances = process.instances;

  if (!version) return instances;
  return instances.filter((instance) => instance.processVersion === version);
}

export function getLatestDeployment(process: DeployedProcessInfo) {
  let latest = process.versions.length - 1;
  for (let i = process.versions.length - 2; i >= 0; i--) {
    // TODO: this is actually the last version that was deployed since there is no version creation
    // information stored on the engine (do we keep this, store the creation time on the engine or
    // parse the creation time from the bpmn?)
    if (process.versions[i].deploymentDate > process.versions[latest].deploymentDate) latest = i;
  }

  return process.versions[latest];
}

export function getYoungestInstance<T extends InstanceInfo[]>(instances: T) {
  if (instances.length === 0) return undefined;

  let firstInstance = 0;
  for (let i = 0; i < instances.length; i++) {
    if (instances[i].globalStartTime < instances[firstInstance].globalStartTime) firstInstance = i;
  }
  return instances[firstInstance];
}

export async function exportInstanceData(
  selectedInstances: (InstanceInfo | undefined)[],
  versionInfo: VersionInfo[],
) {
  const objectOrderTemplate = {
    ProzessId: null,
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
    ProcessStepName: null, //tofind
    ProcessStepType: null, //tofind
    ProcessStepStatus: null,
    ProcessStepStartTime: null,
    ProcessStepEndTime: null,
    PreviousProcessStepId: null, //tofind
    ProcessStepTokenId: null,
    ActualPerformerId: null, //tofind
    ActualPerformerName: null, //tofind
    ActualPerformerUsername: null, //tofind
    ProcessEngineId: null, //tofind
    ProcessEngineName: null, //tofind
    Log: null, //tofind
  };

  const instancesWithVersionData = (
    await asyncMap(selectedInstances, async (instance) => {
      if (instance) {
        const correspondingVersion = versionInfo.find(
          (e) => e.versionId == instance.processVersion,
        );
        const parser = new DOMParser();
        const bpmn = parser.parseFromString(correspondingVersion?.bpmn || '', 'text/xml');
        const bpmnDefinitions = bpmn.getElementsByTagName('definitions')[0];
        const bpmnObj = await toBpmnObject(correspondingVersion?.bpmn || '');

        const initiator = await getUser(instance.processInitiator!);
        // TODO change that! it's current Env
        const initiatorSpace = await getEnv(instance.spaceIdOfProcessInitiator!);
        const definitionInfos = await getDefinitionsInfos(bpmnObj);

        return {
          ...instance,
          ProcessName: definitionInfos.name,
          ProcessShortName: definitionInfos.userDefinedId,
          ProcessVersionName: correspondingVersion?.versionName,
          ProcessVersionDescription: correspondingVersion?.versionDescription,
          ProcessVersionCreatedOn: correspondingVersion?.deploymentDate,
          ProcessVersionBasedOn: correspondingVersion?.basedOnVersion,
          ProcessInstanceInitiatorFullName: !initiator.isGuest
            ? `${initiator.firstName} ${initiator.lastName}`
            : 'Guest',
          ProcessInstanceInitiatorUsername: !initiator.isGuest ? initiator.username : 'Guest',
          ProcessInstanceInitiatorSpaceName: initiatorSpace.isOrganization
            ? initiatorSpace.name
            : 'no organization',
        };
      } else {
        return undefined;
      }
    })
  ).filter(truthyFilter);

  const instanceEvents = instancesWithVersionData.flatMap((instance) =>
    instance ? instance.log.map((eventEntry) => ({ ...instance, ...eventEntry })) : [],
  );

  // renaming
  const keyMap: Record<string, string> = {
    processId: 'ProzessId',
    processVersion: 'ProcessVersionId',
    processInstanceId: 'ProcessInstanceId',
    processInitiator: 'ProcessInstanceInitiatorId',
    spaceIdOfProcessInitiator: 'ProcessInstanceInitiatorSpaceId',
    globalStartTime: 'InstanceStartTime',
    flowElementId: 'ProcessStepId',
    executionState: 'ProcessStepStatus',
    startTime: 'ProcessStepStartTime',
    endTime: 'ProcessStepEndTime',
    tokenId: 'ProcessStepTokenId',
  };
  const renamedInstanceEvents = instanceEvents.map((instance) =>
    Object.fromEntries(Object.entries(instance).map(([k, v]) => [keyMap[k] ?? k, v])),
  );

  // reordering
  const structuredInstanceEvents = renamedInstanceEvents.map((instance) => {
    Object.entries(instance).reduce(
      (acc, [key, value]) => {
        if (key in acc) {
          acc[key] = value;
        }
        return acc;
      },
      { ...objectOrderTemplate } as Record<string, any>,
    );
  });

  console.log(structuredInstanceEvents);

  return jsonToCsvExport({
    data: structuredInstanceEvents,
  });
}
