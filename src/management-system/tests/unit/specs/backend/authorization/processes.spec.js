const {
  processArray,
  processes,
  abilitiesBuilt,
  buildAbility,
} = require('../../../../mocks/authorization');
const { toCaslResource } = require('../../../../../src/backend/server/iam/authorization/caslRules');
const {
  permissionNumberToIdentifiers,
} = require('../../../../../src/backend/server/iam/authorization/permissionHelpers');

let adminAbility,
  environment_adminAbility,
  process_engineer_adminAbility,
  all_user_permissionsAbility,
  all_role_permissionsAbility,
  selfAbility,
  expired_roleAbility,
  noRolesAbility,
  unauthenticatedAbility;

beforeAll(async () => {
  const abilities = await abilitiesBuilt;
  adminAbility = abilities[0];
  environment_adminAbility = abilities[1];
  process_engineer_adminAbility = abilities[2];
  all_user_permissionsAbility = abilities[3];
  all_role_permissionsAbility = abilities[4];
  selfAbility = abilities[5];
  expired_roleAbility = abilities[6];
  noRolesAbility = abilities[7];
  unauthenticatedAbility = abilities[8];
});

describe('Test casl authorization', () => {
  // test_get_process_admin
  it(': Ensure that users can view PROCEED processes, because user is super admin.', () => {
    const filtered = adminAbility
      .filter(permissionNumberToIdentifiers(1), 'Process', processArray)
      .map((p) => p.id);

    expect(filtered.sort()).toEqual(
      [
        '_932350bb-5a00-415c-a4de-90629389a0e1',
        '_dcc316cc-67a1-4b7a-929b-831e73b06f2a',
        '_a19c9329-7b52-4516-939a-0fdc0151ace4',
      ].sort()
    );
  });

  // test_get_process_has_admin_permissions
  it('Test: Ensure that users can view PROCEED processes, because user has admin permissions for processes.', () => {
    const filtered = process_engineer_adminAbility
      .filter(permissionNumberToIdentifiers(1), 'Process', processArray)
      .map((p) => p.id);

    expect(filtered.sort()).toEqual(
      [
        '_932350bb-5a00-415c-a4de-90629389a0e1',
        '_dcc316cc-67a1-4b7a-929b-831e73b06f2a',
        '_a19c9329-7b52-4516-939a-0fdc0151ace4',
      ].sort()
    );
  });

  // test_get_process_not_granted
  it("Test: Ensure that users can't view PROCEED processes, because user has no sufficient permissions.", () => {
    const filtered = all_role_permissionsAbility
      .filter(permissionNumberToIdentifiers(1), 'Process', processArray)
      .map((p) => p.id);

    expect(filtered.sort()).toEqual([].sort());

    expect(all_role_permissionsAbility.can('view', 'Process')).toBe(false);
  });

  // test_get_process_shared
  it('Test: Ensure that users can view PROCEED processes, because has shared processes.', async () => {
    const user = {
      id: 'auth0|6174afb925f203006808dbd5',
      roles: ['99c60055-7538-426c-8592-34bfe68f7e0d'],
    };
    const ability = await buildAbility(user);

    const filtered = ability
      .filter(permissionNumberToIdentifiers(1), 'Process', processArray)
      .map((p) => p.id);

    expect(filtered.sort()).toEqual(['_932350bb-5a00-415c-a4de-90629389a0e1'].sort());
  });

  // test_get_process_shared_not_granted
  it("Test: Ensure that users can't view PROCEED processes, because has shared processes but insufficient role permissions.", async () => {
    const user = {
      id: 'auth0|6174afb925f203006808dbd5',
      roles: ['1943cce1-a88f-4c58-aae6-f74b25730a2c'],
    };
    const ability = await buildAbility(user);

    expect(ability.can(permissionNumberToIdentifiers(1), 'Process')).toEqual(false);
  });

  // test_get_process_owner_granted
  it('Test: Ensure that users can view PROCEED processes, because is owner of process and has sufficient permissions.', async () => {
    const user = {
      id: '2862dda7-7e40-4a70-a3fe-917fd9a2ac97',
      roles: ['99c60055-7538-426c-8592-34bfe68f7e0d'],
    };
    const ability = await buildAbility(user);

    const filtered = ability
      .filter(permissionNumberToIdentifiers(1), 'Process', processArray)
      .map((p) => p.id);

    expect(ability.can('view', 'Process')).toBe(true);
    expect(filtered.sort()).toEqual(['_dcc316cc-67a1-4b7a-929b-831e73b06f2a'].sort());
  });

  // test_get_process_owner_not_granted
  it("Test: Ensure that users can't view PROCEED processes, because is owner of process but has insufficient permissions.", async () => {
    const user = {
      id: '2862dda7-7e40-4a70-a3fe-917fd9a2ac97',
      roles: ['1943cce1-a88f-4c58-aae6-f74b25730a2c'],
    };
    const ability = await buildAbility(user);

    expect(ability.can('view', 'Process')).toBe(false);
  });

  // test_get_process_owner_unauthenticated
  it("Test: Ensure that unauthenticated users can't view PROCEED processes.", () => {
    const filtered = unauthenticatedAbility
      .filter('view', 'Process', processArray)
      .map((p) => p.id);

    expect(unauthenticatedAbility.can('view', 'Process')).toBe(false);
    expect(filtered.sort()).toEqual([].sort());
  });
});

