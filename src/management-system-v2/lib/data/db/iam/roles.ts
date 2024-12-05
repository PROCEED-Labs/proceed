import { v4 } from 'uuid';
import Ability, { UnauthorizedError } from '@/lib/ability/abilityHelper';
import { toCaslResource } from '@/lib/ability/caslAbility';
import { Role, RoleInput, RoleInputSchema } from '../../role-schema';
import { rulesCacheDeleteAll } from '@/lib/authorization/authorization';
import db from '@/lib/data/db';

/** Returns all roles in form of an array */
export async function getRoles(environmentId?: string, ability?: Ability) {
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

  const filteredRoles = ability ? ability.filter('view', 'Role', roles) : roles;

  return filteredRoles as Role[];
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

  if (!role) return undefined;

  if (ability && !ability.can('view', toCaslResource('Role', role))) {
    throw new UnauthorizedError();
  }

  return role;
}

/**
 * Returns a role based on role id
 *
 * @throws {UnauthorizedError}
 */
export async function getRoleById(roleId: string, ability?: Ability) {
  const role = await db.role.findUnique({
    where: {
      id: roleId,
    },
    include: {
      members: true,
    },
  });

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

  return createdRole as Role;
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

  return updatedRole as Role;
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
