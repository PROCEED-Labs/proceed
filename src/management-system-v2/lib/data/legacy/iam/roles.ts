import { v4 } from 'uuid';
import store from '../store.js';
import { mergeIntoObject } from '../../../helpers/javascriptHelpers';
import { roleMappingsMetaObjects } from './role-mappings';
import Ability, { UnauthorizedError } from '@/lib/ability/abilityHelper';
import { ResourceType, toCaslResource } from '@/lib/ability/caslAbility';
import { Role, RoleInput, RoleInputSchema } from '../../role-schema';
import { rulesCacheDeleteAll } from '@/lib/authorization/authorization';
import { getFolderById } from '../folders';
import { enableUseDB } from 'FeatureFlags';
import db from '@/lib/data';
import { Membership } from './memberships';
import { Prettify } from '@/lib/typescript-utils.js';
// @ts-ignore
let firstInit = !global.roleMetaObjects;

export let roleMetaObjects: Record<string, Role> =
  // @ts-ignore
  global.roleMetaObjects || (global.roleMetaObjects = {});

let inited = false;
/**
 * initializes the roles meta information objects
 */
export function init() {
  if (!firstInit || inited) return;
  inited = true;

  // get roles that were persistently stored
  const storedRoles = store.get('roles') as Role[];

  // set roles store
  store.set('roles', 'roles', storedRoles);

  // set roles store cache for quick access
  storedRoles.forEach((role) => (roleMetaObjects[role.id] = role));
}
init();

/** Returns all roles in form of an array */
export async function getRoles(environmentId?: string, ability?: Ability) {
  if (enableUseDB) {
    const roles = await db.role.findMany({
      where: environmentId ? { environmentId: environmentId } : undefined,
      include: {
        members: true,
      },
    });

    const filteredRoles = ability ? ability.filter('view', 'Process', roles) : roles;

    return filteredRoles as Role[];
  }
  const roles = environmentId
    ? Object.values(roleMetaObjects).filter((role) => role.environmentId === environmentId)
    : Object.values(roleMetaObjects);

  return ability ? ability.filter('view', 'Process', roles) : roles;
}

/**
 * Returns all roles in form of an array
 *
 * @throws {UnauthorizedError}
 */
export async function getRoleByName(environmentId: string, name: string, ability?: Ability) {
  if (enableUseDB) {
    const role = await db.role.findFirst({
      where: {
        environmentId: environmentId,
        name: name,
      },
    });

    if (!role) return undefined;

    if (ability && !ability.can('view', toCaslResource('Role', role))) {
      throw new UnauthorizedError();
    }

    return role;
  }

  for (const role of Object.values(roleMetaObjects)) {
    if (role.name === name && role.environmentId === environmentId) {
      if (ability && !ability.can('view', toCaslResource('Role', role)))
        throw new UnauthorizedError();

      return role;
    }
  }

  return undefined;
}

/**
 * Returns a role based on role id
 *
 * @throws {UnauthorizedError}
 */
export async function getRoleById(roleId: string, ability?: Ability) {
  const role = enableUseDB
    ? await db.role.findUnique({
        where: {
          id: roleId,
        },
        include: {
          members: true,
        },
      })
    : roleMetaObjects[roleId];

  if (!ability) return role as Role;

  if (role && !ability.can('view', toCaslResource('Role', role))) throw new UnauthorizedError();

  return role as Role;
}

/**
 * Adds a new role for the PROCEED MS
 *
 * @throws {UnauthorizedError}
 * @throws {Error}
 */
export async function addRole(roleRepresentationInput: RoleInput, ability?: Ability) {
  if (enableUseDB) {
    const roleRepresentation = RoleInputSchema.parse(roleRepresentationInput);

    if (ability && !ability.can('create', toCaslResource('Role', roleRepresentation))) {
      throw new UnauthorizedError();
    }

    const { name, description, note, permissions, expiration, environmentId } = roleRepresentation;

    // Check if role already exists in the database
    const existingRole = await db.role.findFirst({
      where: {
        name: name,
        environmentId: environmentId,
      },
    });

    if (existingRole) {
      throw new Error('Role already exists');
    }

    const createdOn = new Date().toISOString();
    const lastEditedOn = createdOn;
    const id = v4();

    const createdRole = await db.role.create({
      data: {
        name,
        environmentId,
        description: description || null,
        note: note || null,
        permissions: permissions || {},
        expiration: expiration || null,
        id,
        default: roleRepresentation.default || false,
        createdOn,
        lastEditedOn,
      },
    });

    return createdRole;
  }
  const roleRepresentation = RoleInputSchema.parse(roleRepresentationInput);

  if (ability && !ability.can('create', toCaslResource('Role', roleRepresentation)))
    throw new UnauthorizedError();

  // although the ability check would fail if the parentId doesn't exist
  // it is not always performed
  if (roleRepresentation.parentId && !getFolderById(roleRepresentation.parentId))
    throw new Error('Parent folder does not exist');

  const { name, description, note, permissions, expiration, environmentId } = roleRepresentation;

  const index = Object.values(roleMetaObjects).findIndex(
    (role) => role.name === name && role.environmentId === environmentId,
  );
  if (index > -1) throw new Error('Role already exists');

  const createdOn = new Date();
  const lastEditedOn = createdOn;
  const id = v4();

  const role = {
    name,
    environmentId,
    description: description || null,
    note: note || null,
    permissions: permissions || {},
    expiration: expiration || null,
    members: [],
    id,
    default: roleRepresentation.default,
    createdOn,
    lastEditedOn,
  };

  // check if there is an id collision
  if (roleMetaObjects[id]) {
    throw new Error('Role id already exists');
  }

  // save role info in local cache
  roleMetaObjects[id] = role;

  // persist role on file system
  store.add('roles', role);

  return role;
}

