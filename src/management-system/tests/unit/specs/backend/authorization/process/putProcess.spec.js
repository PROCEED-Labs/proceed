const { processes, abilitiesBuilt, buildAbility } = require('../authorization');
const {
  toCaslResource,
} = require('../../../../../../src/backend/server/iam/authorization/caslRules');
const {
  permissionNumberToIdentifiers,
} = require('../../../../../../src/backend/server/iam/authorization/permissionHelpers');

let adminAbility,
  process_engineer_adminAbility,
  all_role_permissionsAbility,
  unauthenticatedAbility;

beforeAll(async () => {
  const abilities = await abilitiesBuilt;
  adminAbility = abilities[0];
  process_engineer_adminAbility = abilities[2];
  all_role_permissionsAbility = abilities[4];
  unauthenticatedAbility = abilities[8];
});

describe('PUT /api/process/:id', () => {
  // t_put_process_by_id_admin
  it('Ensure that users can update PROCEED process by id, because user is super admin.', () => {
    const process = toCaslResource('Process', processes['_dcc316cc-67a1-4b7a-929b-831e73b06f2a']);
    expect(
      adminAbility.can(permissionNumberToIdentifiers(2 + 16), toCaslResource('Process', process))
    ).toBe(true);
  });

  // test_put_process_by_id_has_admin_permissions
  it('Ensure that users can update PROCEED process by id, because user has admin permissions.', () => {
    const process = toCaslResource('Process', processes['_dcc316cc-67a1-4b7a-929b-831e73b06f2a']);
    expect(
      process_engineer_adminAbility.can(
        permissionNumberToIdentifiers(2 + 16),
        toCaslResource('Process', process)
      )
    ).toBe(true);
  });

  // test_put_process_by_id_not_granted
  it("Ensure that users can't update PROCEED process by id, because insufficient role permissions.", () => {
    const process = toCaslResource('Process', processes['_dcc316cc-67a1-4b7a-929b-831e73b06f2a']);

    expect(
      all_role_permissionsAbility.can(
        permissionNumberToIdentifiers(16),
        toCaslResource('Process', process)
      )
    ).toBe(false);
    expect(
      all_role_permissionsAbility.can(
        permissionNumberToIdentifiers(2),
        toCaslResource('Process', process)
      )
    ).toBe(false);
  });

  // test_put_process_by_id_shared
  it('Ensure that users can update PROCEED process by id, because has shared processes.', async () => {
    const user = {
      id: 'auth0|6174afb925f203006808dbd5',
      roles: ['99c60055-7538-426c-8592-34bfe68f7e0d'],
    };
    const ability = await buildAbility(user);
    const process = processes['_932350bb-5a00-415c-a4de-90629389a0e1'];

    // NOTE tests also include 16, but the original system perfoms an OR with the permissions
    expect(ability.can(permissionNumberToIdentifiers(2), toCaslResource('Process', process))).toBe(
      true
    );
  });

  // test_put_process_by_id_shared_not_granted
  it("Ensure that users can't update PROCEED process by id, because has shared processes but insufficient role permissions.", async () => {
    const user = {
      id: 'auth0|6174afb925f203006808dbd5',
      roles: ['1943cce1-a88f-4c58-aae6-f74b25730a2c'],
    };
    const ability = await buildAbility(user);

    const process = processes['_932350bb-5a00-415c-a4de-90629389a0e1'];

    expect(ability.can(permissionNumberToIdentifiers(2), toCaslResource('Process', process))).toBe(
      false
    );
    expect(ability.can(permissionNumberToIdentifiers(16), toCaslResource('Process', process))).toBe(
      false
    );
  });

  // test_put_process_by_id_owner_granted
  it('Ensure that users can update PROCEED process by id, because is owner of process and has sufficient permissions.', async () => {
    const user = {
      id: 'auth0|61c3f50c951c5000704dc981',
      roles: ['99c60055-7538-426c-8592-34bfe68f7e0d'],
    };
    const ability = await buildAbility(user);

    const process = processes['_932350bb-5a00-415c-a4de-90629389a0e1'];

    expect(
      ability.can(permissionNumberToIdentifiers(2 + 16), toCaslResource('Process', process))
    ).toBe(true);
  });

  // test_put_process_by_id_owner_not_granted
  it("Ensure that users can't update PROCEED process by id, because is owner of process but has insufficient permissions.", async () => {
    const user = {
      id: 'auth0|61c3f50c951c5000704dc981',
      roles: ['1943cce1-a88f-4c58-aae6-f74b25730a2c'],
    };
    const ability = await buildAbility(user);

    const process = processes['_932350bb-5a00-415c-a4de-90629389a0e1'];

    expect(
      ability.can(permissionNumberToIdentifiers(2 + 16), toCaslResource('Process', process))
    ).toBe(false);
  });

  // test_put_process_by_id_unauthenticated
  it("Ensure that unauthenticated users can't update PROCEED process by id.", () => {
    const process = toCaslResource('Process', processes['_932350bb-5a00-415c-a4de-90629389a0e1']);

    expect(unauthenticatedAbility.can(permissionNumberToIdentifiers(2), process)).toBe(false);
    expect(unauthenticatedAbility.can(permissionNumberToIdentifiers(16), process)).toBe(false);
  });
});
