const { abilitiesBuilt, buildAbility } = require('../authorization');
const {
  permissionNumberToIdentifiers,
} = require('../../../../../../src/backend/server/iam/authorization/permissionHelpers');

let adminAbility, process_engineer_adminAbility, unauthenticatedAbility;

beforeAll(async () => {
  const abilities = await abilitiesBuilt;
  adminAbility = abilities[0];
  process_engineer_adminAbility = abilities[2];
  unauthenticatedAbility = abilities[8];
});

describe('POST /api/process', () => {
  // test_post_process_granted
  it('Test test_post_process_granted: Ensure that users can create new PROCEED processes, because of sufficient role permissions.', async () => {
    const user = {
      id: 'auth0|6174afb925f203006808dbd5',
      roles: ['99c60055-7538-426c-8592-34bfe68f7e0d'],
    };
    const ability = await buildAbility(user);

    expect(ability.can(permissionNumberToIdentifiers(4 + 16), 'Process')).toBe(true);
  });

  // test_post_process_granted
  it("Ensure that users can't create new PROCEED processes, because of insufficient role permissions.", async () => {
    const user = {
      id: 'auth0|6174afb925f203006808dbd5',
      roles: ['d59266f8-0818-4923-8a31-abeff91c4963'],
    };
    const ability = await buildAbility(user);

    expect(ability.can(permissionNumberToIdentifiers(4 + 16), 'Process')).toBe(false);
  });

  // test_post_process_admin
  it('Ensure that users can create new PROCEED processes, because user is super admin.', () => {
    expect(adminAbility.can(permissionNumberToIdentifiers(4 + 16), 'Process')).toBe(true);
  });

  // test_post_process_has_admin_permissions
  it('Ensure that users can create new PROCEED processes, because user has admin permissions.', () => {
    expect(
      process_engineer_adminAbility.can(permissionNumberToIdentifiers(4 + 16), 'Process'),
    ).toBe(true);
  });

  // test_post_process_unauthenticated
  it("Ensure that unauthenticated users can't create new PROCEED processes.", () => {
    expect(unauthenticatedAbility.can(permissionNumberToIdentifiers(4), 'Process')).toBe(false);
    expect(unauthenticatedAbility.can(permissionNumberToIdentifiers(16), 'Process')).toBe(false);
  });
});
