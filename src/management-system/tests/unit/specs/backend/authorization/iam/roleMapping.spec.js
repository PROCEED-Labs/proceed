const { users, abilitiesBuilt, buildAbility } = require('../authorization');
const {
  toCaslResource,
} = require('../../../../../../src/backend/server/iam/authorization/caslRules');
const {
  permissionNumberToIdentifiers,
} = require('../../../../../../src/backend/server/iam/authorization/permissionHelpers');

let adminAbility,
  all_user_permissionsAbility,
  all_role_permissionsAbility,
  selfAbility,
  noRolesAbility,
  unauthenticatedAbility;

beforeAll(async () => {
  const abilities = await abilitiesBuilt;
  adminAbility = abilities[0];
  all_user_permissionsAbility = abilities[3];
  all_role_permissionsAbility = abilities[4];
  selfAbility = abilities[5];
  noRolesAbility = abilities[6];
  unauthenticatedAbility = abilities[8];
});

describe('GET /api/role-mappings', () => {
  // test_get_role_mappings_granted_by_role
  it('Ensure that users are allowed to view PROCEED user role-mappings, if it is granted by a role.', () => {
    const mockRoleMapping = {
      roleId: '',
      userId: 'c6ddf0d1-c23d-4a0f-a300-c5fe23c68907',
      id: '0',
    };

    expect(all_user_permissionsAbility.can(permissionNumberToIdentifiers(64), 'RoleMapping')).toBe(
      true,
    );
    expect(all_user_permissionsAbility.can('view', 'RoleMapping')).toBe(true);
    expect(
      all_user_permissionsAbility.can(
        permissionNumberToIdentifiers(64),
        toCaslResource('RoleMapping', mockRoleMapping),
      ),
    ).toBe(true);
    expect(
      all_user_permissionsAbility.can('view', toCaslResource('RoleMapping', mockRoleMapping)),
    ).toBe(true);
  });

  // test_get_role_mappings_not_granted_by_role
  it('Ensure that users are not allowed to view PROCEED user role-mappings, if it is not granted by a role.', () => {
    const mockRoleMapping = {
      roleId: '',
      userId: 'c6ddf0d1-c23d-4a0f-a300-c5fe23c68907',
      id: '0',
    };

    expect(
      all_role_permissionsAbility.can('view', toCaslResource('RoleMapping', mockRoleMapping)),
    ).toBe(false);
    expect(all_role_permissionsAbility.can(permissionNumberToIdentifiers(64), 'RoleMapping')).toBe(
      false,
    );
  });

  // test_get_role_mappings_admin
  it('Ensure that admin users are allowed to view PROCEED user role-mappings.', () => {
    const mockRoleMapping = {
      roleId: '',
      userId: 'c6ddf0d1-c23d-4a0f-a300-c5fe23c68907',
      id: '0',
    };

    expect(adminAbility.can('view', toCaslResource('RoleMapping', mockRoleMapping))).toBe(true);
    expect(adminAbility.can(permissionNumberToIdentifiers(64), 'RoleMapping')).toBe(true);
  });
});

