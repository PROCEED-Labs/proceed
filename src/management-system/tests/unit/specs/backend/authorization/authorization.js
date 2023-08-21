export const processes = require('../../../../data/authorization/processes.json');
export const roles = require('../../../../data/authorization/roles.json');
export const shares = require('../../../../data/authorization/shares.json');
export const users = require('../../../../data/authorization/users.json');
import Ability from '../../../../../src/backend/server/iam/authorization/abilityHelper';
import {
  rulesForUser,
  setGlobalRolesForAuthorization,
} from '../../../../../src/backend/server/iam/authorization/caslRules';
import {
  addRoleMapping,
  deleteRoleMapping,
  getRoleMappings,
} from '../../../../../src/backend/shared-electron-server/data/iam/role-mappings';

jest.mock('../../../../../src/backend/shared-electron-server/data/store', () => ({
  setDictElement(...args) {},
  update(...args) {},
  set(...args) {},
  get(key) {
    if (key === 'roleMappings')
      return {
        roleMappings: { users: [] },
      };
  },
}));

jest.mock('../../../../../src/backend/shared-electron-server/data/iam/shares', () => {
  const mockShares = jest.requireActual('../../../../data/authorization/shares.json');

  return {
    __esModule: true,
    async getShares() {
      return Object.values(Object.values(Object.values(mockShares)[0]))
        .map((obj) => Object.values(obj))
        .flat();
    },
    sharesMetaObjects: mockShares,
  };
});

jest.mock('../../../../../src/backend/shared-electron-server/data/iam/roles', () => {
  return {
    __esModule: true,
    roleMetaObjects: jest.requireActual('../../../../data/authorization/roles.json'),
  };
});

setGlobalRolesForAuthorization({
  everybodyRole: '4242450a-eb22-4ce4-9cb0-1c2f74ba6546',
  guestRole: '7cf26d82-b40f-443f-a025-84e149042c33',
});

export const processArray = Object.keys(processes).map((key) => processes[key]);

export function buildPermissionsObject(user) {
  const permissionsObject = {};
  const userRoles = [...(user.roles || []), '7cf26d82-b40f-443f-a025-84e149042c33'];

  for (const roleId of userRoles) {
    const rolePermissions = roles[roleId].permissions;

    for (const resource of Object.keys(rolePermissions)) {
      permissionsObject[resource] = permissionsObject[resource]
        ? permissionsObject[resource].push(rolePermissions[resource])
        : [rolePermissions[resource]];
    }
  }

  return permissionsObject;
}

export async function buildAbility(user) {
  try {
    // clear role mappings for this user
    const userMappings = getRoleMappings().filter((mapping) => mapping.userId === user.id);
    for (const roleMapping of userMappings) {
      await deleteRoleMapping(roleMapping.userId, roleMapping.roleId);
    }
  } catch (e) {}

  // add new role mappings for this user
  if (user.roles) {
    await addRoleMapping(user.roles.map((roleId) => ({ roleId, userId: user.id })));
  }
  const rules = await rulesForUser(user.id);
  return new Ability(rules);
}

async function buildAbilities() {
  return await Promise.all([
    buildAbility(users.admin),
    buildAbility(users.environment_admin),
    buildAbility(users.process_engineer_admin),
    buildAbility(users.all_user_permissions),
    buildAbility(users.all_role_permissions),
    buildAbility(users.self),
    buildAbility(users.expired_role),
    buildAbility({ id: 'noRolesId' }),
    buildAbility({ id: '' }),
  ]);
}

export const abilitiesBuilt = buildAbilities();
