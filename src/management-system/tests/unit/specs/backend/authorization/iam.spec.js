const { users, roles, abilitiesBuilt, buildAbility } = require('../../../../mocks/authorization');
const { toCaslResource } = require('../../../../../src/backend/server/iam/authorization/caslRules');
const {
  permissionNumberToIdentifiers,
} = require('../../../../../src/backend/server/iam/authorization/permissionHelpers');

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

describe('GET /api/users', () => {
  // test_get_users_authenticated
  it('Test: Ensure that authenticated users can view PROCEED users.', () => {
    expect(noRolesAbility.can(permissionNumberToIdentifiers(1), 'User')).toBe(true);
  });

  //   // test_get_users_unauthenticated
  it("Test: Ensure that unauthenticated users can't view PROCEED users.", () => {
    expect(unauthenticatedAbility.can(permissionNumberToIdentifiers(1), 'User')).toBe(false);
  });
});

describe('GET /api/users/:id', () => {
  // test_get_user_authenticated
  it('Test: Ensure that authenticated users can view PROCEED user by id.', () => {
    const user = { id: 'f0185d7d-b410-4bb5-bf8a-19bdfd0facfe' };

    expect(noRolesAbility.can(permissionNumberToIdentifiers(1), toCaslResource('User', user))).toBe(
      true
    );
  });

  // test_get_user_unauthenticated
  it("Test: Ensure that unauthenticated users can't view PROCEED user by id.", () => {
    const user = { id: 'f0185d7d-b410-4bb5-bf8a-19bdfd0facfe' };

    expect(
      unauthenticatedAbility.can(permissionNumberToIdentifiers(1), toCaslResource('User', user))
    ).toBe(false);
  });
});

describe('POST /api/users', () => {
  // test_post_user_granted_by_role
  it('Test: Ensure that creating new users is granted by a role.', () => {
    expect(all_user_permissionsAbility.can(permissionNumberToIdentifiers(4 + 16), 'User')).toBe(
      true
    );
  });

  // test_post_user_granted_admin
  it('Test: Ensure that creating new users is allowed because user is admin.', () => {
    expect(adminAbility.can(permissionNumberToIdentifiers(4 + 16), 'User')).toBe(true);
  });

  // test_post_user_not_allowed
  it('Test: Ensure that creating new users is not granted by a role and user is not admin.', () => {
    expect(all_role_permissionsAbility.can(permissionNumberToIdentifiers(4), 'User')).toBe(false);
    expect(all_role_permissionsAbility.can(permissionNumberToIdentifiers(16), 'User')).toBe(false);
  });

  // test_post_user_unauthenticated
  it('Test: Ensure that creating new users is not allowed because user is unauthenticated.', () => {
    expect(unauthenticatedAbility.can(permissionNumberToIdentifiers(4), 'User')).toBe(false);
    expect(unauthenticatedAbility.can(permissionNumberToIdentifiers(16), 'User')).toBe(false);
  });
});

describe('PUT /api/users/:id', () => {
  // test_put_user_password_self_granted
  it('Test: Ensure that updating user password is allowed because requester updates his or her password.', () => {
    expect(
      selfAbility.can(
        permissionNumberToIdentifiers(2),
        toCaslResource('User', users.self),
        'password'
      )
    ).toBe(true);
  });

  // test_put_user_granted_admin
  it('Test: Ensure that updating user is allowed because user is admin.', () => {
    const user = users.self;
    expect(
      adminAbility.can(permissionNumberToIdentifiers(2 + 16), toCaslResource('User', user))
    ).toBe(true);
  });

  // test_put_user_self_granted
  it('Test: Ensure that updating user is allowed because requester updates his own resource.', () => {
    // used to include 16
    expect(
      selfAbility.can(permissionNumberToIdentifiers(2), toCaslResource('User', users.self))
    ).toBe(true);

    for (const field of ['email', 'name', 'picture', 'username', 'lastName', 'firstName']) {
      expect(
        selfAbility.can(permissionNumberToIdentifiers(2), toCaslResource('User', users.self), field)
      ).toBe(true);
    }

    expect(
      selfAbility.can(permissionNumberToIdentifiers(2), toCaslResource('User', users.self), 'id')
    ).toBe(false);
  });

  // test_put_user_not_allowed
  it("Test: Ensure that updating user is not allowed because requester updates someone else's resource and requester is not admin.", () => {
    expect(
      all_role_permissionsAbility.can(
        permissionNumberToIdentifiers(2),
        toCaslResource('User', users.self)
      )
    ).toBe(false);
  });

  // test_put_user_unauthenticated
  it('Test: Ensure that updating user is not allowed because requester is unauthenticated.', () => {
    const user = { id: '246990cf-8b8c-40c0-b89b-fe8c4e11090a' };

    expect(
      unauthenticatedAbility.can(permissionNumberToIdentifiers(2), toCaslResource('User', user))
    ).toBe(false);
  });
});

