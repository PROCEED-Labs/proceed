const {
  processes,
  shares,
  abilitiesBuilt,
  buildAbility,
} = require('../../../../mocks/authorization');
const { toCaslResource } = require('../../../../../src/backend/server/iam/authorization/caslRules');
const {
  permissionNumberToIdentifiers,
} = require('../../../../../src/backend/server/iam/authorization/permissionHelpers');
const { getShares } = require('../../../../../src/backend/shared-electron-server/data/iam/shares');

let adminAbility, process_engineer_adminAbility, unauthenticatedAbility;

beforeAll(async () => {
  const abilities = await abilitiesBuilt;
  adminAbility = abilities[0];
  process_engineer_adminAbility = abilities[2];
  unauthenticatedAbility = abilities[8];
});

describe('GET /api/shares', () => {
  // test_get_shares_admin
  it('Test: Ensure that users can view PROCEED shares from resource, because user is admin.', () => {
    const process = processes['_932350bb-5a00-415c-a4de-90629389a0e1'];
    expect(
      adminAbility.can(permissionNumberToIdentifiers(32), toCaslResource('Process', process))
    ).toBe(true);
  });

  // test_get_shares_resource_owner_granted
  it('Test: Ensure that users can view PROCEED shares from resource, because user owns the resource and has permissions from roles.', async () => {
    const user = {
      id: 'auth0|61c3f50c951c5000704dc981',
      roles: ['99c60055-7538-426c-8592-34bfe68f7e0d'],
    };
    const ability = await buildAbility(user);

    const ownedResourceShares = (await getShares()).filter(
      (share) => share.resourceOwner === user.id
    );

    for (const share of ownedResourceShares) {
      expect(ability.can('view', toCaslResource('Share', share))).toBe(true);
    }
  });

  // test_get_shares_resource_owner_not_granted
  it("Test: Ensure that users can't view PROCEED shares from resource, because user owns the resource but has missing permissions from roles.", async () => {
    const user = {
      id: 'auth0|61c3f50c951c5000704dc981',
      roles: ['c6e6193e-8a25-40fe-a594-0fdd4882339a'],
    };
    const ability = await buildAbility(user);

    for (const share of await getShares()) {
      expect(ability.can(permissionNumberToIdentifiers(32), toCaslResource('Share', share))).toBe(
        false
      );
    }
  });

  // test_get_shares_granted_because_resource_shared
  it('Test: Ensure that users can view PROCEED shares from resource, because someone shared resource with user resource.', async () => {
    const user = {
      id: 'auth0|6174afb925f203006808dbd5',
    };
    const ability = await buildAbility(user);

    const sharedWithUser = (await getShares()).find((share) => {
      return share.sharedWith === user.id;
    });

    expect(ability.can('view', toCaslResource('Share', sharedWithUser))).toBe(true);
  });

  // test_get_shares_granted_because_resource_shared
  it("Test: Ensure that users can't view PROCEED shares from resource, because someone shared resource with user resource, but share expired.", async () => {
    const user = {
      id: 'rand_user_id',
    };
    const ability = await buildAbility(user);

    const sharedWithUser = (await getShares()).find((share) => {
      return share.sharedWith === user.id;
    });

    expect(ability.can('view', toCaslResource('Share', sharedWithUser))).toBe(false);
  });

  // test_get_shares_granted_because_resource_shared
  it("Test: Ensure that users can't view PROCEED shares from resource, because someone shared resource with user resource, but share expired.", async () => {
    const user = {
      id: 'auth0|6174afb925f203006808dbd5',
    };
    const ability = await buildAbility(user);

    const sharedWithUser = (await getShares()).find(
      (share) => share.sharedWith === 'auth0|6174afb925f203006808dbd6'
    );

    expect(ability.can('view', toCaslResource('Share', sharedWithUser))).toBe(false);
  });

  // test_get_all_shares_resource_owner
  it('Test: Ensure that response contains all shares because user is resource owner and has share permissions from roles.', async () => {
    const user = {
      id: 'auth0|61c3f50c951c5000704dc981',
    };
    const ability = await buildAbility(user);

    const allowedShares = ability
      .filter('view', 'Share', await getShares())
      .map((share) => share.id);

    expect(allowedShares.sort()).toEqual(
      [
        '27c89747-c5ca-4a52-9f29-5fbcfcd38562',
        '4cef9860-47ae-4cba-84d4-d8d05a9319a9',
        '22c519d3-71e4-4c41-8ce4-4d444fc5b8c8',
        'b8cad4a9-1892-4da5-8ada-6b6c75237e0f',
      ].sort()
    );
  });

  // test_get_all_user_shares
  it('Test: Ensure that response only contains user sharings.', async () => {
    const user = {
      id: 'auth0|6174afb925f203006808dbd5',
    };
    const ability = await buildAbility(user);

    const allowedShares = ability
      .filter('view', 'Share', await getShares())
      .map((share) => share.id);

    expect(allowedShares.sort()).toEqual(
      [
        '22c519d3-71e4-4c41-8ce4-4d444fc5b8c8',
        '4cef9860-47ae-4cba-84d4-d8d05a9319a9',
        '27c89747-c5ca-4a52-9f29-5fbcfcd38562',
      ].sort()
    );
  });

  // test_get_shares_not_allowed
  it("Test: Ensure that users can't view PROCEED shares from resource, because nobody shared resource with requester and requester is not resource owner.", async () => {
    const user = {
      id: '55d8e958-6eb8-44ec-967f-ee6345a3ad8e',
    };
    const ability = await buildAbility(user);

    const allowedShares = ability
      .filter(
        'view',
        'Share',
        Object.values(shares['Process']['_932350bb-5a00-415c-a4de-90629389a0e1'])
      )
      .map((share) => share.id);

    expect(allowedShares.sort()).toEqual([]);
  });

  // test_get_shares_unauthenticated
  it("Test: Ensure that unauthenticated users can't view PROCEED shares.", () => {
    expect(unauthenticatedAbility.can('view', 'Share')).toBe(false);
  });
});

