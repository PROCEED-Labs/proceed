import { v4 } from 'uuid';
import store from '../store.js';
import { roleMetaObjects } from './roles.js';

/** @type {any} - object containing all role mappings */
export let roleMappingsMetaObjects = {};

/**
 * Returns all role mappings in form of an array
 *
 * @returns {Array} - array containing all role mappings
 */
export function getRoleMappings() {
  return Object.values(roleMappingsMetaObjects.users).flat();
}

/**
 * Returns a role mapping by user id
 *
 * @param {String} userId - the id of a user
 * @returns {Array} - role mappings of a user
 */
export function getRoleMappingByUserId(userId) {
  return roleMappingsMetaObjects.users[userId];
}

// TODO: also check if user exists?
/**
 * Adds a user role mapping
 *
 * @param {Object} roleMapping - role mapping object containing userId & roleId
 * @returns {Object} - new user role mapping
 */
export async function addRoleMapping(roleMappings) {
  roleMappings.forEach((roleMapping) => {
    const { roleId, userId } = roleMapping;
    if (roleId && userId) {
      let role = roleMetaObjects[roleId];
      if (!role.hasOwnProperty('id')) {
        role = store.getById('roles', roleId);
        if (!role.hasOwnProperty('id')) throw new Error('Role not found');
      }

      const id = v4();
      const createdOn = new Date().toUTCString();

      const newRoleMapping = {
        id,
        roleId,
        userId,
        roleName: role.name,
        createdOn,
      };

      if (role.expiration) roleMapping.expiration = role.expiration;

      // store new role mapping in local cache
      if (roleMappingsMetaObjects.users && roleMappingsMetaObjects.users[userId]) {
        const index = roleMappingsMetaObjects.users[userId].findIndex(
          (mapping) => mapping.roleId === roleId,
        );
        if (index > -1) throw new Error('Role mapping already exists');
        roleMappingsMetaObjects.users[userId].push(newRoleMapping);
      } else {
        roleMappingsMetaObjects.users = {
          ...roleMappingsMetaObjects.users,
          [userId]: [newRoleMapping],
        };
      }

      roleMetaObjects[roleId].members.push({
        userId: roleMapping.userId,
        username: roleMapping.username,
        firstName: roleMapping.firstName,
        lastName: roleMapping.lastName,
        email: roleMapping.email,
      });

      // persist new role mapping in file system
      store.setDictElement('roleMappings', {
        roleMappings: {
          users: { ...roleMappingsMetaObjects.users },
        },
      });

      store.update('roles', roleId, roleMetaObjects[roleId]);
    }
  });
}

// TODO: also check if user exists?
/**
 * Removes a role mapping from a user
 *
 * @param {String} userId - id of user
 * @param {String} roleId - role mapping that has to be removed based on roleId
 * @returns {Object} - new mapping object without removed element
 */
export async function deleteRoleMapping(userId, roleId) {
  if (userId && roleId) {
    if (!roleMappingsMetaObjects.users[userId]) {
      throw new Error('Mapping not found');
    }

    // store new role mapping in local cache
    if (Array.isArray(roleMappingsMetaObjects.users[userId])) {
      const index = roleMappingsMetaObjects.users[userId].findIndex(
        (mapping) => mapping.roleId === roleId,
      );
      if (index < 0) throw new Error('Mapping not found');
      roleMappingsMetaObjects.users[userId].splice(index, 1);
    } else {
      throw new Error('Mapping not found');
    }

    if (roleMappingsMetaObjects.users[userId].length === 0)
      delete roleMappingsMetaObjects.users[userId];

    // persist new role mapping in file system
    store.setDictElement('roleMappings', {
      roleMappings: { users: { ...roleMappingsMetaObjects.users } },
    });

    if (roleMetaObjects[roleId]) {
      const index = roleMetaObjects[roleId].members.findIndex((member) => member.userId === userId);
      if (index > -1) {
        roleMetaObjects[roleId].members.splice(index, 1);
      }
    }

    store.update('roles', roleId, roleMetaObjects[roleId]);
  }
}

/**
 * initializes the role mappings meta information objects
 */
export async function init() {
  roleMappingsMetaObjects = {};

  // get role mappings that were persistently stored
  const storedRoleMappings = store.get('roleMappings');

  // set role mappings store
  store.set('roleMappings', storedRoleMappings);

  roleMappingsMetaObjects.users = storedRoleMappings.roleMappings.users;
}

init();
