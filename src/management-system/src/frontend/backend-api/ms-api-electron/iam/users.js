// currently fetched from authorization server and not from the backend,
// therefore these functions are mocked
async function getAllUsers() {
  return [];
}

async function getUserById(userId) {
  return {};
}

async function getRolesFromUser(userId) {
  return [];
}

async function addUser(user) {
  return {};
}

async function addRoleForUser(userId, roles) {
  return {};
}

async function updateUser(userId, user) {
  return '';
}

async function updatePassword(userId, password) {
  return '';
}

async function deleteRoleFromUser(userId, roles) {
  return {};
}

async function deleteUser(id) {
  return '';
}

export default {
  getAllUsers,
  getUserById,
  getRolesFromUser,
  addUser,
  addRoleForUser,
  deleteRoleFromUser,
  updateUser,
  updatePassword,
  deleteUser,
};