describe('POST /api/shares', () => {
  // test_post_shares_admin
  it('Test: Ensure that users can create new PROCEED shares for resource, because user is admin.', () => {
    const newShare = {
      resourceId: '_932350bb-5a00-415c-a4de-90629389a0e1',
      resourceOwner: 'auth0|61c3f50c951c5000704dc981',
      resourceType: 'Process',
      sharedBy: 'auth0|61d5dd78d27de7006abc1950',
      sharedWith: '4598f564-a09c-4f00-a143-a1d54cec8663',
    };

    expect(adminAbility.can('create', 'Share')).toBe(true);
    expect(adminAbility.can('create', toCaslResource('Share', newShare))).toBe(true);
  });

  // test_post_shares_resource_owner_granted
  it('Test: Ensure that users can create new PROCEED shares for resource, because user owns the resource and has permissions from role.', async () => {
    const user = {
      id: 'auth0|61c3f50c951c5000704dc981',
      roles: ['99c60055-7538-426c-8592-34bfe68f7e0d'],
    };
    const ability = await buildAbility(user);

    const newShare = {
      resourceOwner: user.id,
      resourceType: 'Process',
    };

    expect(ability.can('create', 'Share')).toBe(true);
    expect(ability.can('create', toCaslResource('Share', newShare))).toBe(true);
  });

  it('Test: Ensure that users can create new PROCEED shares for resource, because user owns the resource and has permissions from role.', async () => {
    const user = {
      id: 'auth0|61c3f50c951c5000704dc981',
      roles: ['99c60055-7538-426c-8592-34bfe68f7e0d'],
    };
    const ability = await buildAbility(user);

    const newShare = {
      resourceOwner: 'auth0|61c3f50c951c5000704dc981',
      resourceType: 'Process',
      sharedBy: user.id,
      sharedWith: user.id,
    };

    expect(ability.can('create', toCaslResource('Share', newShare))).toBe(false);
  });

  // test_post_shares_resource_owner_not_granted
  it("Test: Ensure that users can't create new PROCEED shares for resource, because user owns the resource but has missing permissions from role, because role expired.", async () => {
    const user = {
      id: 'auth0|61c3f50c951c5000704dc981',
      roles: ['c6e6193e-8a25-40fe-a594-0fdd4882339a'],
    };
    const ability = await buildAbility(user);

    expect(ability.can('create', 'Share')).toBe(false);
  });

  // test_post_shares_not_allowed
  it("Test: Ensure that users can't create new PROCEED shares for resource, because requester is not resource owner and he or she has no permissions to share the resource.", async () => {
    const user = {
      id: '55d8e958-6eb8-44ec-967f-ee6345a3ad8e',
    };
    const ability = await buildAbility(user);

    const newShare = {
      resourceId: '_932350bb-5a00-415c-a4de-90629389a0e1',
      sharedBy: user.id,
    };

    expect(ability.can('create', 'Share')).toBe(false);
    expect(ability.can('create', toCaslResource('Share', newShare))).toBe(false);
  });

  // test_post_shares_unauthenticated
  it("Test: Ensure that unauthenticated users can't create new PROCEED shares for resource.", () => {
    const mockShare = {
      permissions: 1,
      resourceType: 'Process',
      resourceId: '_932350bb-5a00-415c-a4de-90629389a0e1',
      type: 0,
      sharedWith: 'd22e393d-373e-47d6-afd1-064c80d724c7',
    };

    expect(unauthenticatedAbility.can('create', toCaslResource('Share', mockShare)));
  });
});

