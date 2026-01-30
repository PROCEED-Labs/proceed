import { ok, err } from 'neverthrow';
import { v4 } from 'uuid';
import Ability, { UnauthorizedError } from '@/lib/ability/abilityHelper';
import { toCaslResource } from '@/lib/ability/caslAbility';
import { Role, RoleInput, RoleInputSchema, RoleWithMembers } from '../../role-schema';
import { rulesCacheDeleteAll } from '@/lib/authorization/authorization';
import db from '@/lib/data/db';
import { Prisma } from '@prisma/client';

/** Returns all roles in form of an array */
export async function getRoles(environmentId?: string, ability?: Ability) {
  const roles = await db.role.findMany({
    where: environmentId ? { environmentId: environmentId } : undefined,
  });

  const filteredRoles = ability ? ability.filter('view', 'Role', roles) : roles;

  return ok(filteredRoles as Role[]);
}

/** Returns all roles in form of an array including the members of each role included in its data */
export async function getRolesWithMembers(environmentId?: string, ability?: Ability) {
  const roles = await db.role.findMany({
    where: environmentId ? { environmentId: environmentId } : undefined,
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      },
    },
  });

  const mappedRoles = roles.map((role) => ({
    ...role,
    members: role.members.map((member) => member.user),
  })) as RoleWithMembers[];

  const filteredRoles = ability
    ? ability
        .filter('view', 'Role', mappedRoles)
        .map((role) => ({ ...role, members: ability.filter('view', 'User', role.members) }))
    : mappedRoles;

  return ok(filteredRoles);
}

/**
 * Returns all roles in form of an array
 *
 * @throws {UnauthorizedError}
 */
export async function getRoleByName(environmentId: string, name: string, ability?: Ability) {
  const role = await db.role.findFirst({
    where: {
      environmentId: environmentId,
      name: name,
    },
  });

  if (!role) return ok(undefined);

  if (ability && !ability.can('view', toCaslResource('Role', role))) {
    return err(new UnauthorizedError());
  }

  return ok(role);
}

/**
 * Returns a role based on role id
 *
 * @throws {UnauthorizedError}
 */
export async function getRoleById(
  roleId: string,
  ability?: Ability,
  tx?: Prisma.TransactionClient,
) {
  const dbMutator = tx || db;
  const role = await dbMutator.role.findUnique({
    where: {
      id: roleId,
    },
  });

  if (!ability) return ok(role as Role);

  if (role && !ability.can('view', toCaslResource('Role', role)))
    return err(new UnauthorizedError());

  return ok(role as Role | null);
}

/**
 * Returns a role based on role id including information about the roles members
 *
 * @throws {UnauthorizedError}
 */
export async function getRoleWithMembersById(roleId: string, ability?: Ability) {
  const role = await db.role.findUnique({
    where: {
      id: roleId,
    },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      },
    },
  });

  if (!role) return ok(null);

  const mappedRole = {
    ...role,
    members: role.members.map((member) => member.user),
  } as RoleWithMembers;

  if (!ability) return ok(mappedRole);

  if (mappedRole && !ability.can('view', toCaslResource('Role', mappedRole)))
    return err(new UnauthorizedError());

  const filteredRoles = ability
    ? { ...mappedRole, members: ability.filter('view', 'User', mappedRole.members) }
    : mappedRole;

  return ok(filteredRoles);
}

/**
 * Returns the roles that are assigned to a specific user
 */
export async function getUserRoles(userId: string, environmentId?: string, ability?: Ability) {
  const roles = await db.role.findMany({
    where: {
      environmentId,
      members: {
        some: {
          userId,
        },
      },
    },
  });

  const filteredRoles = ability ? ability.filter('view', 'Role', roles) : roles;

  return ok(filteredRoles as Role[]);
}

/**
 * Adds a new role for the PROCEED MS
 *
 * @throws {UnauthorizedError}
 * @throws {Error}
 */
export async function addRole(
  roleRepresentationInput: RoleInput,
  ability?: Ability,
  tx?: Prisma.TransactionClient,
) {
  const dbMutator = tx ? tx : db;

  const parseResult = RoleInputSchema.safeParse(roleRepresentationInput);
  if (!parseResult.success) {
    return err(parseResult.error);
  }

  const roleRepresentation = parseResult.data;

  // if (ability && !ability.can('create', toCaslResource('Role', roleRepresentation))) {
  if (
    ability &&
    (!ability.can('create', toCaslResource('Role', roleRepresentation)) ||
      !ability.can('admin', 'All'))
  ) {
    return err(new UnauthorizedError());
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
    return err(new Error('Role already exists'));
  }

  const createdOn = new Date().toISOString();
  const lastEditedOn = createdOn;
  const id = roleRepresentationInput.id ?? v4();

  const createdRole = await dbMutator.role.create({
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

  return ok(createdRole as Role);
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
  const targetRole = await getRoleById(roleId);
  if (targetRole.isErr()) return targetRole;
  if (!targetRole.value) return err(new Error('Role not found'));

  const parseResult = RoleInputSchema.partial().safeParse(roleRepresentationInput);
  if (!parseResult.success) {
    return err(parseResult.error);
  }
  const roleRepresentation = parseResult.data;

  // Casl isn't really built to check the value of input fields when updating, so we have to perform this two checks
  if (
    !(
      ability.checkInputFields(
        toCaslResource('Role', targetRole.value),
        'update',
        roleRepresentation,
      ) &&
      ability.can('create', toCaslResource('Role', roleRepresentation), {
        environmentId: targetRole.value.environmentId,
      })
    ) ||
    !ability.can('admin', 'All')
  ) {
    return err(new UnauthorizedError());
  }

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

  return ok(updatedRole as Role);
}

/**
 * Deletes a role from the PROCEED MS
 *
 * @throws {UnauthorizedError}
 * @throws {Error}
 */
export async function deleteRole(roleId: string, ability?: Ability) {
  const role = await db.role.findUnique({
    where: {
      id: roleId,
    },
  });

  // Throw error if role not found
  if (!role) {
    return err(new Error('Role not found'));
  }

  // Check if user has permission to delete the role
  if (
    ability &&
    (!ability.can('delete', toCaslResource('Role', role)) || !ability.can('admin', 'All'))
  ) {
    return err(new UnauthorizedError());
  }

  // Delete role from database
  await db.role.delete({
    where: {
      id: roleId,
    },
  });

  return ok(true);
}
