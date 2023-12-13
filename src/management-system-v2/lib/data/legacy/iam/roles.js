import { v4 } from 'uuid';
import store from '../store.js';
import { roleMigrations } from './migrations/role-migrations.js';
import { mergeIntoObject } from '../../../helpers/javascriptHelpers';
import { roleMappingsMetaObjects } from './role-mappings.js';

/** @type {any} - object containing all roles */
export let roleMetaObjects = global.roleMetaObjects || (global.roleMetaObjects = {});

/**
 * initializes the roles meta information objects
 */
export function init() {
  roleMetaObjects = {};

  // get roles that were persistently stored
  const storedRoles = store.get('roles');

  // set roles store
  store.set('roles', 'roles', storedRoles);

  // migrate roles
  roleMigrations.forEach((role) => {
    const index = storedRoles.findIndex((storedRole) => storedRole.name === role.name);
    if (index < 0) addRole(role);
  });

  // set roles store cache for quick access
  storedRoles.forEach((role) => (roleMetaObjects[role.id] = role));
}
init();

/**
 * Returns all roles in form of an array
 *
 * @returns {Array} - array containing all roles
 */
export function getRoles() {
  return Object.values(roleMetaObjects);
}

/**
 * Returns a role based on role id
 *
 * @param {String} roleId - the id of a role
 * @returns {Object} - role object
 */
export function getRoleById(roleId) {
  return roleMetaObjects[roleId];
}

/**
 * Adds a new role for the PROCEED MS
 *
 * @param {Object} roleRepresentation - role representation
 * @returns {Object} - newly created role
 */
export async function addRole(roleRepresentation) {
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
 * @param {String} roleId - if of role
 * @param {Object} roleRepresentation - role representation
 * @returns {Object} - updated role
 */
export async function updateRole(roleId, roleRepresentation) {
  if (!roleMetaObjects[roleId]) {
    throw new Error('Role not found');
  }

  // merge and save at local cache
  await mergeIntoObject(roleMetaObjects[roleId], roleRepresentation, true);
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
 * @param {String} roleId - the id of a role
 */
export async function deleteRole(roleId) {
  if (!roleMetaObjects[roleId]) {
    throw new Error('Role not found');
  }

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
}