describe('GET /api/role-mappings/users/:userId', () => {
  // test_get_role_mapping_of_user_authenticated
  it('Ensure that authenticated users are not allowed to view PROCEED user role-mappings by user id.', () => {
    const mockRoleMapping = {
      roleId: '',
      userId: 'c6ddf0d1-c23d-4a0f-a300-c5fe23c68907',
      id: '0',
    };
    expect(selfAbility.can('view', toCaslResource('RoleMapping', mockRoleMapping))).toBe(false);
  });

  // test_get_role_mapping_of_user_self
  it('Ensure that authenticated users are allowed to view their own PROCEED user role-mappings.', () => {
    const mockRoleMapping = {
      roleId: '',
      userId: users.self.id,
      id: '0',
    };
    expect(selfAbility.can('view', toCaslResource('RoleMapping', mockRoleMapping))).toBe(true);
  });

  // test_get_role_mappings_of_user_admin
  it('Ensure that admin users are allowed to view PROCEED user role-mappings.', () => {
    const mockRoleMapping = {
      roleId: '',
      userId: '',
      id: '0',
    };
    expect(adminAbility.can('view', toCaslResource('RoleMapping', mockRoleMapping))).toBe(true);
  });

  // test_get_role_mappings_of_user_granted_by_role
  it('Ensure that users are allowed to view PROCEED user role-mappings, if it is granted by a role.', () => {
    const mockRoleMapping = {
      roleId: '',
      userId: 'c6ddf0d1-c23d-4a0f-a300-c5fe23c68907',
      id: '0',
    };
    expect(
      all_user_permissionsAbility.can('view', toCaslResource('RoleMapping', mockRoleMapping)),
    ).toBe(true);
  });

  // test_get_role_mappings_of_user_not_granted_by_role
  it('Ensure that users are not allowed to view PROCEED user role-mappings, if it is not granted by a role.', () => {
    const mockRoleMapping = {
      roleId: '',
      userId: 'c6ddf0d1-c23d-4a0f-a300-c5fe23c68907',
      id: '0',
    };
    expect(
      all_role_permissionsAbility.can('view', toCaslResource('RoleMapping', mockRoleMapping)),
    ).toBe(false);
  });
});

describe('POST /api/role-mappings', () => {
  // test_post_role_mappings_authenticated_without_roles
  it('Ensure that authenticated users are not allowed to create new PROCEED user role-mappings.', () => {
    expect(noRolesAbility.can('create', 'RoleMapping')).toBe(false);
    expect(all_role_permissionsAbility.can('create', 'RoleMapping')).toBe(false);
  });

  // test_post_role_mappings_of_user_admin
  it('Ensure that admin users are allowed to create new PROCEED user role-mappings.', () => {
    const mockRoleMapping = {
      roleId: 'd59266f8-0818-4923-8a31-abeff91c4963',
      userId: '',
      id: '0',
    };

    expect(adminAbility.can('create', toCaslResource('RoleMapping', mockRoleMapping))).toBe(true);
  });

  // test_post_role_mappings_of_user_unauthenticated
  it('Ensure that unauthenticated users are not allowed to create new PROCEED user role-mappings.', () => {
    expect(unauthenticatedAbility.can('create', 'RoleMapping')).toBe(false);
  });

  it('Ensure that users are allowed to create new PROCEED user role-mappings, if it is granted by a role.', () => {
    const mockRoleMapping = {
      roleId: '7cf26d82-b40f-443f-a025-84e149042c33',
      userId: '',
      id: '0',
    };

    expect(adminAbility.can('create', toCaslResource('RoleMapping', mockRoleMapping))).toBe(false);
  });

  // test_posts_role_mappings_granted_by_role
  it('Ensure that users are allowed to create new PROCEED user role-mappings, if it is granted by a role.', async () => {
    const user = {
      id: 'tempId',
      roles: ['1943cce1-a88f-4c58-aae6-f74b25730a2c'],
    };
    const ability = await buildAbility(user);
    const mockRoleMapping = {
      roleId: 'd59266f8-0818-4923-8a31-abeff91c4963',
      userId: '',
      id: '0',
    };

    expect(ability.can('create', toCaslResource('RoleMapping', mockRoleMapping))).toBe(true);
  });

  // test_posts_role_mappings_includes_admin_granted
  it('Ensure that users are allowed to create new PROCEED user role-mappings, if role includes admin permissions and user has sufficient permissions.', async () => {
    const user = {
      id: 'tempId',
      roles: ['b52a443b-524a-4054-895b-3fd068b9d78c'],
    };
    const ability = await buildAbility(user);

    const mockRoleMapping = {
      roleId: 'b52a443b-524a-4054-895b-3fd068b9d78c',
      userId: '0',
      id: '0',
    };

    expect(ability.can('create', toCaslResource('RoleMapping', mockRoleMapping))).toBe(false);
  });

  // test_post_role_mappings_not_granted_by_role
  it('Ensure that users are not allowed to create new PROCEED user role-mappings, if it is not granted by a role.', async () => {
    const user = {
      id: '0',
      roles: ['d59266f8-0818-4923-8a31-abeff91c4963'],
    };
    const ability = await buildAbility(user);
    const mockRoleMapping = {
      roleId: '',
      userId: '0',
      id: '0',
    };

    expect(ability.can('create', 'RoleMapping')).toBe(false);
    expect(ability.can('create', toCaslResource('RoleMapping', mockRoleMapping))).toBe(false);
  });
});

