import { z } from 'zod';
import store from '../store.js';
import Ability from '@/lib/ability/abilityHelper';
import { environmentsMetaObject, getEnvironmentById } from './environments';
import { v4 } from 'uuid';
import { usersMetaObject } from './users';
import { Environment } from '../../environment-schema.js';
import { deleteRoleMapping, getRoleMappingByUserId } from './role-mappings';

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

let inited = false;
/** initializes the membership meta information objects */
export function init() {
  if (!firstInit || inited) return;
  inited = true;

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
      throw new Error("Environment isn't an organization, it can't have members");
    else return false;

  return true;
}

export async function getUserOrganizationEnvironments(userId: string) {
  return await Promise.all(
    Object.keys(membershipMetaObject).filter((environmentId) => isMember(environmentId, userId)),
  );
}

export async function getMembers(environmentId: string, ability?: Ability) {
  // TODO: ability check
  if (ability) ability;

  const environment = environmentsMetaObject[environmentId];
  isOrganization(environment, { throwIfNotFound: true });

  return membershipMetaObject[environmentId] ?? [];
}

export async function isMember(environmentId: string, userId: string) {
  const environment = environmentsMetaObject[environmentId];

  if (!isOrganization(environment)) return userId === environmentId;

  const members = membershipMetaObject[environmentId];

  return members ? members.some((member) => member.userId === userId) : false;
}

export async function addMember(environmentId: string, userId: string, ability?: Ability) {
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

export async function removeMember(environmentId: string, userId: string, ability?: Ability) {
  const environment = environmentsMetaObject[environmentId];
  isOrganization(environment, { throwIfNotFound: true });

  // TODO: ability check
  if (ability) ability;

  if (!isMember(environmentId, userId)) throw new Error('User is not a member of this environment');

  for (const role of await getRoleMappingByUserId(userId, environmentId)) {
    deleteRoleMapping(userId, role.roleId, environmentId);
  }

  const members = membershipMetaObject[environmentId];

  const memberIndex = members.findIndex((member) => member.userId === userId);
  const membership = members[memberIndex];

  members.splice(memberIndex, 1);
  store.remove('environmentMemberships', membership.id);
}