describe('PUT /api/shares/:id', () => {
  // test_put_shares_admin
  it('Test: Ensure that users can update PROCEED shares for resource, because user is admin.', async () => {
    const share = (await getShares()).find(
      (share) => share.id === '4cef9860-47ae-4cba-84d4-d8d05a9319a9'
    );
    JSON.parse;
    expect(adminAbility.can('create', toCaslResource('Share', share))).toBe(true);
  });

  // test_put_shares_resource_owner_granted
  it('Test: Ensure that users can update PROCEED shares for resource, because user is resource owner and has permissions from roles.', async () => {
    const user = {
      id: 'auth0|61c3f50c951c5000704dc981',
      roles: ['99c60055-7538-426c-8592-34bfe68f7e0d'],
    };
    const ability = await buildAbility(user);

    const share = (await getShares()).find(
      (share) => share.id === '4cef9860-47ae-4cba-84d4-d8d05a9319a9'
    );

    expect(ability.can('update', toCaslResource('Share', share))).toBe(true);
  });

  // test_put_shares_resource_owner_not_granted
  it("Test: Ensure that users can't update PROCEED shares for resource, because user is resource owner but has missing permissions from roles, because role expired.", async () => {
    const user = {
      id: 'auth0|61c3f50c951c5000704dc981',
      roles: ['c6e6193e-8a25-40fe-a594-0fdd4882339a'],
    };
    const ability = await buildAbility(user);

    const share = (await getShares()).find(
      (share) => share.id === '4cef9860-47ae-4cba-84d4-d8d05a9319a9'
    );

    expect(ability.can('update', toCaslResource('Share', share))).toBe(false);
  });

  // test_put_shares_not_allowed
  it("Test: Ensure that users can't update PROCEED shares for resource, because requester is not resource owner and he or she has no permissions to share the resource.", async () => {
    const user = {
      id: '55d8e958-6eb8-44ec-967f-ee6345a3ad8e',
    };
    const ability = await buildAbility(user);
    const share = (await getShares()).find(
      (share) => share.id === '4cef9860-47ae-4cba-84d4-d8d05a9319a9'
    );

    expect(ability.can('update', toCaslResource('Share', share))).toBe(false);
  });

  // test_put_shares_unauthenticated
  it("Test: Ensure that unauthenticated users can't update PROCEED shares for resource.", async () => {
    const user = {
      id: '55d8e958-6eb8-44ec-967f-ee6345a3ad8e',
    };
    const ability = await buildAbility(user);
    const share = (await getShares()).find(
      (share) => share.id === '4cef9860-47ae-4cba-84d4-d8d05a9319a9'
    );

    expect(ability.can('update', toCaslResource('Share', share))).toBe(false);
  });
});

