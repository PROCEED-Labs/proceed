import restRequest from '@/frontend/backend-api/ms-api-interface/rest.js';

async function getAllUsers() {
  const users = await restRequest('users');
  return users;
}

async function getUserById(userId) {
  const user = await restRequest(`users/${userId}`);
  return user;
}

async function getRolesFromUser(userId) {
  const roles = await restRequest(`users/${userId}/roles`);
  return roles;
}

async function getGroupsFromUser(userId) {
  const groups = await restRequest(`users/${userId}/groups`);
  return groups;
}

async function addUser(user) {
  const userId = await restRequest('users', undefined, 'POST', 'application/json', user);
  return userId;
}

async function addRoleForUser(userId, roles) {
  const user = await restRequest(
    `users/${userId}/roles`,
    undefined,
    'POST',
    'application/json',
    roles
  );
  return user;
}

async function updateUser(userId, user) {
  const id = await restRequest(`users/${userId}`, undefined, 'PUT', 'application/json', user);
  return id;
}

async function updatePassword(userId, password) {
  const id = await restRequest(
    `users/${userId}/update-password`,
    undefined,
    'PUT',
    'application/json',
    { password }
  );
  return id;
}

async function deleteRoleFromUser(userId, roles) {
  const user = await restRequest(
    `users/${userId}/roles`,
    undefined,
    'DELETE',
    'application/json',
    roles
  );
  return user;
}

async function deleteUser(id) {
  const userId = await restRequest(`users/${id}`, undefined, 'DELETE');
  return userId;
}

export default {
  getAllUsers,
  getUserById,
  getRolesFromUser,
  getGroupsFromUser,
  addUser,
  addRoleForUser,
  deleteRoleFromUser,
  updateUser,
  updatePassword,
  deleteUser,
};