describe('DELETE /api/role-mappings/users/:userId/roles/:roleId', () => {
  // test_delete_role_mappings_authenticated_without_roles
  it('Ensure that authenticated users are not allowed to delete PROCEED user role-mappings.', () => {
    expect(noRolesAbility.can('delete', 'RoleMapping')).toBe(false);
  });

  // test_delete_role_mappings_admin_granted
  it('Ensure that admin users are allowed to delete PROCEED user role-mappings.', () => {
    const mockRoleMapping = {
      roleId: '',
      userId: '',
      id: '',
    };

    expect(
      adminAbility.can(
        'create',
        toCaslResource('RoleMapping', {
          roleId: '7cf26d82-b40f-443f-a025-84e149042c33',
          userId: '',
          id: '0',
        }),
      ),
    ).toBe(false);

    expect(adminAbility.can('delete', 'RoleMapping')).toBe(true);
    expect(adminAbility.can('delete', toCaslResource('RoleMapping', mockRoleMapping))).toBe(true);
  });

  // // test_delete_role_mappings_unauthenticated
  it('Ensure that unauthenticated users are not allowed to create new PROCEED user role-mappings.', () => {
    const roleMapping = {
      roleId: '1943cce1-a88f-4c58-aae6-f74b25730a2c',
      userId: '2e9e3b25-4967-4e99-b9bf-01ba27f94d7c',
      id: '0',
    };
    expect(unauthenticatedAbility.can('delete', toCaslResource('RoleMapping', roleMapping))).toBe(
      false,
    );
  });

  // test_delete_role_mappings_granted_by_role
  it('Ensure that users are allowed to delete PROCEED user role-mappings, if it is granted by a role.', () => {
    const mockRoleMapping = {
      roleId: '',
      userId: '',
      id: '',
    };

    expect(all_user_permissionsAbility.can('delete', 'RoleMapping')).toBe(true);
    expect(
      all_user_permissionsAbility.can('delete', toCaslResource('RoleMapping', mockRoleMapping)),
    ).toBe(true);
  });

  // test_delete_role_mappings_includes_admin_granted
  it('Ensure that users are not allowed to delete PROCEED user role-mappings, because role includes admin permissions.', async () => {
    const user = {
      id: 'tempId',
      roles: ['b52a443b-524a-4054-895b-3fd068b9d78c', '1943cce1-a88f-4c58-aae6-f74b25730a2c'],
    };
    const ability = await buildAbility(user);
    const mockRoleMapping = {
      roleId: 'b52a443b-524a-4054-895b-3fd068b9d78c',
      userId: '2e9e3b25-4967-4e99-b9bf-01ba27f94d7c',
      id: '0',
    };

    expect(ability.can('delete', toCaslResource('RoleMapping', mockRoleMapping))).toBe(true);
  });

  // test_delete_role_mappings_not_granted_by_role
  it('Ensure that users are not allowed to delete PROCEED user role-mappings, if it is not granted by a role.', () => {
    expect(all_role_permissionsAbility.can('delete', 'RoleMapping')).toBe(false);
  });
});
