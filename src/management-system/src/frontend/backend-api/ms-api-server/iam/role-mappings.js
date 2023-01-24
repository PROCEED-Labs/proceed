import restRequest from '@/frontend/backend-api/ms-api-interface/rest.js';

async function getAllRoleMappings() {
  const roleMappings = await restRequest('role-mappings');
  return roleMappings;
}

async function getRolesFromUser(userId) {
  const roles = await restRequest(`role-mappings/users/${userId}`);
  return roles;
}

async function addRoleMappings(roleMappings) {
  await restRequest('role-mappings', undefined, 'POST', 'application/json', roleMappings);
}

async function deleteRoleMapping(userId, roleId) {
  await restRequest(`role-mappings/users/${userId}/roles/${roleId}`, undefined, 'DELETE');
}

export default {
  getAllRoleMappings,
  getRolesFromUser,
  addRoleMappings,
  deleteRoleMapping,
};
