'use server';

import db from '@/lib/data/db';

import { getCurrentEnvironment } from '@/components/auth';
import { InstanceInput, InstanceInputSchema } from '../instance-schema';
import { UserErrorType, isUserErrorResponse, userError } from '../user-error';
import { InstanceInfo } from '../engines/deployment';
import Ability from '../ability/abilityHelper';
import { ProcessInstance } from '@prisma/client';
import { pick } from '../helpers/javascriptHelpers';
import { cache } from 'react';
import { getSpaceUsers } from './db/iam/users';
import { getEnvironmentById } from './db/iam/environments';
import { Role } from './role-schema';
import { getRoles } from './db/iam/roles';
import { truthyFilter } from '../typescript-utils';

import { getProcessBPMN } from './processes';
import {
  getElementById,
  getElementsByTagName,
  getMetaDataFromElement,
  toBpmnObject,
} from '@proceed/bpmn-helper';
import {
  getPlanDelays,
  getTimeInfo,
  isActive,
} from '@/app/(dashboard)/[environmentId]/(automation)/executions/[processId]/instance-helpers';
import type { ElementLike } from 'diagram-js/lib/core/Types';
import { cacheLife, cacheTag, revalidateTag } from 'next/cache';

type StoredInstance = Omit<ProcessInstance, 'state'> & {
  state: InstanceInfo;
  versionId: string;
  engines: { id: string; name: string | null; connections: { reachable: boolean }[] }[];
};

export async function getDBInstance(spaceId: string, instanceId: string, ability?: Ability) {
  if (!ability) ({ ability } = await getCurrentEnvironment(spaceId));

  if (!ability.can('view', 'Execution'))
    return userError('Invalid Permissions', UserErrorType.PermissionError);

  const instanceInfo = await db.processInstance.findUnique({
    where: { id: instanceId },
    include: {
      deployment: { select: { versionId: true } },
      engines: {
        select: {
          id: true,
          name: true,
          connections: { select: { reachable: true, connection: true } },
        },
      },
    },
  });

  if (!instanceInfo) return null;

  return {
    ...instanceInfo,
    state: instanceInfo.state as InstanceInfo,
    versionId: instanceInfo.deployment.versionId,
  };
}

const getVersionBpmnObject = cache(
  async (spaceId: string, definitionId: string, versionId: string, ability?: Ability) => {
    const bpmn = await getProcessBPMN(definitionId, spaceId, versionId, ability);
    if (isUserErrorResponse(bpmn)) return bpmn;
    return toBpmnObject(bpmn);
  },
);
const getSpaceInfo = cache(async (spaceId: string) => {
  return await getEnvironmentById(spaceId);
});
const getKnownUsers = cache(async (spaceId: string) => {
  const space = await getSpaceInfo(spaceId);
  const users = await getSpaceUsers(spaceId, space.isOrganization);
  return Object.fromEntries(users.map((user) => [user.id, user]));
});
const getKnownRoles = cache(async (spaceId: string) => {
  let knownRoles: Record<string, Role> = {};

  const space = await getSpaceInfo(spaceId);
  if (space.isOrganization) {
    const roles = await getRoles(spaceId);
    knownRoles = Object.fromEntries(roles.map((role) => [role.id, role]));
  }

  return knownRoles;
});