describe('DELETE /api/users/:id', () => {
  // test_delete_user_granted_admin
  it('Test: Ensure that deleting a user is allowed because requester is admin.', () => {
    expect(
      adminAbility.can(permissionNumberToIdentifiers(8 + 16), toCaslResource('User', users.self))
    ).toBe(true);
  });

  // test_delete_user_self_granted
  it('Test: Ensure that deleting a user is allowed because requester deletes his own user.', () => {
    expect(
      selfAbility.can(permissionNumberToIdentifiers(8), toCaslResource('User', users.self))
    ).toBe(true);
  });

  // test_delete_user_not_allowed
  it('Test: Ensure that deleting a user is not allowed because requester deletes not his own user and requester is not admin.', () => {
    expect(
      all_role_permissionsAbility.can(
        permissionNumberToIdentifiers(8),
        toCaslResource('User', users.self)
      )
    ).toBe(false);
  });

  // test_delete_user_unauthenticated
  it('Test: Ensure that deleting a user is not allowed because requester is unauthenticated.', () => {
    const user = { id: '246990cf-8b8c-40c0-b89b-fe8c4e11090a' };

    expect(
      unauthenticatedAbility.can(permissionNumberToIdentifiers(8), toCaslResource('User', user))
    ).toBe(false);
  });
});

describe('GET /api/roles', () => {
  // test_get_roles_authenticated
  it('Test: Ensure that authenticated users can view PROCEED roles.', () => {
    expect(noRolesAbility.can(permissionNumberToIdentifiers(1), 'Role')).toBe(true);
  });

  // test_get_roles_unauthenticated
  it("Test: Ensure that unauthenticated users can't view PROCEED roles.", () => {
    expect(unauthenticatedAbility.can(permissionNumberToIdentifiers(1), 'Role')).toBe(false);
  });
});

describe('GET /api/roles/:id', () => {
  // test_get_role_authenticated
  it('Test: Ensure that authenticated users can view PROCEED role by id.', () => {
    expect(noRolesAbility.can(permissionNumberToIdentifiers(1), toCaslResource('Role', {}))).toBe(
      true
    );
  });

  // test_get_role_unauthenticated
  it("Test: Ensure that unauthenticated users can't view PROCEED role by id.", () => {
    const role = roles['114db4a8-9109-4f20-b1b3-6efb21dd23d2'];
    expect(
      unauthenticatedAbility.can(permissionNumberToIdentifiers(1), toCaslResource('Role', role))
    ).toBe(false);
  });
});

describe('POST /api/roles', () => {
  // test_post_role_granted_by_role
  it('Test: Ensure that creating new roles is granted by a role.', () => {
    expect(all_role_permissionsAbility.can(permissionNumberToIdentifiers(4 + 16), 'Role')).toBe(
      true
    );
  });

  // test_post_role_granted_admin
  it('Test: Ensure that creating new roles is allowed because user is admin.', () => {
    expect(adminAbility.can(permissionNumberToIdentifiers(4 + 16), 'Role')).toBe(true);
  });

  // test_post_role_not_granted_by_role
  it('Test: Ensure that creating new roles is not granted by a role and user is not admin.', () => {
    expect(all_user_permissionsAbility.can(permissionNumberToIdentifiers(16), 'Role')).toBe(false);
    expect(all_user_permissionsAbility.can(permissionNumberToIdentifiers(4), 'Role')).toBe(false);
  });

  // test_post_role_unauthenticated
  it('Test: Ensure that creating new roles is not allowed because user is unauthenticated.', () => {
    expect(unauthenticatedAbility.can(permissionNumberToIdentifiers(4), 'Role')).toBe(false);
  });
});