describe('DELETE /api/shares/:id', () => {
  // test_delete_shares_admin
  it('Test: Ensure that users can delete PROCEED shares for resource, because user admin.', async () => {
    const share = (await getShares()).find(
      (share) => share.id === '4cef9860-47ae-4cba-84d4-d8d05a9319a9'
    );

    expect(adminAbility.can('update', toCaslResource('Share', share))).toBe(true);
  });

  // test_delete_shares_resource_owner
  it('Test: Ensure that users can delete PROCEED shares for resource, because user is resource owner and has share permissions in role.', async () => {
    const user = {
      id: 'auth0|61c3f50c951c5000704dc981',
      roles: ['99c60055-7538-426c-8592-34bfe68f7e0d'],
    };
    const ability = await buildAbility(user);
    const share = (await getShares()).filter(
      (share) => share.id === '4cef9860-47ae-4cba-84d4-d8d05a9319a9'
    )[0];

    expect(ability.can('delete', toCaslResource('Share', share))).toBe(true);
  });

  // test_delete_shares_resource_owner_no_role_permissions
  it("Test: Ensure that users can't delete PROCEED shares for resource, because user is resource owner but has missing share permissions in role.", async () => {
    const user = {
      id: 'auth0|61c3f50c951c5000704dc981',
      roles: ['d59266f8-0818-4923-8a31-abeff91c4963'],
    };
    const ability = await buildAbility(user);
    const share = (await getShares()).filter(
      (share) => share.id === '4cef9860-47ae-4cba-84d4-d8d05a9319a9'
    )[0];

    expect(ability.can('delete', toCaslResource('Share', share))).toBe(false);
  });

  // test_delete_shares_share_owner_no_role_permissions
  it("Test: Ensure that users can't delete PROCEED shares for resource, because user is resource owner but has missing share permissions in role.", async () => {
    const user = {
      id: 'auth0|6174afb925f203006808abc4',
      roles: ['d59266f8-0818-4923-8a31-abeff91c4963'],
    };
    const ability = await buildAbility(user);
    const share = (await getShares()).find(
      (share) => share.id === '27c89747-c5ca-4a52-9f29-5fbcfcd38562'
    );

    expect(ability.can('delete', toCaslResource('Share', share))).toBe(false);
  });

  // test_delete_shares_share_owner_and_role_permissions
  it('Test: Ensure that users can delete PROCEED shares for resource, because user is resource owner and has share permissions in role.', async () => {
    const user = {
      id: 'auth0|6174afb925f203006808abc4',
      roles: ['99c60055-7538-426c-8592-34bfe68f7e0d'],
    };
    const ability = await buildAbility(user);
    const share = (await getShares()).find(
      (share) => share.id === '27c89747-c5ca-4a52-9f29-5fbcfcd38562'
    );

    expect(ability.can('delete', toCaslResource('Share', share))).toBe(true);
  });

  // test_delete_shares_not_allowed
  it("Test: Ensure that users can't delete PROCEED shares for resource, because requester is not resource owner and he or she has no permissions to share the resource.", async () => {
    const user = {
      id: '55d8e958-6eb8-44ec-967f-ee6345a3ad8e',
    };
    const ability = await buildAbility(user);
    const share = (await getShares()).find(
      (share) => share.id === '4cef9860-47ae-4cba-84d4-d8d05a9319a9'
    );

    expect(ability.can('delete', toCaslResource('Share', share))).toBe(false);
  });

  // test_delete_shares_unauthenticated
  it("Test: Ensure that unauthenticated users can't delete PROCEED shares for resource.", async () => {
    const share = (await getShares()).find(
      (share) => share.id === '4cef9860-47ae-4cba-84d4-d8d05a9319a9'
    );
    expect(unauthenticatedAbility.can('delete', 'Share')).toBe(false);
    expect(unauthenticatedAbility.can('delete', toCaslResource('Share', share))).toBe(false);
  });
});