async function extendInstance(spaceId: string, instance: StoredInstance, ability?: Ability) {
  const knownUsers = await getKnownUsers(spaceId);
  const knownRoles = await getKnownRoles(spaceId);

  const mapUser = (userId: string) => {
    const user = knownUsers[userId];
    if (!user) return undefined;
    return {
      ...pick(user, ['id', 'isGuest', 'username', 'firstName', 'lastName']),
      fullName: `${user.firstName} ${user.lastName}`.trim(),
    };
  };

  const mapUsers = (ownerIds?: string[]) => {
    return ownerIds?.map(mapUser).filter(truthyFilter);
  };

  const mapPerformers = (performers?: InstanceInfo['tokens'][number]['performers']) => {
    if (!performers) return undefined;

    return {
      user: mapUsers(performers.user),
      roles: performers.roles
        .map((roleId) => {
          const role = knownRoles[roleId];
          if (!role) return undefined;

          return pick(role, ['id', 'name', 'description']);
        })
        .filter(truthyFilter),
    };
  };

  const { state } = instance;

  let initiator: 'Automatic' | 'Unknown' | 'Guest' | NonNullable<ReturnType<typeof mapUser>> =
    'Automatic';
  if (instance.initiatorId) {
    const i = mapUser(instance.initiatorId);
    if (!i) initiator = 'Unknown';
    else if (i.isGuest) initiator = 'Guest';
    else initiator = i;
  }

  let initiatorSpace: undefined | { id: string; name: string; isOrganization: boolean } = undefined;
  if (state.processInstanceInitiatorSpaceId) {
    const space = await getSpaceInfo(state.processInstanceInitiatorSpaceId);
    if (space) {
      if (space.isOrganization) {
        initiatorSpace = pick(space, ['id', 'name', 'isOrganization']);
      } else {
        initiatorSpace = { id: space.id, name: 'Personal Space', isOrganization: false };
      }
    }
  }

  const bpmnObject = await getVersionBpmnObject(
    spaceId,
    instance.state.processId,
    instance.state.processVersion,
    ability,
  );

  if (isUserErrorResponse(bpmnObject)) return bpmnObject;

  const getPlannedCosts = (flowNodeId: string) => {
    const flowNode = getElementById(bpmnObject, flowNodeId);
    if (!flowNode) return;
    const metaData = getMetaDataFromElement(flowNode);
    return metaData.costsPlanned;
  };

  function accumulateCosts(
    acc: { value: number; unit: string }[],
    cost: { value: string; unit: string },
  ) {
    try {
      const value = parseFloat(cost.value);
      const sameUnit = acc.find((entry) => entry.unit === cost.unit);
      if (sameUnit) {
        sameUnit.value += value;
      } else {
        acc.push({ value, unit: cost.unit });
      }
    } catch (err) {}

    return acc;
  }

  const fullExecution = [...state.log, ...state.tokens];
  let executionCosts = fullExecution
    .map((entry) => entry.costsRealSetByOwner)
    .filter(truthyFilter)
    .reduce(accumulateCosts, [] as { value: number; unit: string }[]);
  let plannedCosts = fullExecution
    .map((entry) => {
      const flowNodeId =
        'flowElementId' in entry ? entry.flowElementId : entry.currentFlowElementId;
      return getPlannedCosts(flowNodeId);
    })
    .filter(truthyFilter)
    .reduce(accumulateCosts, [] as { value: number; unit: string }[]);

  function getTimings(
    log?: (typeof state)['log'][number],
    token?: (typeof state)['tokens'][number],
  ) {
    let element;
    if (log) element = getElementById(bpmnObject, log.flowElementId) as any;
    else if (token) element = getElementById(bpmnObject, token.currentFlowElementId) as any;
    else {
      [element] = getElementsByTagName(bpmnObject, 'bpmn:Process');
    }

    if (!element) return;

    const { start, end, duration } = getTimeInfo({
      element: { type: element.$type } as unknown as ElementLike,
      logInfo: log as any,
      token: token as any,
      instance: state as any,
    });

    const elementMetaData = getMetaDataFromElement(element);
    const { plan, delays } = getPlanDelays({ elementMetaData, start, end, duration });

    return {
      actual: { start, end, duration },
      plan,
      delays,
    };
  }

  let executionStatus: 'Running' | 'Ended' | 'Failed' = 'Ended';
  const { instanceState } = state;
  if (isActive(state)) {
    executionStatus = 'Running';
  }
  const failStates = [
    'FAILED',
    'ERROR-SEMANTIC',
    'ERROR-TECHNICAL',
    'ERROR-CONSTRAINT-UNFULFILLED',
    'ERROR-UNKNOWN',
  ];
  if (executionStatus === 'Ended' && instanceState.some((state) => failStates.includes(state))) {
    executionStatus = 'Failed';
  }

  return {
    ...instance,
    initiator,
    engines: instance.engines.map(({ id, name, connections }) => ({
      id,
      name,
      online: connections.some(({ reachable }) => reachable),
    })),
    executionStatus,
    offline: instance.engines.some(({ connections }) => connections.every((c) => !c.reachable)),
    pausing: instanceState.some((state) => state === 'PAUSING'),
    paused: instanceState.some((state) => state === 'PAUSED'),
    state: {
      ...state,
      tokens: state.tokens.map((token) => ({
        ...token,
        plannedCosts: getPlannedCosts(token.currentFlowElementId),
        actualOwner: mapUsers(token.actualOwner),
        performers: mapPerformers(token.performers),
        timing: getTimings(undefined, token),
      })),
      log: state.log.map((entry) => ({
        ...entry,
        plannedCosts: getPlannedCosts(entry.flowElementId),
        actualOwner: mapUsers(entry.actualOwner),
        performers: mapPerformers(entry.performers),
        timing: getTimings(entry, undefined),
      })),
      processInstanceInitiator: initiator,
      spaceOfProcessInstanceInitiator: initiatorSpace,
      executionCosts,
      plannedCosts: plannedCosts.length ? plannedCosts : undefined,
      timing: getTimings(),
    },
  };
}

