import { z } from 'zod';
import store from '../store.js';
import Ability from '@/lib/ability/abilityHelper';
import { environmentsMetaObject } from './environments';
import { v4 } from 'uuid';

const MembershipInputSchema = z.object({
  userId: z.string(),
  environmentId: z.string(),
});

type MembershipInput = z.infer<typeof MembershipInputSchema>;

export type Membership = MembershipInput & {
  id: string;
  createdOn: string;
};
//
// @ts-ignore
let firstInit = !global.membershipMetaObject;

/** @type {any} - object containing all roles */
export let membershipMetaObject: {
  [EnvironmentId: string]: Membership[];
} =
  // @ts-ignore
  global.membershipMetaObject || (global.roleMetaObjects = {});

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

function isOrganization(environmentId: string) {
  const environment = environmentsMetaObject[environmentId];

  if (!environment) throw new Error('Environment not found');
  if (!environment.organization)
    throw new Error("Environment isn't  an organization, it can't have members");

  return environment;
}

export function getMemebers(environmentId: string, ability?: Ability) {
  isOrganization(environmentId);

  //TODO: ability check
  if (ability) ability;

  return membershipMetaObject[environmentId] ?? [];
}

export function isMember(environmentId: string, userId: string) {
  isOrganization(environmentId);

  const members = membershipMetaObject[environmentId];

  return members ? members.some((member) => member.userId === userId) : false;
}

export function addMember(environmentId: string, userId: string, ability?: Ability) {
  isOrganization(environmentId);

  // TODO: ability check
  if (ability) ability;

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

export function removeMember(environmentId: string, userId: string, ability?: Ability) {
  isOrganization(environmentId);

  // TODO: ability check
  if (ability) ability;

  if (!isMember(environmentId, userId)) throw new Error('User is not a member of this environment');

  const members = membershipMetaObject[environmentId];

  const memberIndex = members.findIndex((member) => member.userId === userId);
  const membership = members[memberIndex];

  members.splice(memberIndex, 1);
  store.remove('environmentMemberships', membership.id);
}