describe('PUT /api/roles/:id', () => {
  // test_put_role_granted_because_admin_allowed
  it('Test: Ensure that updating role is allowed because user is admin.', () => {
    const role = roles['1943cce1-a88f-4c58-aae6-f74b25730a2c'];
    const update = {
      name: 'user_manager',
      default: false,
      permissions: {
        Process: 8,
        Project: 0,
      },
    };
    expect(adminAbility.can('update', toCaslResource('Role', role))).toBe(true);
    expect(adminAbility.checkInputFields(toCaslResource('Role', role), 'update', update)).toBe(
      true
    );
  });

  // test_put_role_granted_by_role
  it('Test: Ensure that updating role is allowed because it is granted by a role.', () => {
    const role = roles['1943cce1-a88f-4c58-aae6-f74b25730a2c'];
    const update = {
      name: 'user_manager',
      default: false,
      permissions: {
        Process: 8,
        Project: 0,
      },
    };
    expect(all_role_permissionsAbility.can('update', toCaslResource('Role', role))).toBe(true);
    expect(
      all_role_permissionsAbility.checkInputFields(toCaslResource('Role', role), 'update', update)
    ).toBe(true);
  });

  // test_put_role_includes_admin_granted
  it('Test: Ensure that updating role is allowed because it includes admin permissions and has sufficient admin permissions.', async () => {
    const role = roles['1943cce1-a88f-4c58-aae6-f74b25730a2c'];
    const user = {
      id: 'tempId',
      roles: ['d19a443b-524a-4054-895b-3fd068b9de42', 'd59266f8-0818-4923-8a31-abeff91c4963'],
    };
    const ability = await buildAbility(user);
    const update = {
      name: 'user_manager',
      default: false,
      permissions: {
        Process: 9007199254740991,
        Project: 0,
      },
    };

    expect(ability.can('update', toCaslResource('Role', role))).toBe(true);
    expect(ability.checkInputFields(toCaslResource('Role', role), 'update', update)).toBe(true);
  });

  // test_put_role_not_granted_by_role
  it('Test: Ensure that updating role is not allowed because requester is not admin and requester has no sufficient permissions by a role.', () => {
    const role = roles['1943cce1-a88f-4c58-aae6-f74b25730a2c'];
    const update = {
      name: 'user_manager',
      default: false,
      permissions: {
        Process: 8,
        Project: 0,
      },
    };

    expect(all_user_permissionsAbility.can('update', toCaslResource('Role', role))).toBe(false);
    expect(
      all_user_permissionsAbility.checkInputFields(toCaslResource('Role', role), 'update', update)
    ).toBe(false);
  });

  // test_put_role_unauthenticated
  it('Test: Ensure that updating role is not allowed because requester is unauthenticated.', () => {
    const role = roles['1943cce1-a88f-4c58-aae6-f74b25730a2c'];
    const update = {
      name: 'user_manager',
      default: false,
      permissions: {
        Process: 8,
        Project: 0,
      },
    };

    expect(all_user_permissionsAbility.can('update', toCaslResource('Role', role))).toBe(false);
    expect(
      all_user_permissionsAbility.checkInputFields(toCaslResource('Role', role), 'update', update)
    ).toBe(false);
  });
});

describe('DELETE /api/roles/:id', () => {
  // test_delete_role_admin
  it('Test: Ensure that deleting a role is allowed because requester is admin.', () => {
    const role = roles['1943cce1-a88f-4c58-aae6-f74b25730a2c'];
    expect(
      adminAbility.can(permissionNumberToIdentifiers(8 + 16), toCaslResource('Role', role))
    ).toBe(true);
  });

  // test_delete_role_granted_by_role
  it('Test: Ensure that deleting a role is allowed because it is allowed by a role.', () => {
    const role = roles['1943cce1-a88f-4c58-aae6-f74b25730a2c'];
    expect(
      all_role_permissionsAbility.can(
        permissionNumberToIdentifiers(8 + 16),
        toCaslResource('Role', role)
      )
    ).toBe(true);
  });

  // test_delete_role_includes_admin_granted
  it('Test: Ensure that deleting a role is allowed when it includes admin permissions.', async () => {
    const user = {
      id: 'tempId',
      roles: ['b52a443b-524a-4054-895b-3fd068b9d78c', 'd59266f8-0818-4923-8a31-abeff91c4963'],
    };
    const ability = await buildAbility(user);
    const role = roles['114db4a8-9109-4f20-b1b3-6efb21dd23d2'];

    expect(ability.can(permissionNumberToIdentifiers(8 + 16), toCaslResource('Role', role))).toBe(
      true
    );
  });

  // test_delete_role_includes_admin_not_granted
  it('Test: Ensure that deleting a role is allowed when it includes admin permissions and no sufficient permissions.', async () => {
    const user = {
      id: 'tempId',
      roles: ['d59266f8-0818-4923-8a31-abeff91c4963'],
    };
    const ability = await buildAbility(user);
    const role = roles['114db4a8-9109-4f20-b1b3-6efb21dd23d2'];

    expect(ability.can(permissionNumberToIdentifiers(8), toCaslResource('Role', role))).toBe(false);
    expect(ability.can(permissionNumberToIdentifiers(16), toCaslResource('Role', role))).toBe(
      false
    );
  });

  // test_delete_role_not_granted_by_role
  it('Test: Ensure that deleting a role is not allowed because requester is not admin and requester has no sufficient permissions by a role.', () => {
    const role = roles['1943cce1-a88f-4c58-aae6-f74b25730a2c'];

    expect(
      all_user_permissionsAbility.can(
        permissionNumberToIdentifiers(8),
        toCaslResource('Role', role)
      )
    ).toBe(false);
    expect(
      all_user_permissionsAbility.can(
        permissionNumberToIdentifiers(16),
        toCaslResource('Role', role)
      )
    ).toBe(false);
  });

  // test_delete_role_unauthenticated
  it('Test: Ensure that deleting a role is not allowed because requester is unauthenticated.', () => {
    const role = roles['1943cce1-a88f-4c58-aae6-f74b25730a2c'];
    expect(
      unauthenticatedAbility.can(permissionNumberToIdentifiers(8), toCaslResource('Role', role))
    ).toBe(false);
  });
});