export type ExtendedInstance = Exclude<Awaited<ReturnType<typeof extendInstance>>, { error: any }>;
export type ExtendedInstanceInfo = ExtendedInstance['state'];

export async function getInstance(spaceId: string, instanceId: string, ability?: Ability) {
  if (!ability) ({ ability } = await getCurrentEnvironment(spaceId));

  if (!ability.can('view', 'Execution'))
    return userError('Invalid Permissions', UserErrorType.PermissionError);

  async function getFromDBOrCache(instanceId: string) {
    'use cache';
    cacheLife({ revalidate: 10, expire: 15 });
    cacheTag(`instance/${instanceId}`);

    return await db.processInstance.findUnique({
      where: { id: instanceId },
      include: {
        deployment: { select: { versionId: true } },
        engines: {
          select: {
            id: true,
            name: true,
            connections: { select: { reachable: true } },
          },
        },
      },
    });
  }

  const instanceInfo = await getFromDBOrCache(instanceId);

  if (!instanceInfo) return null;

  return extendInstance(
    spaceId,
    {
      ...instanceInfo,
      state: instanceInfo.state as InstanceInfo,
      versionId: instanceInfo.deployment.versionId,
    },
    ability,
  );
}

export async function getInstances(spaceId: string, ability: Ability) {
  if (!ability.can('view', 'Execution'))
    return userError('Invalid Permissions', UserErrorType.PermissionError);

  async function getFromDBOrCache(spaceId: string) {
    'use cache';
    cacheLife({ revalidate: 10, expire: 15 });
    cacheTag(`space/${spaceId}/instances`);

    return await db.processInstance.findMany({
      where: {
        deployment: {
          AND: [
            { version: { process: { environmentId: spaceId } } },
            { removeTime: null },
            { toRemove: false },
          ],
        },
      },
      select: {
        id: true,
      },
    });
  }

  const instances = await getFromDBOrCache(spaceId);

  return instances.map(({ id }) => id);
}

export async function updateInstance(
  spaceId: string,
  instanceId: string,
  input: Partial<InstanceInput>,
  skipAbilityCheck = false,
) {
  if (!skipAbilityCheck) {
    const { ability } = await getCurrentEnvironment(spaceId);

    if (!ability.can('update', 'Execution'))
      return userError('Invalid Permissions', UserErrorType.PermissionError);
  }

  const data = InstanceInputSchema.partial().strict().parse(input);

  const res = await db.processInstance.update({
    where: { id: instanceId },
    data: {
      ...data,
      engines: data.engines && {
        connect: data.engines.map((id) => ({ id })),
      },
    },
  });

  revalidateTag(`instance/${instanceId}`, 'max');

  return res;
}
