import { roleMetaObjects } from '../../../shared-electron-server/data/iam/roles.js';
import { roleMappingsMetaObjects } from '../../../shared-electron-server/data/iam/role-mappings.js';

/**
 * builds permission for user that wants to authenticate
 *
 * @param {String} userId - id of user
 * @return {Object} - object of permissions
 */
export const buildPermissions = async (userId, takeExpirationIntoAccount = true) => {
  if (userId) {
    let userRoles = [];
    // get all roles of user with userId
    if (roleMappingsMetaObjects.users.hasOwnProperty(userId)) {
      roleMappingsMetaObjects.users[userId].forEach((role) => {
        const roleObject = roleMetaObjects[role.roleId];
        if (
          !takeExpirationIntoAccount ||
          roleObject.expiration === null ||
          new Date(roleObject.expiration) > new Date()
        )
          userRoles.push(roleMetaObjects[role.roleId]);
      });
    }
    // get default role, necessary for permissions for everyone
    const defaultRole = Object.values(roleMetaObjects).find(
      (role) => role.default && role.name === '@everyone'
    );
    const permissions = {};
    if (defaultRole.permissions) {
      Object.keys(defaultRole.permissions).forEach((resource) => {
        permissions[resource] = permissions[resource]
          ? [...permissions[resource], defaultRole.permissions[resource]]
          : [defaultRole.permissions[resource]];
      });
    }
    // get admin role
    const adminRole = Object.values(roleMetaObjects).find(
      (role) => role.default && role.name === '@admin'
    );
    // assign admin role if user is admin
    if (adminRole.members.map((member) => member.userId).includes(userId)) {
      Object.keys(adminRole.permissions).forEach((resource) => {
        permissions[resource] = permissions[resource]
          ? [...permissions[resource], adminRole.permissions[resource]]
          : [adminRole.permissions[resource]];
      });
    }
    // merge permissions for each user role
    userRoles.forEach((role) => {
      if (role.permissions) {
        Object.keys(role.permissions).forEach((resource) => {
          permissions[resource] = permissions[resource]
            ? [...permissions[resource], role.permissions[resource]]
            : [role.permissions[resource]];
        });
      }
    });
    Object.keys(permissions).forEach((resource) => {
      permissions[resource] = [...new Set(permissions[resource])];
    });

    return permissions;
  } else {
    // assign guest role if user is not authenticated
    const guestRole = Object.values(roleMetaObjects).find(
      (role) => role.default && role.name === '@guest'
    );
    const permissions = { ...guestRole.permissions };
    return permissions;
  }
};
