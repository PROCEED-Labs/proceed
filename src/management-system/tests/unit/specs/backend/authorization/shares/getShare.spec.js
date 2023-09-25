const { processes, shares, abilitiesBuilt, buildAbility } = require('../authorization');
const {
  toCaslResource,
} = require('../../../../../../src/backend/server/iam/authorization/caslRules');
const {
  permissionNumberToIdentifiers,
} = require('../../../../../../src/backend/server/iam/authorization/permissionHelpers');
const {
  getShares,
} = require('../../../../../../src/backend/shared-electron-server/data/iam/shares');

let adminAbility, unauthenticatedAbility;

beforeAll(async () => {
  const abilities = await abilitiesBuilt;
  adminAbility = abilities[0];
  unauthenticatedAbility = abilities[8];
});

describe('GET /api/shares', () => {
  // test_get_shares_admin
  it('Ensure that users can view PROCEED shares from resource, because user is admin.', () => {
    const process = processes['_932350bb-5a00-415c-a4de-90629389a0e1'];
    expect(
      adminAbility.can(permissionNumberToIdentifiers(32), toCaslResource('Process', process)),
    ).toBe(true);
  });

  // test_get_shares_resource_owner_granted
  it('Ensure that users can view PROCEED shares from resource, because user owns the resource and has permissions from roles.', async () => {
    const user = {
      id: 'auth0|61c3f50c951c5000704dc981',
      roles: ['99c60055-7538-426c-8592-34bfe68f7e0d'],
    };
    const ability = await buildAbility(user);

    const ownedResourceShares = (await getShares()).filter(
      (share) => share.resourceOwner === user.id,
    );

    for (const share of ownedResourceShares) {
      expect(ability.can('view', toCaslResource('Share', share))).toBe(true);
    }
  });

  // test_get_shares_resource_owner_not_granted
  it("Ensure that users can't view PROCEED shares from resource, because user owns the resource but has missing permissions from roles.", async () => {
    const user = {
      id: 'auth0|61c3f50c951c5000704dc981',
      roles: ['c6e6193e-8a25-40fe-a594-0fdd4882339a'],
    };
    const ability = await buildAbility(user);

    for (const share of await getShares()) {
      expect(ability.can(permissionNumberToIdentifiers(32), toCaslResource('Share', share))).toBe(
        false,
      );
    }
  });

  // test_get_shares_granted_because_resource_shared
  it('Ensure that users can view PROCEED shares from resource, because someone shared resource with user resource.', async () => {
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
  it("Ensure that users can't view PROCEED shares from resource, because someone shared resource with user resource, but share expired.", async () => {
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
  it("Ensure that users can't view PROCEED shares from resource, because someone shared resource with user resource, but share expired.", async () => {
    const user = {
      id: 'auth0|6174afb925f203006808dbd5',
    };
    const ability = await buildAbility(user);

    const sharedWithUser = (await getShares()).find(
      (share) => share.sharedWith === 'auth0|6174afb925f203006808dbd6',
    );

    expect(ability.can('view', toCaslResource('Share', sharedWithUser))).toBe(false);
  });

  // test_get_all_shares_resource_owner
  it('Ensure that response contains all shares because user is resource owner and has share permissions from roles.', async () => {
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
      ].sort(),
    );
  });

  // test_get_all_user_shares
  it('Ensure that response only contains user sharings.', async () => {
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
      ].sort(),
    );
  });

  // test_get_shares_not_allowed
  it("Ensure that users can't view PROCEED shares from resource, because nobody shared resource with requester and requester is not resource owner.", async () => {
    const user = {
      id: '55d8e958-6eb8-44ec-967f-ee6345a3ad8e',
    };
    const ability = await buildAbility(user);

    const allowedShares = ability
      .filter(
        'view',
        'Share',
        Object.values(shares['Process']['_932350bb-5a00-415c-a4de-90629389a0e1']),
      )
      .map((share) => share.id);

    expect(allowedShares.sort()).toEqual([]);
  });

  // test_get_shares_unauthenticated
  it("Ensure that unauthenticated users can't view PROCEED shares.", () => {
    expect(unauthenticatedAbility.can('view', 'Share')).toBe(false);
  });
});
