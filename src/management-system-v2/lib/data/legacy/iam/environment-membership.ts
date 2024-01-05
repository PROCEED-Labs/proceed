import store from '../store.js';
import Ability from '@/lib/ability/abilityHelper';
import { z } from 'zod';
import { environmentsMetaObject } from './environments.js';

// @ts-ignore
let firstInit = !global.environmentMetaObject;

const MembershipSchema = z.object({
  userId: z.string().readonly(),
  environmentId: z.string().readonly(),
});

type Membership = z.infer<typeof MembershipSchema>;

export let environmentMembershipMetaObject: { [EnvironmentId: string]: Membership[] } =
  // @ts-ignore
  global.environmentMembershipMetaObject || (global.environmentMembershipMetaObject = {});

export function getMemberships(environmentId: string, ability: Ability) {
  if (!environmentsMetaObject[environmentId]) throw new Error('Environment not found');

  const memberships = environmentMembershipMetaObject[environmentId];

  return memberships ? Object.values(memberships) : [];
}

export function addMembership(membershipInput: Membership, ability: Ability) {
  const membership = MembershipSchema.parse(membershipInput);

  if (!environmentsMetaObject[membership.environmentId]) throw new Error('Environment not found');

  if (!environmentMembershipMetaObject[membership.environmentId])
    environmentMembershipMetaObject[membership.environmentId] = [];

  const environmentMembers = environmentMembershipMetaObject[membership.environmentId];

  if (environmentMembers.find((member) => member.userId === membership.userId))
    throw new Error('User already a member');

  environmentMembers.push(membership);

  store.set('environmentMemberships', membership.environmentId, environmentMembers);
}

export function removeMembership(membershipInput: Membership, ability: Ability) {
  const membership = MembershipSchema.parse(membershipInput);

  const environmentMembers = environmentMembershipMetaObject[membership.environmentId];
  const membershipIndex = environmentMembers
    ? environmentMembers.findIndex((member) => member.userId === membership.userId)
    : -1;

  if (membershipIndex === -1) throw new Error('Membership doesnt exist');

  environmentMembers.splice(membershipIndex, 1);

  store.set('environmentMemberships', membership.environmentId, environmentMembers);
}

/**
 * initializes the environments membership meta information objects
 */
export function init() {
  if (!firstInit) return;

  const memberships = store.get('environmentMemberships');
  environmentMembershipMetaObject = memberships;
}
init();
