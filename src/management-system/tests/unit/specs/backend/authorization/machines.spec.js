const { abilitiesBuilt, buildAbility } = require('./authorization');
const { toCaslResource } = require('../../../../../src/backend/server/iam/authorization/caslRules');
const {
  permissionNumberToIdentifiers,
} = require('../../../../../src/backend/server/iam/authorization/permissionHelpers');

let adminAbility, all_role_permissionsAbility, unauthenticatedAbility;

beforeAll(async () => {
  const abilities = await abilitiesBuilt;
  adminAbility = abilities[0];
  all_role_permissionsAbility = abilities[4];
  unauthenticatedAbility = abilities[8];
});

describe('Test casl authorization', () => {
  // test_get_machines_admin
  it('Ensure that users can view PROCEED machines, because user is super admin.', () => {
    expect(adminAbility.can(permissionNumberToIdentifiers(1), 'Machine')).toBe(true);
  });

  // test_get_machines_has_admin_permissions
  it('Ensure that users can view PROCEED machines, because user has admin permissions for machines.', async () => {
    const user = {
      id: 'tempId',
      roles: ['8ae56c4f-fe37-4cf8-ae0f-42fab0fce1be'],
    };
    const ability = await buildAbility(user);

    expect(ability.can(permissionNumberToIdentifiers(1), 'Machine')).toBe(true);
  });

  // test_get_machines_not_granted
  it("Ensure that users can't view PROCEED machines, because user has no sufficient permissions.", () => {
    expect(all_role_permissionsAbility.can(permissionNumberToIdentifiers(1), 'Machine')).toBe(
      false
    );
  });

  // test_get_machines_granted
  it('Ensure that users can view PROCEED machines, because user has sufficient permissions.', async () => {
    const user = {
      id: 'tempId',
      roles: ['99c60055-7538-426c-8592-34bfe68f7e0d'],
    };
    const ability = await buildAbility(user);

    expect(ability.can(permissionNumberToIdentifiers(1), 'Machine')).toBe(true);
  });

  it("Ensure that unauthenticated users can't view PROCEED machines.", async () => {
    expect(unauthenticatedAbility.can(permissionNumberToIdentifiers(1), 'Machine')).toBe(false);
  });
});

describe('GET /api/machines/:id', () => {
  // test_get_machines_by_id_admin
  it('Ensure that users can view PROCEED machines by id, because user is super admin.', () => {
    const machine = { id: '_932350bb-5a00-415c-a4de-90629389a0e1' };

    expect(
      adminAbility.can(permissionNumberToIdentifiers(1), toCaslResource('Machine', machine))
    ).toBe(true);
  });

  // test_get_machines_by_id_has_admin_permissions
  it('Ensure that users can view PROCEED machines by id, because user has admin permissions for machines.', async () => {
    const user = {
      id: 'tempId',
      roles: ['8ae56c4f-fe37-4cf8-ae0f-42fab0fce1be'],
    };
    const ability = await buildAbility(user);
    const machine = { id: '_932350bb-5a00-415c-a4de-90629389a0e1' };

    expect(ability.can(permissionNumberToIdentifiers(1), toCaslResource('Machine', machine))).toBe(
      true
    );
  });

  // test_get_machines_by_id_not_granted
  it("Ensure that users can't view PROCEED machines by id, because user has no sufficient permissions.", () => {
    const machine = { id: '_932350bb-5a00-415c-a4de-90629389a0e1' };

    expect(
      all_role_permissionsAbility.can(
        permissionNumberToIdentifiers(1),
        toCaslResource('Machine', machine)
      )
    ).toBe(false);
  });

  // test_get_machines_by_id_granted
  it('Ensure that users can view PROCEED machines by id, because user has sufficient permissions.', async () => {
    const user = {
      id: 'tempId',
      roles: ['99c60055-7538-426c-8592-34bfe68f7e0d'],
    };
    const ability = await buildAbility(user);
    const machine = { id: '_932350bb-5a00-415c-a4de-90629389a0e1' };

    expect(ability.can(permissionNumberToIdentifiers(1), toCaslResource('Machine', machine))).toBe(
      true
    );
  });

  // test_get_machines_by_id_unauthenticated
  it("Ensure that unauthenticated users can't view PROCEED machines by id.", async () => {
    const machine = { id: '_932350bb-5a00-415c-a4de-90629389a0e1' };

    expect(
      unauthenticatedAbility.can(
        permissionNumberToIdentifiers(1),
        toCaslResource('Machine', machine)
      )
    ).toBe(false);
  });
});

