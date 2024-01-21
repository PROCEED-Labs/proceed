import { v4 } from 'uuid';
import store from '../store.js';
import { mergeIntoObject } from '../../../helpers/javascriptHelpers';
import { roleMappingsMetaObjects } from './role-mappings';
import Ability, { UnauthorizedError } from '@/lib/ability/abilityHelper';
import { ResourceType, toCaslResource } from '@/lib/ability/caslAbility';
import { Role, RoleInput, RoleInputSchema } from '../../role-schema';

// @ts-ignore
let firstInit = !global.roleMetaObjects;

export let roleMetaObjects: Record<string, Role> =
  // @ts-ignore
  global.roleMetaObjects || (global.roleMetaObjects = {});

/**
 * initializes the roles meta information objects
 */
export function init() {
  if (!firstInit) return;

  // get roles that were persistently stored
  const storedRoles = store.get('roles') as Role[];

  // set roles store
  store.set('roles', 'roles', storedRoles);

  // set roles store cache for quick access
  storedRoles.forEach((role) => (roleMetaObjects[role.id] = role));
}
init();

/** Returns all roles in form of an array */
export function getRoles(environmentId?: string, ability?: Ability) {
  const roles = environmentId
    ? Object.values(roleMetaObjects).filter((role) => role.environmentId === environmentId)
    : Object.values(roleMetaObjects);

  return ability ? ability.filter('view', 'Process', roles) : roles;
}

/**
 * Returns a role based on role id
 *
 * @throws {UnauthorizedError}
 */
export function getRoleById(roleId: string, ability?: Ability) {
  const role = roleMetaObjects[roleId];
  if (!ability) return role;

  if (role && !ability.can('view', toCaslResource('Role', role))) throw new UnauthorizedError();

  return role;
}

/**
 * Adds a new role for the PROCEED MS
 *
 * @throws {UnauthorizedError}
 * @throws {Error}
 */
export function addRole(roleRepresentationInput: RoleInput, ability: Ability) {
  const roleRepresentation = RoleInputSchema.parse(roleRepresentationInput);

  if (!ability.can('create', toCaslResource('Role', roleRepresentation)))
    throw new UnauthorizedError();

  const { name, description, note, permissions, expiration, environmentId } = roleRepresentation;

  const index = Object.values(roleMetaObjects).findIndex((role) => role.name === name);
  if (index > -1) throw new Error('Role already exists');

  const createdOn = new Date().toUTCString();
  const lastEdited = createdOn;
  const id = v4();

  const role = {
    name,
    environmentId,
    description: description || null,
    note: note || null,
    permissions: permissions || {},
    expiration: expiration || null,
    members: [],
    id,
    default: roleRepresentation.default,
    createdOn,
    lastEdited,
  };

  // check if there is an id collision
  if (roleMetaObjects[id]) {
    throw new Error('Role id already exists');
  }

  // save role info in local cache
  roleMetaObjects[id] = role;

  // persist role on file system
  store.add('roles', role);

  return role;
}

/**
 * Updates a role by id for the PROCEED MS
 *
 * @throws {UnauthorizedError}
 * @throws {Error}
 */
export function updateRole(roleId: string, roleRepresentationInput: RoleInput, ability: Ability) {
  const targetRole = roleMetaObjects[roleId];
  if (!targetRole) throw new Error('Role not found');

  const roleRepresentation = RoleInputSchema.parse(roleRepresentationInput);

  // Casl isn't really built to check the value of input fields when updating, so we have to perform this two checks
  if (
    !(
      ability.checkInputFields(toCaslResource('Role', targetRole), 'update', roleRepresentation) &&
      ability.can('create', toCaslResource('Role', roleRepresentation))
    )
  )
    throw new UnauthorizedError();

  // merge and save at local cache
  // @ts-ignore
  mergeIntoObject(roleMetaObjects[roleId], roleRepresentation, true);
  roleMetaObjects[roleId].lastEdited = new Date().toUTCString();

  Object.keys(roleMetaObjects[roleId].permissions).forEach((key) => {
    if (roleMetaObjects[roleId].permissions[key as ResourceType] === 0)
      delete roleMetaObjects[roleId].permissions[key as ResourceType];
  });

  // persist updated role on file system
  store.update('roles', roleId, roleMetaObjects[roleId]);

  return roleMetaObjects[roleId];
}

/**
 * Deletes a role from the PROCEED MS
 *
 * @throws {UnauthorizedError}
 * @throws {Error}
 */
export async function deleteRole(roleId: string, ability: Ability) {
  const role = roleMetaObjects[roleId];
  if (!role) throw new Error('Role not found');

  if (!ability.can('delete', toCaslResource('Role', role))) throw new UnauthorizedError();

  // remove from local cache
  delete roleMetaObjects[roleId];

  // remove from file system
  store.remove('roles', roleId);

  Object.keys(roleMappingsMetaObjects.users).forEach((userId) => {
    const index = roleMappingsMetaObjects.users[userId].findIndex(
      //TODO remove any
      (mapping: any) => mapping.roleId === roleId,
    );
    if (index > -1) {
      roleMappingsMetaObjects.users[userId].splice(index, 1);
    }

    if (roleMappingsMetaObjects.users[userId].length === 0)
      delete roleMappingsMetaObjects.users[userId];
  });

  // persist new role mapping in file system
  store.setDictElement('roleMappings', {
    roleMappings: {
      users: { ...roleMappingsMetaObjects.users },
    },
  });
}
