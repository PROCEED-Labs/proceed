import { z } from 'zod';
import store from '../store.js';
import Ability from '@/lib/ability/abilityHelper';
import { environmentsMetaObject, getEnvironmentById } from './environments';
import { v4 } from 'uuid';
import { usersMetaObject } from './users';
import { Environment } from '../../environment-schema.js';
import { deleteRoleMapping, getRoleMappingByUserId } from './role-mappings';
import { enableUseDB } from 'FeatureFlags';
import db from '@/lib/data';

const MembershipInputSchema = z.object({
  userId: z.string(),
  environmentId: z.string(),
});

type MembershipInput = z.infer<typeof MembershipInputSchema>;

export type Membership = MembershipInput & {
  id: string;
  createdOn: string;
};

// @ts-ignore
let firstInit = !global.membershipMetaObject;

export let membershipMetaObject: {
  [EnvironmentId: string]: Membership[];
} =
  // @ts-ignore
  global.membershipMetaObject || (global.membershipMetaObject = {});

/** initializes the membership meta information objects */
export function init() {
  if (!firstInit) return;

  // get roles that were persistently stored
  const storedMemberships = store.get('environmentMemberships') as Membership[];

  for (const membership of storedMemberships) {
    if (!membershipMetaObject[membership.environmentId])
      membershipMetaObject[membership.environmentId] = [];

    membershipMetaObject[membership.environmentId].push(membership);
  }
}
init();

function isOrganization(environment: Environment, opts: { throwIfNotFound?: boolean } = {}) {
  if (!environment)
    if (opts.throwIfNotFound) throw new Error('Environment not found');
    else return false;

  if (!environment.isOrganization)
    if (opts.throwIfNotFound)
      throw new Error("Environment isn't  an organization, it can't have members");
    else return false;

  return true;
}

export async function getUserOrganizationEnvironments(userId: string) {
  if (enableUseDB) {
    return (
      await db.space.findMany({
        where: {
          isOrganization: true,
          //ownerId: userId,
          members: {
            some: {
              userId: userId,
            },
          },
        },
        select: {
          id: true,
        },
      })
    ).map((workspace) => workspace.id);
  }
  return await Promise.all(
    Object.keys(membershipMetaObject).filter((environmentId) => isMember(environmentId, userId)),
  );
}

export async function getMemebers(environmentId: string, ability?: Ability) {
  //TODO: ability check
  if (ability) ability;

  if (enableUseDB) {
    console.log(environmentId);
    const workspace = await db.space.findUnique({
      where: {
        id: environmentId,
        isOrganization: true,
      },
      include: {
        members: true,
      },
    });
    if (!workspace) throw new Error('Environment not found');
    return workspace.members;
  }
  const environment = environmentsMetaObject[environmentId];
  isOrganization(environment, { throwIfNotFound: true });

  return membershipMetaObject[environmentId] ?? [];
}

export async function isMember(environmentId: string, userId: string) {
  if (enableUseDB) {
    const environment = await getEnvironmentById(environmentId);
    if (!environment?.isOrganization) {
      return userId === environmentId;
    }
    const membership = await db.membership.findFirst({
      where: {
        environmentId: environmentId,
        userId: userId,
      },
    });
    return membership ? true : false;
  }
  const environment = environmentsMetaObject[environmentId];

  if (!isOrganization(environment)) return userId === environmentId;

  const members = membershipMetaObject[environmentId];

  return members ? members.some((member) => member.userId === userId) : false;
}

export async function addMember(environmentId: string, userId: string, ability?: Ability) {
  if (enableUseDB) {
    const environment = await db.space.findUnique({
      where: { id: environmentId },
      select: { isOrganization: true },
    });

    if (!environment) {
      throw new Error('Environment not found');
    }

    // TODO: ability check
    if (ability) ability;

    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new Error('User not found');
    if (user.isGuest) throw new Error('Guest users cannot be added to environments');

    await db.membership.create({
      data: {
        id: v4(),
        userId: userId,
        environmentId: environmentId,
        createdOn: new Date().toISOString(),
      },
    });
  } else {
    const environment = environmentsMetaObject[environmentId];
    isOrganization(environment, { throwIfNotFound: true });

    // TODO: ability check
    if (ability) ability;

    const user = usersMetaObject[userId];
    if (!user) throw new Error('User not found');
    if (user.isGuest) throw new Error('Guest users cannot be added to environments');

    const members = membershipMetaObject[environmentId];

    if (!members) membershipMetaObject[environmentId] = [];

    const membership = {
      userId,
      environmentId,
      id: v4(),
      createdOn: new Date().toISOString(),
    };

    membershipMetaObject[environmentId].push(membership);
    store.add('environmentMemberships', membership);
  }
}

export async function removeMember(environmentId: string, userId: string, ability?: Ability) {
  if (enableUseDB) {
    const environment = await db.space.findUnique({
      where: { id: environmentId },
      select: { isOrganization: true },
    });

    if (!environment) {
      throw new Error('Environment not found');
    }

    // TODO: ability check
    if (ability) ability;

    const memberExists = await isMember(environmentId, userId);
    if (!memberExists) {
      throw new Error('User is not a member of this environment');
    }

    await db.membership.deleteMany({
      where: {
        environmentId: environmentId,
        userId: userId,
      },
    });
  } else {
    const environment = environmentsMetaObject[environmentId];
    isOrganization(environment, { throwIfNotFound: true });

    // TODO: ability check
    if (ability) ability;

    if (!isMember(environmentId, userId))
      throw new Error('User is not a member of this environment');

    for (const role of await getRoleMappingByUserId(userId, environmentId)) {
      deleteRoleMapping(userId, role.roleId, environmentId);
    }

    const members = membershipMetaObject[environmentId];

    const memberIndex = members.findIndex((member) => member.userId === userId);
    const membership = members[memberIndex];

    members.splice(memberIndex, 1);
    store.remove('environmentMemberships', membership.id);
  }
}