describe('GET /api/role-mappings', () => {
  // test_get_role_mappings_granted_by_role
  it('Test: Ensure that users are allowed to view PROCEED user role-mappings, if it is granted by a role.', () => {
    const mockRoleMapping = {
      roleId: '',
      userId: 'c6ddf0d1-c23d-4a0f-a300-c5fe23c68907',
      id: '0',
    };

    expect(all_user_permissionsAbility.can(permissionNumberToIdentifiers(64), 'RoleMapping')).toBe(
      true
    );
    expect(all_user_permissionsAbility.can('view', 'RoleMapping')).toBe(true);
    expect(
      all_user_permissionsAbility.can(
        permissionNumberToIdentifiers(64),
        toCaslResource('RoleMapping', mockRoleMapping)
      )
    ).toBe(true);
    expect(
      all_user_permissionsAbility.can('view', toCaslResource('RoleMapping', mockRoleMapping))
    ).toBe(true);
  });

  // test_get_role_mappings_not_granted_by_role
  it('Test: Ensure that users are not allowed to view PROCEED user role-mappings, if it is not granted by a role.', () => {
    const mockRoleMapping = {
      roleId: '',
      userId: 'c6ddf0d1-c23d-4a0f-a300-c5fe23c68907',
      id: '0',
    };

    expect(
      all_role_permissionsAbility.can('view', toCaslResource('RoleMapping', mockRoleMapping))
    ).toBe(false);
    expect(all_role_permissionsAbility.can(permissionNumberToIdentifiers(64), 'RoleMapping')).toBe(
      false
    );
  });

  // test_get_role_mappings_admin
  it('Test: Ensure that admin users are allowed to view PROCEED user role-mappings.', () => {
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
  it('Test: Ensure that authenticated users are not allowed to view PROCEED user role-mappings by user id.', () => {
    const mockRoleMapping = {
      roleId: '',
      userId: 'c6ddf0d1-c23d-4a0f-a300-c5fe23c68907',
      id: '0',
    };
    expect(selfAbility.can('view', toCaslResource('RoleMapping', mockRoleMapping))).toBe(false);
  });

  // test_get_role_mapping_of_user_self
  it('Test: Ensure that authenticated users are allowed to view their own PROCEED user role-mappings.', () => {
    const mockRoleMapping = {
      roleId: '',
      userId: users.self.id,
      id: '0',
    };
    expect(selfAbility.can('view', toCaslResource('RoleMapping', mockRoleMapping))).toBe(true);
  });

  // test_get_role_mappings_of_user_admin
  it('Test: Ensure that admin users are allowed to view PROCEED user role-mappings.', () => {
    const mockRoleMapping = {
      roleId: '',
      userId: '',
      id: '0',
    };
    expect(adminAbility.can('view', toCaslResource('RoleMapping', mockRoleMapping))).toBe(true);
  });

  // test_get_role_mappings_of_user_granted_by_role
  it('Test: Ensure that users are allowed to view PROCEED user role-mappings, if it is granted by a role.', () => {
    const mockRoleMapping = {
      roleId: '',
      userId: 'c6ddf0d1-c23d-4a0f-a300-c5fe23c68907',
      id: '0',
    };
    expect(
      all_user_permissionsAbility.can('view', toCaslResource('RoleMapping', mockRoleMapping))
    ).toBe(true);
  });

  // test_get_role_mappings_of_user_not_granted_by_role
  it('Test: Ensure that users are not allowed to view PROCEED user role-mappings, if it is not granted by a role.', () => {
    const mockRoleMapping = {
      roleId: '',
      userId: 'c6ddf0d1-c23d-4a0f-a300-c5fe23c68907',
      id: '0',
    };
    expect(
      all_role_permissionsAbility.can('view', toCaslResource('RoleMapping', mockRoleMapping))
    ).toBe(false);
  });
});

describe('POST /api/role-mappings', () => {
  // test_post_role_mappings_authenticated_without_roles
  it('Test: Ensure that authenticated users are not allowed to create new PROCEED user role-mappings.', () => {
    expect(noRolesAbility.can('create', 'RoleMapping')).toBe(false);
    expect(all_role_permissionsAbility.can('create', 'RoleMapping')).toBe(false);
  });

  // test_post_role_mappings_of_user_admin
  it('Test: Ensure that admin users are allowed to create new PROCEED user role-mappings.', () => {
    const mockRoleMapping = {
      roleId: 'd59266f8-0818-4923-8a31-abeff91c4963',
      userId: '',
      id: '0',
    };

    expect(adminAbility.can('create', toCaslResource('RoleMapping', mockRoleMapping))).toBe(true);
  });

  // test_post_role_mappings_of_user_unauthenticated
  it('Test: Ensure that unauthenticated users are not allowed to create new PROCEED user role-mappings.', () => {
    expect(unauthenticatedAbility.can('create', 'RoleMapping')).toBe(false);
  });

  it('Test: Ensure that users are allowed to create new PROCEED user role-mappings, if it is granted by a role.', () => {
    const mockRoleMapping = {
      roleId: '7cf26d82-b40f-443f-a025-84e149042c33',
      userId: '',
      id: '0',
    };

    expect(adminAbility.can('create', toCaslResource('RoleMapping', mockRoleMapping))).toBe(false);
  });

  // test_posts_role_mappings_granted_by_role
  it('Test: Ensure that users are allowed to create new PROCEED user role-mappings, if it is granted by a role.', async () => {
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
  it('Test: Ensure that users are allowed to create new PROCEED user role-mappings, if role includes admin permissions and user has sufficient permissions.', async () => {
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
  it('Test: Ensure that users are not allowed to create new PROCEED user role-mappings, if it is not granted by a role.', async () => {
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
  it('Test: Ensure that authenticated users are not allowed to delete PROCEED user role-mappings.', () => {
    expect(noRolesAbility.can('delete', 'RoleMapping')).toBe(false);
  });

  // test_delete_role_mappings_admin_granted
  it('Test: Ensure that admin users are allowed to delete PROCEED user role-mappings.', () => {
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
        })
      )
    ).toBe(false);

    expect(adminAbility.can('delete', 'RoleMapping')).toBe(true);
    expect(adminAbility.can('delete', toCaslResource('RoleMapping', mockRoleMapping))).toBe(true);
  });

  // // test_delete_role_mappings_unauthenticated
  it('Test: Ensure that unauthenticated users are not allowed to create new PROCEED user role-mappings.', () => {
    const roleMapping = {
      roleId: '1943cce1-a88f-4c58-aae6-f74b25730a2c',
      userId: '2e9e3b25-4967-4e99-b9bf-01ba27f94d7c',
      id: '0',
    };
    expect(unauthenticatedAbility.can('delete', toCaslResource('RoleMapping', roleMapping))).toBe(
      false
    );
  });

  // test_delete_role_mappings_granted_by_role
  it('Test: Ensure that users are allowed to delete PROCEED user role-mappings, if it is granted by a role.', () => {
    const mockRoleMapping = {
      roleId: '',
      userId: '',
      id: '',
    };

    expect(all_user_permissionsAbility.can('delete', 'RoleMapping')).toBe(true);
    expect(
      all_user_permissionsAbility.can('delete', toCaslResource('RoleMapping', mockRoleMapping))
    ).toBe(true);
  });

  // test_delete_role_mappings_includes_admin_granted
  it('Test: Ensure that users are not allowed to delete PROCEED user role-mappings, because role includes admin permissions.', async () => {
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
  it('Test: Ensure that users are not allowed to delete PROCEED user role-mappings, if it is not granted by a role.', () => {
    expect(all_role_permissionsAbility.can('delete', 'RoleMapping')).toBe(false);
  });
});
