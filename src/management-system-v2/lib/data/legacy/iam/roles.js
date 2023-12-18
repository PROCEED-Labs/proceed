import { v4 } from 'uuid';
import store from '../store.js';
import { roleMigrations } from './migrations/role-migrations.js';
import { mergeIntoObject } from '../../../helpers/javascriptHelpers';
import { addRoleMappings, roleMappingsMetaObjects } from './role-mappings.js';
import { ApiData, ApiRequestBody } from '@/lib/fetch-data';
import Ability, { UnauthorizedError } from '@/lib/ability/abilityHelper';
import { toCaslResource } from '@/lib/ability/caslAbility';
import { adminRules } from '@/lib/authorization/caslRules.ts';
import { developmentRoleMappingsMigrations } from './migrations/role-mappings-migrations.js';

let firstInit = !global.roleMetaObjects;

/** @type {any} - object containing all roles */
export let roleMetaObjects = global.roleMetaObjects || (global.roleMetaObjects = {});

/**
 * initializes the roles meta information objects
 */
export function init() {
  if (!firstInit) return;

  // get roles that were persistently stored
  const storedRoles = store.get('roles');

  // set roles store
  store.set('roles', 'roles', storedRoles);

  // migrate roles
  roleMigrations.forEach((role) => {
    const index = storedRoles.findIndex((storedRole) => storedRole.name === role.name);
    if (index >= 0) return;

    const { id: roleId, name } = addRole(role, new Ability(adminRules()));

    if (process.env.NODE_ENV === 'development') {
      const roleMappings = developmentRoleMappingsMigrations
        .filter((mapping) => mapping.roleName === name)
        .map((mapping) => ({
          roleId,
          userId: mapping.userId,
        }));

      addRoleMappings(roleMappings, new Ability(adminRules()));
    }
  });

  // set roles store cache for quick access
  storedRoles.forEach((role) => (roleMetaObjects[role.id] = role));
}
init();

/**
 * Returns all roles in form of an array
 *
 * @param {Ability} [ability]
 *
 * @returns {ApiData<'/roles','get'>} - array containing all roles
 */
export function getRoles(ability) {
  const roles = Object.values(roleMetaObjects);

  return ability ? ability.filter('view', 'Process', roles) : roles;
}

/**
 * Returns a role based on role id
 *
 * @throws {UnauthorizedError}
 *
 * @param {String} roleId - the id of a role
 * @param {Ability} ability
 *
 * @returns {ApiData<'/roles/{id}','get'> | undefined} - role object
 */
export function getRoleById(roleId, ability) {
  const role = roleMetaObjects[roleId];

  if (role && !ability.can('view', toCaslResource('Role', role))) throw new UnauthorizedError();

  return role;
}

/**
 * Adds a new role for the PROCEED MS
 *
 * @throws {UnauthorizedError}
 * @throws {Error}
 *
 * @param {ApiRequestBody<'/roles','post'> } roleRepresentation - role representation
 * @param {Ability} ability
 *
 * @returns {ApiData<'/roles/{id}','get'> } - role object
 */
export function addRole(roleRepresentation, ability) {
  if (!ability.can('create', toCaslResource('Role', roleRepresentation)))
    throw new UnauthorizedError();

  const { name, description, note, permissions, expiration } = roleRepresentation;

  const index = Object.values(roleMetaObjects).findIndex((role) => role.name === name);
  if (index > -1) throw new Error('Role already exists');

  const createdOn = new Date().toUTCString();
  const lastEdited = createdOn;
  const id = v4();

  const role = {
    name,
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
 *
 * @param {String} roleId - if of role
 * @param {ApiRequestBody<'/roles/{id}','put'> } roleRepresentation - role representation
 * @param {Ability} ability
 *
 * @returns {ApiData<'/roles/{id}','get'> } - updated role
 */
export function updateRole(roleId, roleRepresentation, ability) {
  const targetRole = roleMetaObjects[roleId];

  if (!targetRole) throw new Error('Role not found');

  // Casl isn't really built to check the value of input fields when updating, so we have to perform this two checks
  if (
    !(
      ability.checkInputFields(toCaslResource('Role', targetRole), 'update', roleRepresentation) &&
      ability.can('create', toCaslResource('Role', roleRepresentation))
    )
  )
    throw new UnauthorizedError();

  // merge and save at local cache
  mergeIntoObject(roleMetaObjects[roleId], roleRepresentation, true);
  roleMetaObjects[roleId].lastEdited = new Date().toUTCString();

  Object.keys(roleMetaObjects[roleId].permissions).forEach((key) => {
    if (roleMetaObjects[roleId].permissions[key] === 0)
      delete roleMetaObjects[roleId].permissions[key];
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
 *
 * @param {String} roleId - the id of a role
 * @param {Ability} ability
 */
export async function deleteRole(roleId, ability) {
  const role = roleMetaObjects[roleId];
  if (!role) throw new Error('Role not found');

  if (!ability.can('delete', toCaslResource('Role', role))) throw new UnauthorizedError();

  // remove from local cache
  delete roleMetaObjects[roleId];

  // remove from file system
  store.remove('roles', roleId);

  Object.keys(roleMappingsMetaObjects.users).forEach((userId) => {
    const index = roleMappingsMetaObjects.users[userId].findIndex(
      (mapping) => mapping.roleId === roleId,
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

  console.log(
    'leftkeys',
    Object.keys(roleMetaObjects).map((r) => roleMetaObjects[r].name),
  );
}