describe('GET /api/process/:id', () => {
  // test_get_process_by_id_admin
  it('Test: Ensure that users can view PROCEED process by id, because user is super admin.', () => {
    const process = toCaslResource('Process', processes['_dcc316cc-67a1-4b7a-929b-831e73b06f2a']);

    expect(adminAbility.can(permissionNumberToIdentifiers(1), process)).toBe(true);
  });

  // test_get_process_by_id_has_admin_permissions
  it('Test: Ensure that users can view PROCEED process by id, because user has admin permissions.', () => {
    const process = toCaslResource('Process', processes['_dcc316cc-67a1-4b7a-929b-831e73b06f2a']);

    expect(process_engineer_adminAbility.can(permissionNumberToIdentifiers(1), process)).toBe(true);
  });

  // test_get_process_by_id_not_granted
  it("Test: Ensure that users can't view PROCEED process by id, because insufficient role permissions.", () => {
    const process = toCaslResource('Process', processes['_dcc316cc-67a1--929b-831e73b06f2a']);

    expect(all_role_permissionsAbility.can(permissionNumberToIdentifiers(1), process)).toBe(false);
  });

  // test_get_process_by_id_shared
  it('Test: Ensure that users can view PROCEED process by id, because has shared processes.', async () => {
    const user = {
      id: 'auth0|6174afb925f203006808dbd5',
      roles: ['99c60055-7538-426c-8592-34bfe68f7e0d'],
    };
    const ability = await buildAbility(user);
    const process = toCaslResource('Process', processes['_932350bb-5a00-415c-a4de-90629389a0e1']);

    expect(ability.can(permissionNumberToIdentifiers(1), process)).toBe(true);
  });

  // test_get_process_by_id_shared_not_granted
  it("Test: Ensure that users can't view PROCEED process by id, because has shared processes but insufficient role permissions.", async () => {
    const user = {
      id: 'auth0|6174afb925f203006808dbd5',
      roles: ['1943cce1-a88f-4c58-aae6-f74b25730a2c'],
    };
    const ability = await buildAbility(user);
    const process = toCaslResource('Process', processes['_932350bb-5a00-415c-a4de-90629389a0e1']);

    expect(ability.can(permissionNumberToIdentifiers(1), process)).toBe(false);
  });

  // test_get_process_by_id_owner_granted
  it('Test: Ensure that users can view PROCEED process by id, because is owner of process and has sufficient permissions.', async () => {
    const user = {
      id: 'auth0|61c3f50c951c5000704dc981',
      roles: ['99c60055-7538-426c-8592-34bfe68f7e0d'],
    };
    const ability = await buildAbility(user);
    const process = toCaslResource('Process', processes['_932350bb-5a00-415c-a4de-90629389a0e1']);

    expect(ability.can(permissionNumberToIdentifiers(1), process)).toBe(true);
  });

  // test_get_process_by_id_owner_not_granted
  it("Test: Ensure that users can't view PROCEED process by id, because is owner of process but has insufficient permissions.", async () => {
    const user = {
      id: 'auth0|61c3f50c951c5000704dc981',
      roles: ['1943cce1-a88f-4c58-aae6-f74b25730a2c'],
    };
    const ability = await buildAbility(user);
    const process = toCaslResource('Process', processes['_932350bb-5a00-415c-a4de-90629389a0e1']);

    expect(ability.can(permissionNumberToIdentifiers(1), process)).toBe(false);
  });

  // // test_get_process_by_id_unauthenticated
  it("Test: Ensure that unauthenticated users can't view PROCEED process by id.", () => {
    const process = toCaslResource('Process', processes['_932350bb-5a00-415c-a4de-90629389a0e1']);

    expect(unauthenticatedAbility.can(permissionNumberToIdentifiers(1), process)).toBe(false);
  });
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
  it("Test: Ensure that users can't create new PROCEED processes, because of insufficient role permissions.", async () => {
    const user = {
      id: 'auth0|6174afb925f203006808dbd5',
      roles: ['d59266f8-0818-4923-8a31-abeff91c4963'],
    };
    const ability = await buildAbility(user);

    expect(ability.can(permissionNumberToIdentifiers(4 + 16), 'Process')).toBe(false);
  });

  // test_post_process_admin
  it('Test: Ensure that users can create new PROCEED processes, because user is super admin.', () => {
    expect(adminAbility.can(permissionNumberToIdentifiers(4 + 16), 'Process')).toBe(true);
  });

  // test_post_process_has_admin_permissions
  it('Test: Ensure that users can create new PROCEED processes, because user has admin permissions.', () => {
    expect(
      process_engineer_adminAbility.can(permissionNumberToIdentifiers(4 + 16), 'Process')
    ).toBe(true);
  });

  // test_post_process_unauthenticated
  it("Test: Ensure that unauthenticated users can't create new PROCEED processes.", () => {
    expect(unauthenticatedAbility.can(permissionNumberToIdentifiers(4), 'Process')).toBe(false);
    expect(unauthenticatedAbility.can(permissionNumberToIdentifiers(16), 'Process')).toBe(false);
  });
});