/**
 * Updates a role by id for the PROCEED MS
 *
 * @throws {UnauthorizedError}
 * @throws {Error}
 */
export async function updateRole(
  roleId: string,
  roleRepresentationInput: Partial<RoleInput>,
  ability: Ability,
) {
  if (enableUseDB) {
    console.log(roleId);
    const targetRole = await getRoleById(roleId);
    if (!targetRole) throw new Error('Role not found');

    const roleRepresentation = RoleInputSchema.partial().parse(roleRepresentationInput);

    // Casl isn't really built to check the value of input fields when updating, so we have to perform this two checks
    if (
      !(
        ability.checkInputFields(
          toCaslResource('Role', targetRole),
          'update',
          roleRepresentation,
        ) &&
        ability.can('create', toCaslResource('Role', roleRepresentation), {
          environmentId: targetRole.environmentId,
        })
      )
    )
      throw new UnauthorizedError();
    const updatedRole = await db.role.update({
      where: {
        id: roleId,
      },
      data: {
        ...roleRepresentationInput,
        lastEditedOn: new Date().toISOString(),
      },
    });
    rulesCacheDeleteAll();

    return updatedRole;
  }

  const targetRole = roleMetaObjects[roleId];
  if (!targetRole) throw new Error('Role not found');

  const roleRepresentation = RoleInputSchema.partial().parse(roleRepresentationInput);

  // Casl isn't really built to check the value of input fields when updating, so we have to perform this two checks
  if (
    !(
      ability.checkInputFields(toCaslResource('Role', targetRole), 'update', roleRepresentation) &&
      ability.can('create', toCaslResource('Role', roleRepresentation), {
        environmentId: targetRole.environmentId,
      })
    )
  )
    throw new UnauthorizedError();

  // merge and save at local cache
  // @ts-ignore
  mergeIntoObject(roleMetaObjects[roleId], roleRepresentation, true);
  roleMetaObjects[roleId].lastEditedOn = new Date();

  Object.keys(roleMetaObjects[roleId].permissions).forEach((key) => {
    if (roleMetaObjects[roleId].permissions[key as ResourceType] === 0)
      delete roleMetaObjects[roleId].permissions[key as ResourceType];
  });

  // persist updated role on file system
  store.update('roles', roleId, roleMetaObjects[roleId]);

  rulesCacheDeleteAll();

  return roleMetaObjects[roleId];
}

/**
 * Deletes a role from the PROCEED MS
 *
 * @throws {UnauthorizedError}
 * @throws {Error}
 */
export async function deleteRole(roleId: string, ability?: Ability) {
  if (enableUseDB) {
    const role = await db.role.findUnique({
      where: {
        id: roleId,
      },
    });

    // Throw error if role not found
    if (!role) {
      throw new Error('Role not found');
    }

    // Check if user has permission to delete the role
    if (ability && !ability.can('delete', toCaslResource('Role', role))) {
      throw new UnauthorizedError();
    }

    // Delete role from database
    await db.role.delete({
      where: {
        id: roleId,
      },
    });

    return true;
  }

  const role = roleMetaObjects[roleId];
  if (!role) throw new Error('Role not found');

  if (ability && !ability.can('delete', toCaslResource('Role', role)))
    throw new UnauthorizedError();

  // remove from local cache
  delete roleMetaObjects[roleId];

  // remove from file system
  store.remove('roles', roleId);

  const environmentRoleMappings = roleMappingsMetaObjects[role.environmentId];

  if (environmentRoleMappings) {
    for (const userId of Object.keys(environmentRoleMappings)) {
      const userMappings = environmentRoleMappings.users[userId];

      if (!userMappings) continue;

      const index = environmentRoleMappings.users[userId].findIndex(
        //TODO remove any
        (mapping: any) => mapping.roleId === roleId,
      );

      if (index > -1) {
        userMappings.splice(index, 1);
      }

      if (userMappings.length === 0) delete environmentRoleMappings.users[userId];
    }
  }

  // persist new role mapping in file system
  store.setDictElement('roleMappings', roleMappingsMetaObjects);
}
