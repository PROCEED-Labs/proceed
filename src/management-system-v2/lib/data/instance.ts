'use server';

import { getCurrentEnvironment } from '@/components/auth';
import { UserError, UserErrorType, UserFacingError, userError } from '../user-error';
import { cacheLife, cacheTag, updateTag } from 'next/cache';

import db from '@/lib/data/db';
import { truthyFilter } from '../typescript-utils';
import { InstanceInfo } from '../engines/deployment';
import { InstanceInput, InstanceInputSchema } from '../deployments-schema';
import { User } from '@prisma/client';
import { getAllAvailableMachines } from './engines';
import { getSpaceUsers } from './db/iam/users';
import { getRoles } from './db/iam/roles';
import { Role } from './role-schema';

export async function getInstance(spaceId: string, instanceId: string) {
  const {
    ability,
    activeEnvironment: { isOrganization },
  } = await getCurrentEnvironment(spaceId);

  if (!ability.can('view', 'Execution'))
    return userError('Invalid Permissions', UserErrorType.PermissionError);

  async function getFromDBOrCache(instanceId: string) {
    'use cache';
    cacheLife({ stale: 5, revalidate: 10 });
    cacheTag(`instance/${instanceId}`);

    const users = await getSpaceUsers(spaceId, isOrganization);
    const knownUsers = users.reduce(
      (acc, curr) => {
        acc[curr.id] = curr;
        return acc;
      },
      {} as Record<string, User>,
    );

    let knownRoles: Record<string, Role> = {};
    if (isOrganization) {
      const roles = await getRoles(spaceId);
      knownRoles = roles.reduce((acc, curr) => {
        acc[curr.id] = curr;
        return acc;
      }, knownRoles);
    }

    const reachableMachines = await getAllAvailableMachines(spaceId, true);

    const instanceInfo = await db.processInstance.findUnique({
      where: { id: instanceId },
    });

    if (!instanceInfo) return null;

    const state = instanceInfo.state as InstanceInfo;

    const mapUsers = (actualOwnerIds?: string[]) => {
      return actualOwnerIds
        ?.map((ownerId) => {
          const owner = knownUsers[ownerId];
          if (!owner) return undefined;
          return {
            id: ownerId,
            username: owner.username,
            firstName: owner.firstName,
            lastName: owner.lastName,
          };
        })
        .filter(truthyFilter);
    };
    const mapPerformers = (performers?: InstanceInfo['tokens'][number]['performers']) => {
      if (!performers) return undefined;

      return {
        user: mapUsers(performers.user)!,
        roles: performers.roles
          .map((roleId) => {
            const role = knownRoles[roleId];
            if (!role) return undefined;

            return {
              id: role.id,
              name: role.name,
              description: role.description,
            };
          })
          .filter(truthyFilter),
      };
    };

    // map entries with ids to the actual data from the database to show richer information in the
    // frontend
    const extendedInstanceInfo = {
      ...instanceInfo,
      machines: instanceInfo?.machineIds.map((id) => ({
        id,
        online: reachableMachines.some((m) => m.id === id),
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
      },
    };

    return extendedInstanceInfo;
  }

  return getFromDBOrCache(instanceId);
}

export type StoredInstance = Exclude<
  NonNullable<Awaited<ReturnType<typeof getInstance>>>,
  { error: UserError }
>;

export type ExtendedInstanceInfo = StoredInstance['state'];

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

  const deployment = await db.processDeployment.findUnique({
    where: { id: instance.deploymentId },
    select: { version: { select: { processId: true } } },
  });

  if (!deployment) {
    throw new UserFacingError('Trying to add an instance for an unknown deployment.');
  }

  const data = InstanceInputSchema.parse(instance);

  updateTag(`deployment/process/${deployment.version.processId}`);

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

    if (!ability.can('create', 'Execution'))
      return userError('Invalid Permissions', UserErrorType.PermissionError);
  }

  const data = InstanceInputSchema.partial().strict().parse(input);

  updateTag(`instance/${instanceId}`);

  return await db.processInstance.update({
    where: { id: instanceId },
    data,
  });
}
