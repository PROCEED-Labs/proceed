const { roles, abilitiesBuilt, buildAbility } = require('../authorization');
const {
  toCaslResource,
} = require('../../../../../../src/backend/server/iam/authorization/caslRules');
const {
  permissionNumberToIdentifiers,
} = require('../../../../../../src/backend/server/iam/authorization/permissionHelpers');

let adminAbility,
  all_user_permissionsAbility,
  all_role_permissionsAbility,
  noRolesAbility,
  unauthenticatedAbility;

beforeAll(async () => {
  const abilities = await abilitiesBuilt;
  adminAbility = abilities[0];
  all_user_permissionsAbility = abilities[3];
  all_role_permissionsAbility = abilities[4];
  noRolesAbility = abilities[6];
  unauthenticatedAbility = abilities[8];
});

describe('GET /api/roles', () => {
  // test_get_roles_authenticated
  it('Ensure that authenticated users can view PROCEED roles.', () => {
    expect(noRolesAbility.can(permissionNumberToIdentifiers(1), 'Role')).toBe(true);
  });

  // test_get_roles_unauthenticated
  it("Ensure that unauthenticated users can't view PROCEED roles.", () => {
    expect(unauthenticatedAbility.can(permissionNumberToIdentifiers(1), 'Role')).toBe(false);
  });
});

describe('GET /api/roles/:id', () => {
  // test_get_role_authenticated
  it('Ensure that authenticated users can view PROCEED role by id.', () => {
    expect(noRolesAbility.can(permissionNumberToIdentifiers(1), toCaslResource('Role', {}))).toBe(
      true
    );
  });

  // test_get_role_unauthenticated
  it("Ensure that unauthenticated users can't view PROCEED role by id.", () => {
    const role = roles['114db4a8-9109-4f20-b1b3-6efb21dd23d2'];
    expect(
      unauthenticatedAbility.can(permissionNumberToIdentifiers(1), toCaslResource('Role', role))
    ).toBe(false);
  });
});

describe('POST /api/roles', () => {
  // test_post_role_granted_by_role
  it('Ensure that creating new roles is granted by a role.', () => {
    expect(all_role_permissionsAbility.can(permissionNumberToIdentifiers(4 + 16), 'Role')).toBe(
      true
    );
  });

  // test_post_role_granted_admin
  it('Ensure that creating new roles is allowed because user is admin.', () => {
    expect(adminAbility.can(permissionNumberToIdentifiers(4 + 16), 'Role')).toBe(true);
  });

  // test_post_role_not_granted_by_role
  it('Ensure that creating new roles is not granted by a role and user is not admin.', () => {
    expect(all_user_permissionsAbility.can(permissionNumberToIdentifiers(16), 'Role')).toBe(false);
    expect(all_user_permissionsAbility.can(permissionNumberToIdentifiers(4), 'Role')).toBe(false);
  });

  // test_post_role_unauthenticated
  it('Ensure that creating new roles is not allowed because user is unauthenticated.', () => {
    expect(unauthenticatedAbility.can(permissionNumberToIdentifiers(4), 'Role')).toBe(false);
  });
});

describe('PUT /api/roles/:id', () => {
  // test_put_role_granted_because_admin_allowed
  it('Ensure that updating role is allowed because user is admin.', () => {
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
  it('Ensure that updating role is allowed because it is granted by a role.', () => {
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
  it('Ensure that updating role is allowed because it includes admin permissions and has sufficient admin permissions.', async () => {
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
  it('Ensure that updating role is not allowed because requester is not admin and requester has no sufficient permissions by a role.', () => {
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
  it('Ensure that updating role is not allowed because requester is unauthenticated.', () => {
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
  it('Ensure that deleting a role is allowed because requester is admin.', () => {
    const role = roles['1943cce1-a88f-4c58-aae6-f74b25730a2c'];
    expect(
      adminAbility.can(permissionNumberToIdentifiers(8 + 16), toCaslResource('Role', role))
    ).toBe(true);
  });

  // test_delete_role_granted_by_role
  it('Ensure that deleting a role is allowed because it is allowed by a role.', () => {
    const role = roles['1943cce1-a88f-4c58-aae6-f74b25730a2c'];
    expect(
      all_role_permissionsAbility.can(
        permissionNumberToIdentifiers(8 + 16),
        toCaslResource('Role', role)
      )
    ).toBe(true);
  });

  // test_delete_role_includes_admin_granted
  it('Ensure that deleting a role is allowed when it includes admin permissions.', async () => {
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
  it('Ensure that deleting a role is allowed when it includes admin permissions and no sufficient permissions.', async () => {
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
  it('Ensure that deleting a role is not allowed because requester is not admin and requester has no sufficient permissions by a role.', () => {
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
  it('Ensure that deleting a role is not allowed because requester is unauthenticated.', () => {
    const role = roles['1943cce1-a88f-4c58-aae6-f74b25730a2c'];
    expect(
      unauthenticatedAbility.can(permissionNumberToIdentifiers(8), toCaslResource('Role', role))
    ).toBe(false);
  });
});
