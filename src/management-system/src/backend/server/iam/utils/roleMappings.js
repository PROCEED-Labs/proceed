import { roleMappingsMetaObjects } from '../../../shared-electron-server/data/iam/role-mappings.js';
import { roleMetaObjects } from '../../../shared-electron-server/data/iam/roles.js';
import store from '../../../shared-electron-server/data/store.js';

/**
 * cleans up role mappings and roles members when a user is deleted
 *
 * @param {String} userId - the id of the user
 */
export const ensureCleanRoleMappings = async (userId) => {
  if (roleMappingsMetaObjects.users[userId]) {
    const roles = roleMappingsMetaObjects.users[userId];
    delete roleMappingsMetaObjects.users[userId];
    roles.forEach((role) => {
      const index = roleMetaObjects[role.roleId].members.findIndex(
        (member) => member.userId === userId
      );
      if (index > -1) {
        roleMetaObjects[role.roleId].members.splice(index, 1);
      }
      store.update('roles', role.roleId, roleMetaObjects[role.roleId]);
    });

    store.setDictElement('roleMappings', {
      roleMappings: {
        users: { ...roleMappingsMetaObjects.users },
      },
    });
  }
};
