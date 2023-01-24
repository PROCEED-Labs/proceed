import restRequest from '@/frontend/backend-api/ms-api-interface/rest.js';

async function getRoles() {
  const roles = await restRequest('roles');
  return roles;
}

async function getRoleById(roleId) {
  const role = await restRequest(`roles/${roleId}`);
  return role;
}

async function addRole(role) {
  const roleId = await restRequest('roles', undefined, 'POST', 'application/json', role);
  return roleId;
}

async function updateRoleById(roleId, role) {
  const id = await restRequest(`roles/${roleId}`, undefined, 'PUT', 'application/json', role);
  return id;
}

async function deleteRoleById(id) {
  const roleId = await restRequest(`roles/${id}`, undefined, 'DELETE');
  return roleId;
}

export default {
  getRoles,
  getRoleById,
  addRole,
  updateRoleById,
  deleteRoleById,
};
