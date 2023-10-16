const {
  toCaslResource,
} = require('../../../../../../../management-system-v2/lib/ability/caslAbility');
const { abilitiesBuilt, buildAbility } = require('../authorization');

let adminAbility, unauthenticatedAbility;

beforeAll(async () => {
  const abilities = await abilitiesBuilt;
  adminAbility = abilities[0];
  unauthenticatedAbility = abilities[8];
});

describe('POST /api/shares', () => {
  // test_post_shares_admin
  it('Ensure that users can create new PROCEED shares for resource, because user is admin.', () => {
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
  it('Ensure that users can create new PROCEED shares for resource, because user owns the resource and has permissions from role.', async () => {
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

  it('Ensure that users can create new PROCEED shares for resource, because user owns the resource and has permissions from role.', async () => {
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
  it("Ensure that users can't create new PROCEED shares for resource, because user owns the resource but has missing permissions from role, because role expired.", async () => {
    const user = {
      id: 'auth0|61c3f50c951c5000704dc981',
      roles: ['c6e6193e-8a25-40fe-a594-0fdd4882339a'],
    };
    const ability = await buildAbility(user);

    expect(ability.can('create', 'Share')).toBe(false);
  });

  // test_post_shares_not_allowed
  it("Ensure that users can't create new PROCEED shares for resource, because requester is not resource owner and he or she has no permissions to share the resource.", async () => {
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
  it("Ensure that unauthenticated users can't create new PROCEED shares for resource.", () => {
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
