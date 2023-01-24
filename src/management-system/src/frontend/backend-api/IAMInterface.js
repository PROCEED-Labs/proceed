import roleApi from './ms-api-interface/iam/roles.js';
import userApi from './ms-api-interface/iam/users.js';
import resourceApi from './ms-api-interface/iam/resources.js';
import roleMappingsApi from './ms-api-interface/iam/role-mappings.js';
import shareApi from './ms-api-interface/iam/shares.js';

/**
 * @class
 *
 * Exposes an interface for interaction with iam endpoints in the backend
 *
 */
class IAMInterface {
  /**
   * @hideconstructor
   */
  constructor() {}

  // USERS

  /**
   * get all users from authorization server
   * @returns {Array} - array of user representations
   */
  async getAllUsers() {
    const users = await userApi.getAllUsers();
    return users;
  }

  /**
   * get the detailled user representation
   *
   * @param {String} userId - the id of the user
   * @returns {Object} - user representation
   */
  async getUserById(userId) {
    const user = await userApi.getUserById(userId);
    return user;
  }

  /**
   * get the groups from a user
   *
   * @param {String} userId - the id of the user
   * @returns {Array} - array of group representations
   */
  async getGroupsFromUser(userId) {
    const groups = await userApi.getGroupsFromUser(userId);
    return groups;
  }

  /**
   * add a new user to the realm
   *
   * @param {Object} user - representation of a user, MUST additionally contain key "password" with temporary password for user
   * @returns {String} - id of created user
   */
  async addUser(user) {
    const userId = await userApi.addUser(user);
    return userId;
  }

  /**
   * add roles to a specified user
   *
   * @param {String} userId - the id of the user
   * @param {Array} roles - array of role representations for the user
   * @returns {Object} - id of the user
   */
  async addRoleForUser(userId, roles) {
    const user = await userApi.addRoleForUser(userId, roles);
    return user.to;
  }

  /**
   * update a specified user
   *
   * @param {String} userId - the id of the user
   * @param {Object} user - updated representation of a user
   * @returns {String} - id of updated user
   */
  async updateUser(userId, user) {
    const id = await userApi.updateUser(userId, user);
    return id;
  }

  /**
   * updates password of a user
   *
   * @param {String} userId - the id of the user
   * @param {String} password - new password for user
   * @returns {String} - id of updated user
   */
  async updatePassword(userId, password) {
    const id = await userApi.updatePassword(userId, password);
    return id;
  }

  /**
   * remove a role of a specified user
   *
   * @param {String} userId - the id of the user
   * @param {Array} roles - array of role representations
   * @returns {Object} - id of the user
   */
  async deleteRoleFromUser(userId, roles) {
    const user = await userApi.deleteRoleFromUser(userId, roles);
    return user.from;
  }

  /**
   * delete a user
   *
   * @param {String} userId - the id of the user
   * @returns {String} - id of deleted user
   */
  async deleteUser(userId) {
    const id = await userApi.deleteUser(userId);
    return id;
  }

  // ROLES

  /**
   * get role representation if name is set, otherwise returns all roles
   * @param {String} name - name of role
   * @returns {Object|Array} - role representation or array of role representations
   */
  async getRoles(name = null) {
    const roles = await roleApi.getRoles(name);
    return roles;
  }

  /**
   * get the detailled role information of a role
   *
   * @param {String} roleId - the id of the role
   * @returns {Object} - role representation
   */
  async getRoleById(roleId) {
    const role = await roleApi.getRoleById(roleId);
    return role;
  }

  /**
   * add a role
   *
   * @param {String} role - role representation
   * @returns {String} - name of created role
   */
  async addRole(role) {
    const name = await roleApi.addRole(role);
    return name;
  }

  /**
   * update an existing role
   *
   * @param {String} roleId - the id of the existing role
   * @param {Object} role - updated role representation
   * @returns {String} - id of updated role
   */
  async updateRoleById(roleId, role) {
    const id = await roleApi.updateRoleById(roleId, role);
    return id;
  }

  /**
   * delete an existing role
   *
   * @param {String} roleId - the id of the existing role
   * @returns {String} - id of deleted role
   */
  async deleteRoleById(roleId) {
    const id = await roleApi.deleteRoleById(roleId);
    return id;
  }

  // Resources

  /**
   * get all resources
   * @returns {Array} - all resources
   */
  async getResources() {
    const resources = await resourceApi.getResources();
    return resources;
  }

  // Role Mappings

  /**
   * get the roles from a user
   *
   * @param {String} userId - the id of the user
   * @returns {Array} - array of role representations
   */
  async getRolesFromUser(userId) {
    const roles = await roleMappingsApi.getRolesFromUser(userId);
    return roles;
  }

  async addRoleMappings(roleMappings) {
    await roleMappingsApi.addRoleMappings(roleMappings);
  }

  async deleteRoleMapping(userId, roleId) {
    await roleMappingsApi.deleteRoleMapping(userId, roleId);
  }

  // SHARES

  /**
   * get all shares (user, group and link sharings)
   * @param {String} query - query string to filter shares - available query string are resourceId (id of a resource), resourceType (type of a resource e.g. Process), shareType (type of a share e.g. 0 = user sharing), userId (id of a user)
   * @returns {Array} - shares array
   */
  async getShares(query = undefined) {
    const shares = await shareApi.getShares(query);
    return shares;
  }

  /**
   * get a share by id
   *
   * @param {String} shareId - the id of of a share object
   * @returns {Object} - share object
   */
  async getShareById(shareId) {
    const share = await shareApi.getShareById(shareId);
    return share;
  }

  /**
   * add a new share
   *
   * @param {Object} share - the new share object
   * @param {Number} share.permissions - allowed permissions (mandatory)
   * @param {String} share.resourceType - type of resource (mandatory)
   * @param {String} share.resourceId - id of resource (mandatory)
   * @param {0|1|2} share.type - type of sharing (mandatory) - 0 = sharing from user to user, 1 = sharing from user to group, 2 = link sharing
   * @param {String} share.sharedWith - id of a user (mandatory if not link sharing)
   * @param {String} share.password - password for a link sharing (only for type link, optional)
   * @param {Date} share.expiredAt - date when a sharing should expire (optional)
   * @param {String} share.note - a note for users that receive the sharing (optional)
   * @returns {Object} - new share object
   */
  async addShare(share) {
    const newShare = await shareApi.addShare(share);
    return newShare;
  }

  /**
   * update an existing share
   *
   * @param {String} shareId - the id of a share object
   * @param {Object} share - the updated share object properties
   * @param {Number} share.permissions - allowed permissions (optional)
   * @param {String} share.password - password for a link sharing (only for type link, optional)
   * @param {Date} share.expiredAt - date when a sharing should expire (optional)
   * @param {String} share.note - a note for users that receive the sharing (optional)
   * @returns {Object} - updated share object
   */
  async updateShareById(shareId, share) {
    const updatedShare = await shareApi.updateShare(shareId, share);
    return updatedShare;
  }

  /**
   * delete an existing share
   *
   * @param {String} shareId - the id of a share object
   * @returns {String} - id of deleted share object
   */
  async deleteShareById(shareId, query = undefined) {
    const id = await shareApi.deleteShareById(shareId, query);
    return id;
  }
}

export default IAMInterface;