describe('PUT /api/process/:id', () => {
  // t_put_process_by_id_admin
  it('Test: Ensure that users can update PROCEED process by id, because user is super admin.', () => {
    const process = toCaslResource('Process', processes['_dcc316cc-67a1-4b7a-929b-831e73b06f2a']);
    expect(
      adminAbility.can(permissionNumberToIdentifiers(2 + 16), toCaslResource('Process', process))
    ).toBe(true);
  });

  // test_put_process_by_id_has_admin_permissions
  it('Test: Ensure that users can update PROCEED process by id, because user has admin permissions.', () => {
    const process = toCaslResource('Process', processes['_dcc316cc-67a1-4b7a-929b-831e73b06f2a']);
    expect(
      process_engineer_adminAbility.can(
        permissionNumberToIdentifiers(2 + 16),
        toCaslResource('Process', process)
      )
    ).toBe(true);
  });

  // test_put_process_by_id_not_granted
  it("Test: Ensure that users can't update PROCEED process by id, because insufficient role permissions.", () => {
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
  it('Test: Ensure that users can update PROCEED process by id, because has shared processes.', async () => {
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
  it("Test: Ensure that users can't update PROCEED process by id, because has shared processes but insufficient role permissions.", async () => {
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
  it('Test: Ensure that users can update PROCEED process by id, because is owner of process and has sufficient permissions.', async () => {
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
  it("Test: Ensure that users can't update PROCEED process by id, because is owner of process but has insufficient permissions.", async () => {
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
  it("Test: Ensure that unauthenticated users can't update PROCEED process by id.", () => {
    const process = toCaslResource('Process', processes['_932350bb-5a00-415c-a4de-90629389a0e1']);

    expect(unauthenticatedAbility.can(permissionNumberToIdentifiers(2), process)).toBe(false);
    expect(unauthenticatedAbility.can(permissionNumberToIdentifiers(16), process)).toBe(false);
  });
});

describe('DELETE /api/process/:id', () => {
  // test_delete_process_by_id_admin
  it('Test: Ensure that users can delete PROCEED process by id, because user is super admin.', () => {
    const process = processes['_dcc316cc-67a1-4b7a-929b-831e73b06f2a'];

    expect(
      adminAbility.can(permissionNumberToIdentifiers(8 + 16), toCaslResource('Process', process))
    ).toBe(true);
  });

  // test_delete_process_by_id_has_admin_permissions
  it('Test: Ensure that users can delete PROCEED process by id, because user has admin permissions.', () => {
    const process = processes['_dcc316cc-67a1-4b7a-929b-831e73b06f2a'];

    expect(
      process_engineer_adminAbility.can(
        permissionNumberToIdentifiers(8 + 16),
        toCaslResource('Process', process)
      )
    ).toBe(true);
  });

  // test_delete_process_by_id_not_granted
  it("Test: Ensure that users can't delete PROCEED process by id, because insufficient role permissions.", () => {
    const process = processes['_dcc316cc-67a1-4b7a-929b-831e73b06f2a'];

    expect(
      all_role_permissionsAbility.can(
        permissionNumberToIdentifiers(8),
        toCaslResource('Process', process)
      )
    ).toBe(false);
    expect(
      all_role_permissionsAbility.can(
        permissionNumberToIdentifiers(16),
        toCaslResource('Process', process)
      )
    ).toBe(false);
  });

  // test_delete_process_by_id_shared
  it('Test: Ensure that users can delete PROCEED process by id, because has shared processes.', async () => {
    const process = processes['_932350bb-5a00-415c-a4de-90629389a0e1'];

    const user = {
      id: 'auth0|6174afb925f203006808dbd5',
      roles: ['99c60055-7538-426c-8592-34bfe68f7e0d'],
    };
    const ability = await buildAbility(user);

    // NOTE orginal tests included 16
    expect(ability.can(permissionNumberToIdentifiers(8), toCaslResource('Process', process))).toBe(
      true
    );
  });

  // test_delete_process_by_id_shared_not_granted
  it("Test: Ensure that users can't delete PROCEED process by id, because has shared processes but insufficient role permissions.", async () => {
    const user = {
      id: 'auth0|6174afb925f203006808dbd5',
      roles: ['1943cce1-a88f-4c58-aae6-f74b25730a2c'],
    };
    const ability = await buildAbility(user);

    const process = processes['_932350bb-5a00-415c-a4de-90629389a0e1'];

    expect(ability.can(permissionNumberToIdentifiers(8), toCaslResource('Process', process))).toBe(
      false
    );
    expect(ability.can(permissionNumberToIdentifiers(16), toCaslResource('Process', process))).toBe(
      false
    );
  });

  // test_delete_process_by_id_owner_granted
  it('Test: Ensure that users can delete PROCEED process by id, because is owner of process and has sufficient permissions.', async () => {
    const user = {
      id: 'auth0|61c3f50c951c5000704dc981',
      roles: ['99c60055-7538-426c-8592-34bfe68f7e0d'],
    };
    const ability = await buildAbility(user);

    const process = processes['_932350bb-5a00-415c-a4de-90629389a0e1'];

    expect(
      ability.can(permissionNumberToIdentifiers(8 + 16), toCaslResource('Process', process))
    ).toBe(true);
  });

  // test_delete_process_by_id_owner_not_granted
  it("Test: Ensure that users can't delete PROCEED process by id, because is owner of process but has insufficient permissions.", async () => {
    const user = {
      id: 'auth0|61c3f50c951c5000704dc981',
      roles: ['1943cce1-a88f-4c58-aae6-f74b25730a2c'],
    };
    const ability = await buildAbility(user);

    const process = processes['_932350bb-5a00-415c-a4de-90629389a0e1'];

    expect(ability.can(permissionNumberToIdentifiers(8), toCaslResource('Process', process))).toBe(
      false
    );
    expect(ability.can(permissionNumberToIdentifiers(16), toCaslResource('Process', process))).toBe(
      false
    );
  });

  //   // test_delete_process_by_id_unauthenticated
  it("Test: Ensure that unauthenticated users can't delete PROCEED process by id.", () => {
    const process = toCaslResource('Process', processes['_932350bb-5a00-415c-a4de-90629389a0e1']);

    expect(unauthenticatedAbility.can(permissionNumberToIdentifiers(8), process)).toBe(false);
    expect(unauthenticatedAbility.can(permissionNumberToIdentifiers(16), process)).toBe(false);
  });
});
