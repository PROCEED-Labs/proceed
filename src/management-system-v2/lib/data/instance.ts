'use server';

import db from '@/lib/data/db';

import { getCurrentEnvironment } from '@/components/auth';
import { InstanceInput, InstanceInputSchema } from '../instance-schema';
import { UserErrorType, isUserErrorResponse, userError } from '../user-error';
import { InstanceInfo } from '../engines/deployment';
import Ability from '../ability/abilityHelper';
import { ProcessInstance } from '@prisma/client';
import { asyncMap, pick } from '../helpers/javascriptHelpers';
import { cache } from 'react';
import { getSpaceUsers } from './db/iam/users';
import { getEnvironmentById } from './db/iam/environments';
import { Role } from './role-schema';
import { getRoles } from './db/iam/roles';
import { truthyFilter } from '../typescript-utils';

import { getAllAvailableEngines } from './engines';

type StoredInstance = Omit<ProcessInstance, 'state'> & { state: InstanceInfo; versionId: string };

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

  const reachableEngines = await getAllAvailableEngines(spaceId, ability);
  if (isUserErrorResponse(reachableEngines)) return reachableEngines;

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
  if (instance.state.spaceIdOfProcessInitiator) {
    const space = await getSpaceInfo(instance.state.spaceIdOfProcessInitiator);
    if (space) {
      if (space.isOrganization) {
        initiatorSpace = pick(space, ['id', 'name', 'isOrganization']);
      } else {
        initiatorSpace = { id: space.id, name: 'Personal Space', isOrganization: false };
      }
    }
  }

  return {
    ...instance,
    initiator,
    engines: instance.engineIds.map((id) => ({
      id,
      online: reachableEngines.some((e) => e.id === id),
    })),
    state: {
      ...state,
      tokens: state.tokens.map((token) => ({
        ...token,
        actualOwner: mapUsers(token.actualOwner),
        performers: mapPerformers(token.performers),
      })),
      log: state.log.map((entry) => ({
        ...entry,
        actualOwner: mapUsers(entry.actualOwner),
        performers: mapPerformers(entry.performers),
      })),
      processInitiator: initiator,
      spaceOfProcessInitiator: initiatorSpace,
    },
  };
}

export type ExtendedInstance = Exclude<Awaited<ReturnType<typeof extendInstance>>, { error: any }>;
export type ExtendedInstanceInfo = ExtendedInstance['state'];

export async function getInstance(spaceId: string, instanceId: string, ability?: Ability) {
  if (!ability) ({ ability } = await getCurrentEnvironment(spaceId));

  if (!ability.can('view', 'Execution'))
    return userError('Invalid Permissions', UserErrorType.PermissionError);

  const instanceInfo = await db.processInstance.findUnique({
    where: { id: instanceId },
    include: { deployment: { select: { versionId: true } } },
  });

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

  const instances = await db.processInstance.findMany({
    where: {
      deployment: {
        AND: [
          { version: { process: { environmentId: spaceId } } },
          { removeTime: null },
          { toRemove: false },
        ],
      },
    },
    include: { deployment: { select: { versionId: true } } },
  });

  const extendedInstances = await asyncMap(instances, async (i) =>
    extendInstance(
      spaceId,
      {
        ...i,
        state: i.state as InstanceInfo,
        versionId: i.deployment.versionId,
      },
      ability,
    ),
  );

  return extendedInstances as ExtendedInstance[];
}

export async function addInstance(
  spaceId: string,
  instance: InstanceInput,
  skipAbilityCheck = false,
) {
  if (!skipAbilityCheck) {
    const { ability } = await getCurrentEnvironment(spaceId);

    if (!ability.can('create', 'Execution'))
      return userError('Invalid Permissions', UserErrorType.PermissionError);
  }

  const data = InstanceInputSchema.parse(instance);

  return await db.processInstance.create({ data });
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

  return await db.processInstance.update({
    where: { id: instanceId },
    data,
  });
}