describe('POST /api/machines', () => {
  // test_post_machines_admin
  it('Ensure that users can create new PROCEED machines, because user is super admin.', () => {
    expect(adminAbility.can(permissionNumberToIdentifiers(4 + 16), 'Machine')).toBe(true);
  });

  // test_post_machines_has_admin_permissions
  it('Ensure that users can create new PROCEED machines, because user has admin permissions for machines.', async () => {
    const user = {
      id: 'tempId',
      roles: ['8ae56c4f-fe37-4cf8-ae0f-42fab0fce1be'],
    };
    const ability = await buildAbility(user);

    expect(ability.can(permissionNumberToIdentifiers(4 + 16), 'Machine')).toBe(true);
  });

  // test_post_machines_not_granted
  it("Ensure that users can't create new PROCEED machines, because user has no sufficient permissions.", () => {
    expect(all_role_permissionsAbility.can(permissionNumberToIdentifiers(4), 'Machine')).toBe(
      false
    );
    expect(all_role_permissionsAbility.can(permissionNumberToIdentifiers(16), 'Machine')).toBe(
      false
    );
  });

  // test_post_machines_granted
  it('Ensure that users can create new PROCEED machines, because user has sufficient permissions.', async () => {
    const user = {
      id: 'tempId',
      roles: ['99c60055-7538-426c-8592-34bfe68f7e0d'],
    };
    const ability = await buildAbility(user);

    expect(ability.can(permissionNumberToIdentifiers(4 + 16), 'Machine')).toBe(true);
  });

  // test_post_machines_unauthenticated
  it("Ensure that unauthenticated users can't create new PROCEED machines.", async () => {
    expect(unauthenticatedAbility.can(permissionNumberToIdentifiers(4), 'Machine')).toBe(false);
    expect(unauthenticatedAbility.can(permissionNumberToIdentifiers(16), 'Machine')).toBe(false);
  });
});
describe('PUT /api/machines/:id', () => {
  // test_put_machines_admin
  it('Ensure that users can update PROCEED machines, because user is super admin.', () => {
    const machine = { id: '_932350bb-5a00-415c-a4de-90629389a0e1' };

    expect(
      adminAbility.can(permissionNumberToIdentifiers(2 + 16), toCaslResource('Machine', machine))
    ).toBe(true);
  });

  // test_put_machines_has_admin_permissions
  it('Ensure that users can update PROCEED machines, because user has admin permissions for machines.', async () => {
    const user = {
      id: 'tempId',
      roles: ['8ae56c4f-fe37-4cf8-ae0f-42fab0fce1be'],
    };
    const ability = await buildAbility(user);
    const machine = { id: '_932350bb-5a00-415c-a4de-90629389a0e1' };

    expect(
      ability.can(permissionNumberToIdentifiers(2 + 16), toCaslResource('Machine', machine))
    ).toBe(true);
  });

  // test_put_machines_not_granted
  it("Ensure that users can't update PROCEED machines, because user has no sufficient permissions.", () => {
    const machine = { id: '_932350bb-5a00-415c-a4de-90629389a0e1' };

    expect(
      all_role_permissionsAbility.can(
        permissionNumberToIdentifiers(2 + 16),
        toCaslResource('Machine', machine)
      )
    ).toBe(false);
  });

  // test_put_machines_granted
  it('Ensure that users can update PROCEED machines, because user has sufficient permissions.', async () => {
    const user = {
      id: 'tempId',
      roles: ['99c60055-7538-426c-8592-34bfe68f7e0d'],
    };
    const ability = await buildAbility(user);
    const machine = { id: '_932350bb-5a00-415c-a4de-90629389a0e1' };

    expect(
      ability.can(permissionNumberToIdentifiers(2 + 16), toCaslResource('Machine', machine))
    ).toBe(true);
  });

  // test_put_machines_unauthenticated
  it("Ensure that unauthenticated users can't update PROCEED machines.", async () => {
    const machine = { id: '_932350bb-5a00-415c-a4de-90629389a0e1' };

    expect(
      unauthenticatedAbility.can(
        permissionNumberToIdentifiers(2),
        toCaslResource('Machine', machine)
      )
    ).toBe(false);
    expect(
      unauthenticatedAbility.can(
        permissionNumberToIdentifiers(16),
        toCaslResource('Machine', machine)
      )
    ).toBe(false);
  });
});

describe('DELETE /api/machines/:id', () => {
  // test_delete_machines_admin
  it('Ensure that users can delete PROCEED machines, because user is super admin.', () => {
    const machine = { id: '_932350bb-5a00-415c-a4de-90629389a0e1' };

    expect(
      adminAbility.can(permissionNumberToIdentifiers(8 + 16), toCaslResource('Machine', machine))
    ).toBe(true);
  });

  // test_delete_machines_has_admin_permissions
  it('Ensure that users can delete PROCEED machines, because user has admin permissions for machines.', async () => {
    const user = {
      id: 'tempId',
      roles: ['8ae56c4f-fe37-4cf8-ae0f-42fab0fce1be'],
    };
    const ability = await buildAbility(user);
    const machine = { id: '_932350bb-5a00-415c-a4de-90629389a0e1' };

    expect(
      ability.can(permissionNumberToIdentifiers(8 + 16), toCaslResource('Machine', machine))
    ).toBe(true);
  });

  // test_delete_machines_not_granted
  it("Ensure that users can't delete PROCEED machines, because user has no sufficient permissions.", () => {
    const machine = { id: '_932350bb-5a00-415c-a4de-90629389a0e1' };

    expect(
      all_role_permissionsAbility.can(
        permissionNumberToIdentifiers(8),
        toCaslResource('Machine', machine)
      )
    ).toBe(false);
    expect(
      all_role_permissionsAbility.can(
        permissionNumberToIdentifiers(16),
        toCaslResource('Machine', machine)
      )
    ).toBe(false);
  });

  // test_delete_machines_granted
  it('Ensure that users can delete PROCEED machines, because user has sufficient permissions.', async () => {
    const user = {
      id: 'tempId',
      roles: ['99c60055-7538-426c-8592-34bfe68f7e0d'],
    };
    const ability = await buildAbility(user);
    const machine = { id: '_932350bb-5a00-415c-a4de-90629389a0e1' };

    expect(
      ability.can(permissionNumberToIdentifiers(8 + 16), toCaslResource('Machine', machine))
    ).toBe(true);
  });

  // test_delete_machines_unauthenticated
  it("Ensure that unauthenticated users can't delete PROCEED machines.", async () => {
    const machine = { id: '_932350bb-5a00-415c-a4de-90629389a0e1' };

    expect(unauthenticatedAbility.can('delete', toCaslResource('Machine', machine))).toBe(false);
    expect(unauthenticatedAbility.can('manage', toCaslResource('Machine', machine))).toBe(false);
  });
});
