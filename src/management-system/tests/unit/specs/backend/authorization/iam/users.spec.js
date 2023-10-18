const { users, abilitiesBuilt } = require('../authorization');
const {
  permissionNumberToIdentifiers,
} = require('../../../../../../src/backend/server/iam/authorization/permissionHelpers');
const {
  toCaslResource,
} = require('../../../../../../../management-system-v2/lib/ability/caslAbility');

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
  it('Ensure that authenticated users can view PROCEED users.', () => {
    expect(noRolesAbility.can(permissionNumberToIdentifiers(1), 'User')).toBe(true);
  });

  //   // test_get_users_unauthenticated
  it("Ensure that unauthenticated users can't view PROCEED users.", () => {
    expect(unauthenticatedAbility.can(permissionNumberToIdentifiers(1), 'User')).toBe(false);
  });
});

describe('GET /api/users/:id', () => {
  // test_get_user_authenticated
  it('Ensure that authenticated users can view PROCEED user by id.', () => {
    const user = { id: 'f0185d7d-b410-4bb5-bf8a-19bdfd0facfe' };

    expect(noRolesAbility.can(permissionNumberToIdentifiers(1), toCaslResource('User', user))).toBe(
      true,
    );
  });

  // test_get_user_unauthenticated
  it("Ensure that unauthenticated users can't view PROCEED user by id.", () => {
    const user = { id: 'f0185d7d-b410-4bb5-bf8a-19bdfd0facfe' };

    expect(
      unauthenticatedAbility.can(permissionNumberToIdentifiers(1), toCaslResource('User', user)),
    ).toBe(false);
  });
});

describe('POST /api/users', () => {
  // test_post_user_granted_by_role
  it('Ensure that creating new users is granted by a role.', () => {
    expect(all_user_permissionsAbility.can(permissionNumberToIdentifiers(4 + 16), 'User')).toBe(
      true,
    );
  });

  // test_post_user_granted_admin
  it('Ensure that creating new users is allowed because user is admin.', () => {
    expect(adminAbility.can(permissionNumberToIdentifiers(4 + 16), 'User')).toBe(true);
  });

  // test_post_user_not_allowed
  it('Ensure that creating new users is not granted by a role and user is not admin.', () => {
    expect(all_role_permissionsAbility.can(permissionNumberToIdentifiers(4), 'User')).toBe(false);
    expect(all_role_permissionsAbility.can(permissionNumberToIdentifiers(16), 'User')).toBe(false);
  });

  // test_post_user_unauthenticated
  it('Ensure that creating new users is not allowed because user is unauthenticated.', () => {
    expect(unauthenticatedAbility.can(permissionNumberToIdentifiers(4), 'User')).toBe(false);
    expect(unauthenticatedAbility.can(permissionNumberToIdentifiers(16), 'User')).toBe(false);
  });
});

describe('PUT /api/users/:id', () => {
  // test_put_user_password_self_granted
  it('Ensure that updating user password is allowed because requester updates his or her password.', () => {
    expect(
      selfAbility.can(
        permissionNumberToIdentifiers(2),
        toCaslResource('User', users.self),
        'password',
      ),
    ).toBe(true);
  });

  // test_put_user_granted_admin
  it('Ensure that updating user is allowed because user is admin.', () => {
    const user = users.self;
    expect(
      adminAbility.can(permissionNumberToIdentifiers(2 + 16), toCaslResource('User', user)),
    ).toBe(true);
  });

  // test_put_user_self_granted
  it('Ensure that updating user is allowed because requester updates his own resource.', () => {
    // used to include 16
    expect(
      selfAbility.can(permissionNumberToIdentifiers(2), toCaslResource('User', users.self)),
    ).toBe(true);

    for (const field of ['email', 'name', 'picture', 'username', 'lastName', 'firstName']) {
      expect(
        selfAbility.can(
          permissionNumberToIdentifiers(2),
          toCaslResource('User', users.self),
          field,
        ),
      ).toBe(true);
    }

    expect(
      selfAbility.can(permissionNumberToIdentifiers(2), toCaslResource('User', users.self), 'id'),
    ).toBe(false);
  });

  // test_put_user_not_allowed
  it("Ensure that updating user is not allowed because requester updates someone else's resource and requester is not admin.", () => {
    expect(
      all_role_permissionsAbility.can(
        permissionNumberToIdentifiers(2),
        toCaslResource('User', users.self),
      ),
    ).toBe(false);
  });

  // test_put_user_unauthenticated
  it('Ensure that updating user is not allowed because requester is unauthenticated.', () => {
    const user = { id: '246990cf-8b8c-40c0-b89b-fe8c4e11090a' };

    expect(
      unauthenticatedAbility.can(permissionNumberToIdentifiers(2), toCaslResource('User', user)),
    ).toBe(false);
  });
});

describe('DELETE /api/users/:id', () => {
  // test_delete_user_granted_admin
  it('Ensure that deleting a user is allowed because requester is admin.', () => {
    expect(
      adminAbility.can(permissionNumberToIdentifiers(8 + 16), toCaslResource('User', users.self)),
    ).toBe(true);
  });

  // test_delete_user_self_granted
  it('Ensure that deleting a user is allowed because requester deletes his own user.', () => {
    expect(
      selfAbility.can(permissionNumberToIdentifiers(8), toCaslResource('User', users.self)),
    ).toBe(true);
  });

  // test_delete_user_not_allowed
  it('Ensure that deleting a user is not allowed because requester deletes not his own user and requester is not admin.', () => {
    expect(
      all_role_permissionsAbility.can(
        permissionNumberToIdentifiers(8),
        toCaslResource('User', users.self),
      ),
    ).toBe(false);
  });

  // test_delete_user_unauthenticated
  it('Ensure that deleting a user is not allowed because requester is unauthenticated.', () => {
    const user = { id: '246990cf-8b8c-40c0-b89b-fe8c4e11090a' };

    expect(
      unauthenticatedAbility.can(permissionNumberToIdentifiers(8), toCaslResource('User', user)),
    ).toBe(false);
  });
});
