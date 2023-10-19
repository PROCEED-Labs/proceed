const { abilitiesBuilt, buildAbility } = require('../authorization');
const {
  getShares,
} = require('../../../../../../src/backend/shared-electron-server/data/iam/shares');
const {
  toCaslResource,
} = require('../../../../../../../management-system-v2/lib/ability/caslAbility');

let adminAbility, process_engineer_adminAbility, unauthenticatedAbility;

beforeAll(async () => {
  const abilities = await abilitiesBuilt;
  adminAbility = abilities[0];
  process_engineer_adminAbility = abilities[2];
  unauthenticatedAbility = abilities[8];
});

describe('DELETE /api/shares/:id', () => {
  // test_delete_shares_admin
  it('Ensure that users can delete PROCEED shares for resource, because user admin.', async () => {
    const share = (await getShares()).find(
      (share) => share.id === '4cef9860-47ae-4cba-84d4-d8d05a9319a9',
    );

    expect(adminAbility.can('update', toCaslResource('Share', share))).toBe(true);
  });

  // test_delete_shares_resource_owner
  it('Ensure that users can delete PROCEED shares for resource, because user is resource owner and has share permissions in role.', async () => {
    const user = {
      id: 'auth0|61c3f50c951c5000704dc981',
      roles: ['99c60055-7538-426c-8592-34bfe68f7e0d'],
    };
    const ability = await buildAbility(user);
    const share = (await getShares()).filter(
      (share) => share.id === '4cef9860-47ae-4cba-84d4-d8d05a9319a9',
    )[0];

    expect(ability.can('delete', toCaslResource('Share', share))).toBe(true);
  });

  // test_delete_shares_resource_owner_no_role_permissions
  it("Ensure that users can't delete PROCEED shares for resource, because user is resource owner but has missing share permissions in role.", async () => {
    const user = {
      id: 'auth0|61c3f50c951c5000704dc981',
      roles: ['d59266f8-0818-4923-8a31-abeff91c4963'],
    };
    const ability = await buildAbility(user);
    const share = (await getShares()).filter(
      (share) => share.id === '4cef9860-47ae-4cba-84d4-d8d05a9319a9',
    )[0];

    expect(ability.can('delete', toCaslResource('Share', share))).toBe(false);
  });

  // test_delete_shares_share_owner_no_role_permissions
  it("Ensure that users can't delete PROCEED shares for resource, because user is resource owner but has missing share permissions in role.", async () => {
    const user = {
      id: 'auth0|6174afb925f203006808abc4',
      roles: ['d59266f8-0818-4923-8a31-abeff91c4963'],
    };
    const ability = await buildAbility(user);
    const share = (await getShares()).find(
      (share) => share.id === '27c89747-c5ca-4a52-9f29-5fbcfcd38562',
    );

    expect(ability.can('delete', toCaslResource('Share', share))).toBe(false);
  });

  // test_delete_shares_share_owner_and_role_permissions
  it('Ensure that users can delete PROCEED shares for resource, because user is resource owner and has share permissions in role.', async () => {
    const user = {
      id: 'auth0|6174afb925f203006808abc4',
      roles: ['99c60055-7538-426c-8592-34bfe68f7e0d'],
    };
    const ability = await buildAbility(user);
    const share = (await getShares()).find(
      (share) => share.id === '27c89747-c5ca-4a52-9f29-5fbcfcd38562',
    );

    expect(ability.can('delete', toCaslResource('Share', share))).toBe(true);
  });

  // test_delete_shares_not_allowed
  it("Ensure that users can't delete PROCEED shares for resource, because requester is not resource owner and he or she has no permissions to share the resource.", async () => {
    const user = {
      id: '55d8e958-6eb8-44ec-967f-ee6345a3ad8e',
    };
    const ability = await buildAbility(user);
    const share = (await getShares()).find(
      (share) => share.id === '4cef9860-47ae-4cba-84d4-d8d05a9319a9',
    );

    expect(ability.can('delete', toCaslResource('Share', share))).toBe(false);
  });

  // test_delete_shares_unauthenticated
  it("Ensure that unauthenticated users can't delete PROCEED shares for resource.", async () => {
    const share = (await getShares()).find(
      (share) => share.id === '4cef9860-47ae-4cba-84d4-d8d05a9319a9',
    );
    expect(unauthenticatedAbility.can('delete', 'Share')).toBe(false);
    expect(unauthenticatedAbility.can('delete', toCaslResource('Share', share))).toBe(false);
  });
});
