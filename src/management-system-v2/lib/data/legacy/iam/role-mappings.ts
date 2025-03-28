import { v4 } from 'uuid';
import store from '../store.js';
import { getRoleById, roleMetaObjects } from './roles';
import Ability, { UnauthorizedError } from '@/lib/ability/abilityHelper';
import { toCaslResource } from '@/lib/ability/caslAbility';
import { z } from 'zod';
import { usersMetaObject } from './users';
import { environmentsMetaObject } from './environments';

const RoleMappingInputSchema = z.object({
  roleId: z.string(),
  userId: z.string(),
  environmentId: z.string(),
  expiration: z.string().optional(),
});

export type RoleMappingInput = z.infer<typeof RoleMappingInputSchema>;

export type RoleMapping = RoleMappingInput & { id: string; createdOn: string; roleName: string };

// @ts-ignore
let firstInit = !global.roleMappingsMetaObjects;

export let roleMappingsMetaObjects: {
  [EnvironmentId: string]: {
    users: {
      [UserId: string]: RoleMapping[];
    };
  };
} =
  //@ts-ignore
  global.roleMappingsMetaObjects || (global.roleMappingsMetaObjects = {});

let inited = false;
/**
 * initializes the role mappings meta information objects
 */
export function init() {
  if (!firstInit || inited) return;
  inited = true;

  // get role mappings that were persistently stored
  const storedRoleMappings = store.get('roleMappings');

  // set role mappings store
  store.set('roleMappings', storedRoleMappings);

  roleMappingsMetaObjects = storedRoleMappings;
  //@ts-ignore
  global.roleMappingsMetaObjects = roleMappingsMetaObjects;
}
init();

/** Returns all role mappings in form of an array */
export async function getRoleMappings(ability?: Ability, environmentId?: string) {
  if (environmentId) {
    if (!(environmentId in roleMappingsMetaObjects)) return [];
    const roleMappings = Object.values(roleMappingsMetaObjects[environmentId].users).flat();
    return ability ? ability.filter('view', 'RoleMapping', roleMappings) : roleMappings;
  }

  const roleMappings: RoleMapping[] = [];

  for (const environment of Object.values(roleMappingsMetaObjects))
    roleMappings.push(...Object.values(environment.users).flat());

  return ability ? ability.filter('view', 'RoleMapping', roleMappings) : roleMappings;
}

/** Returns a role mapping by user id */
export async function getRoleMappingByUserId(
  userId: string,
  environmentId: string,
  ability?: Ability,
  roleId?: string,
) {
  const environmentMappings = roleMappingsMetaObjects[environmentId];
  if (!environmentMappings) return [];

  const userRoleMappings = environmentMappings.users[userId] || [];

  if (!ability) return userRoleMappings;
  return ability.filter('view', 'RoleMapping', userRoleMappings);
}

/** Adds a user role mapping */
export async function addRoleMappings(roleMappingsInput: RoleMappingInput[], ability?: Ability) {
  const roleMappings = roleMappingsInput.map((roleMappingInput) =>
    RoleMappingInputSchema.parse(roleMappingInput),
  );

  if (ability) {
    for (const { roleId } of roleMappings) {
      const role = await getRoleById(roleId);
      if (!ability.can('manage', toCaslResource('Process', role))) throw new UnauthorizedError();
    }
  }

  const allowedRoleMappings = ability
    ? ability.filter('create', 'RoleMapping', roleMappings)
    : roleMappings;

  allowedRoleMappings.forEach((roleMapping) => {
    const { roleId, userId, environmentId } = roleMapping;

    const environment = environmentsMetaObject[environmentId];
    if (!environment) throw new Error(`Environment ${environmentId} doesn't exist`);

    if (!environment.isOrganization)
      throw new Error('Cannot add role mapping to personal environment');

    let role = roleMetaObjects[roleId];
    if (!role.hasOwnProperty('id')) {
      role = store.getById('roles', roleId);
      if (!role.hasOwnProperty('id')) throw new Error('Role not found');
    }

    let environmentMappings = roleMappingsMetaObjects[environmentId];
    if (!environmentMappings) {
      environmentMappings = { users: {} };
      roleMappingsMetaObjects[environmentId] = environmentMappings;
    }

    let userMappings = environmentMappings.users[userId];
    if (!userMappings) {
      environmentMappings.users[userId] = [];
      userMappings = environmentMappings.users[userId];
    }

    if (userMappings && userMappings.some((mapping) => mapping.roleId === roleId)) {
      throw new Error('Role mapping already exists');
    }

    const user = usersMetaObject[userId];
    if (!user) throw new Error('User not found');
    if (user.isGuest) throw new Error('Guests cannot have role mappings');

    const id = v4();
    const createdOn = new Date().toUTCString();

    const newRoleMapping: RoleMapping = {
      id,
      ...roleMapping,
      roleName: role.name,
      createdOn,
    };

    userMappings.push(newRoleMapping);
    role.members.push({
      userId: userId,
    });

    // persist new role mapping in file system
    store.setDictElement('roleMappings', roleMappingsMetaObjects);

    store.update('roles', roleId, roleMetaObjects[roleId]);
  });
}

/** Removes a role mapping from a user */
export async function deleteRoleMapping(
  userId: string,
  roleId: string,
  environmentId: string,
  ability?: Ability,
) {
  const environmentMappings = roleMappingsMetaObjects[environmentId];
  if (!environmentMappings) throw new Error("Role mapping doesn't exist");

  const userMappings = environmentMappings.users[userId];
  if (!userMappings) throw new Error("Role mapping doesn't exist");

  const roleMappingIndex = userMappings.findIndex((mapping) => mapping.roleId === roleId);
  if (roleMappingIndex == -1) throw new Error("Role mapping doesn't exist");

  const roleMapping = userMappings[roleMappingIndex];

  if (ability && !ability.can('delete', toCaslResource('RoleMapping', roleMapping)))
    throw new UnauthorizedError();

  userMappings.splice(roleMappingIndex, 1);

  if (userMappings.length === 0) delete environmentMappings.users[userId];

  // persist new role mapping in file system
  store.setDictElement('roleMappings', roleMappingsMetaObjects);

  if (roleMetaObjects[roleId]) {
    const index = roleMetaObjects[roleId].members.findIndex((member) => member.userId === userId);
    if (index > -1) {
      roleMetaObjects[roleId].members.splice(index, 1);
    }
  }

  store.update('roles', roleId, roleMetaObjects[roleId]);
}
