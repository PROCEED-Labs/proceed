import { StoredDeployment } from '@/lib/data/deployment';
import { ExtendedInstanceInfo } from '@/lib/data/instance';
import { convertISODurationToMiliseconds } from '@proceed/bpmn-helper/src/getters';
import type { ElementLike } from 'diagram-js/lib/core/Types';

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
  logInfo?: ExtendedInstanceInfo['log'][number];
  /** Token where currentFlowElementId is the element   */
  token?: ExtendedInstanceInfo['tokens'][number];
  instance?: ExtendedInstanceInfo;
}): { start?: Date; end?: Date; duration?: number } {
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
  else if (start) duration = Date.now() - start.getTime();

  return { start, end, duration };
}

export function getPlannedTimeInfo(elementMetaData: Record<string, any>) {
  return {
    end: elementMetaData.timePlannedEnd ? new Date(elementMetaData.timePlannedEnd) : undefined,
    start: elementMetaData.timePlannedOccurrence
      ? new Date(elementMetaData.timePlannedOccurrence)
      : undefined,
    duration: elementMetaData.timePlannedDuration
      ? convertISODurationToMiliseconds(elementMetaData.timePlannedDuration)
      : undefined,
  };
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
  const plan = getPlannedTimeInfo(elementMetaData);

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
    start:
      (plan.start && start && Math.max(start.getTime() - plan.start.getTime(), 0)) || undefined,
    end: (plan.end && end && Math.max(end.getTime() - plan.end.getTime(), 0)) || undefined,
    duration: (plan.duration && duration && Math.max(duration - plan.duration, 0)) || undefined,
  };

  return { plan, delays };
}

export function getTiming({
  isRootElement,
  metaData,
  logInfo,
  token,
  instance,
}: {
  isRootElement: boolean;
  metaData: Record<string, any>;
  /** Log entry for element in instance information */
  logInfo?: ExtendedInstanceInfo['log'][number];
  /** Token where currentFlowElementId is the element   */
  token?: ExtendedInstanceInfo['tokens'][number];
  instance?: ExtendedInstanceInfo;
}) {
  let timing: NonNullable<ExtendedInstanceInfo['tokens'][number]['timing']> = {
    actual: { start: undefined, end: undefined, duration: undefined },
    plan: { start: undefined, end: undefined, duration: undefined },
    delays: { start: undefined, end: undefined, duration: undefined },
  };

  if (logInfo) {
    if (logInfo.timing) timing = logInfo.timing;
  } else if (token) {
    if (token.timing) timing = token.timing;
  } else if (instance && isRootElement) {
    if (instance.timing) timing = instance.timing;
  } else {
    timing.plan = getPlannedTimeInfo(metaData);
  }

  return timing;
}

export function getVersionInstances(instances: ExtendedInstanceInfo[], version?: string) {
  if (!version) return instances;
  return instances.filter((instance) => instance.processVersion === version);
}

export function getLatestDeployment(deployments: StoredDeployment[]) {
  return deployments.reduce(
    (latest, curr) => {
      if (!latest || latest.deployTime.getTime() > curr.deployTime.getTime()) {
        return curr;
      }
      return latest;
    },
    undefined as undefined | StoredDeployment,
  );
}

export function getYoungestInstance<T extends ExtendedInstanceInfo[]>(instances: T) {
  if (instances.length === 0) return undefined;

  let firstInstance = 0;
  for (let i = 0; i < instances.length; i++) {
    if (instances[i].globalStartTime < instances[firstInstance].globalStartTime) firstInstance = i;
  }
  return instances[firstInstance];
}
