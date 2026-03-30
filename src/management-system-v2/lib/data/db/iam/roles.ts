import { v4 } from 'uuid';
import Ability, { UnauthorizedError } from '@/lib/ability/abilityHelper';
import { toCaslResource } from '@/lib/ability/caslAbility';
import {
  Role,
  RoleInput,
  RoleInputSchema,
  RoleWithChildren,
  RoleWithMembers,
  RoleWithMembersAndChildren,
} from '../../role-schema';
import { rulesCacheDeleteAll } from '@/lib/authorization/authorization';
import db from '@/lib/data/db';
import { Prisma } from '@prisma/client';

/** Returns all roles in form of an array */
export async function getRoles(environmentId?: string, ability?: Ability) {
  const roles = await db.role.findMany({
    where: environmentId ? { environmentId: environmentId } : undefined,
  });

  const filteredRoles = ability ? ability.filter('view', 'Role', roles) : roles;

  return filteredRoles as Role[];
}

/** Returns all roles in form of an array including the members of each role included in its data */
export async function getRolesWithMembers(environmentId?: string, ability?: Ability) {
  const roles = await db.role.findMany({
    where: { environmentId: environmentId, parentRoleId: null },
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

  return filteredRoles;
}

export async function getAdminRole(environmentId: string, ability?: Ability) {
  const role = await db.role.findFirst({
    where: {
      environmentId: environmentId,
      name: '@admin',
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
export async function getRoleById<
  T extends undefined | true | false,
  ReturnType extends Role | RoleWithChildren = T extends true ? RoleWithChildren : Role,
>(
  roleId: string,
  ability?: Ability,
  tx?: Prisma.TransactionClient,
  withChildren?: T,
): Promise<ReturnType> {
  const dbMutator = tx || db;
  const role = await dbMutator.role.findUnique({
    where: {
      id: roleId,
    },
    include: {
      children: withChildren,
    },
  });

  if (!ability) return role as ReturnType;

  if (role && !ability.can('view', toCaslResource('Role', role))) throw new UnauthorizedError();

  return role as ReturnType;
}

/**
 * Returns a role based on role id including information about the roles members
 *
 * @throws {UnauthorizedError}
 */
export async function getRoleWithMembersById<
  T extends undefined | true | false,
  ReturnType extends RoleWithMembers | RoleWithMembersAndChildren = T extends true
    ? RoleWithMembersAndChildren
    : RoleWithMembers,
>(
  roleId: string,
  ability?: Ability,
  withChildren?: T,
  tx?: Prisma.TransactionClient,
): Promise<ReturnType | null> {
  const dbMutator = tx || db;

  const role = await dbMutator.role.findUnique({
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
      children: withChildren,
    },
  });

  if (!role) return null;

  const mappedRole = {
    ...role,
    members: role.members.map((member) => member.user),
  } as ReturnType;

  if (!ability) return mappedRole;

  if (mappedRole && !ability.can('view', toCaslResource('Role', mappedRole as RoleWithMembers)))
    throw new UnauthorizedError();

  return ability
    ? { ...mappedRole, members: ability.filter('view', 'User', mappedRole.members) }
    : mappedRole;
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

  return filteredRoles as Role[];
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
  allowDuplicateName = false,
) {
  const dbMutator = tx ? tx : db;

  const roleRepresentation = RoleInputSchema.parse(roleRepresentationInput);

  // if (ability && !ability.can('create', toCaslResource('Role', roleRepresentation))) {
  if (
    ability &&
    (!ability.can('create', toCaslResource('Role', roleRepresentation)) ||
      !ability.can('admin', 'All'))
  ) {
    throw new UnauthorizedError();
  }

  const { name, description, organizationRoleType, note, permissions, expiration, environmentId } =
    roleRepresentation;

  if (!allowDuplicateName) {
    // Check if role with this name already exists in this space
    const existingRole = await db.role.findFirst({
      where: {
        name: name,
        environmentId: environmentId,
      },
    });

    if (existingRole) {
      throw new Error('Role already exists');
    }
  }

  const createdOn = new Date().toISOString();
  const lastEditedOn = createdOn;
  const id = roleRepresentationInput.id ?? v4();

  const createdRole = await dbMutator.role.create({
    data: {
      name,
      environmentId,
      description: description || null,
      organizationRoleType: organizationRoleType ?? [],
      note: note || null,
      permissions: permissions || {},
      expiration: expiration || null,
      id,
      default: roleRepresentation.default || false,
      createdOn,
      lastEditedOn,
      parentId: roleRepresentation.parentId,
      parentRoleId: roleRepresentation.parentRoleId,
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
  tx?: Prisma.TransactionClient,
) {
  const dbMutator = tx || db;
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
    ) ||
    !ability.can('admin', 'All')
  )
    throw new UnauthorizedError();
  const updatedRole = await dbMutator.role.update({
    where: {
      id: roleId,
    },
    data: {
      ...roleRepresentationInput,
      lastEditedOn: new Date().toISOString(),
    },
  });
  rulesCacheDeleteAll();

  // If organizationRoleType changed, clear organigram references for removed types
  if (roleRepresentationInput.organizationRoleType !== undefined) {
    const hadTeam = targetRole.organizationRoleType?.includes('team');
    const hasTeam = roleRepresentation.organizationRoleType?.includes('team');
    const hadBackOffice = targetRole.organizationRoleType?.includes('back-office');
    const hasBackOffice = roleRepresentation.organizationRoleType?.includes('back-office');

    if (hadTeam && !hasTeam) {
      await dbMutator.userOrganigram.updateMany({
        where: { teamRoleId: roleId },
        data: { teamRoleId: null },
      });
    }

    if (hadBackOffice && !hasBackOffice) {
      await dbMutator.userOrganigram.updateMany({
        where: { backOfficeRoleId: roleId },
        data: { backOfficeRoleId: null },
      });
    }
  }

  return updatedRole as Role;
}

/**
 * Deletes a role from the PROCEED MS
 *
 * @throws {UnauthorizedError}
 * @throws {Error}
 */
export async function deleteRole(roleId: string, ability?: Ability, tx?: Prisma.TransactionClient) {
  const dbMutator = tx || db;
  const role = await dbMutator.role.findUnique({
    where: {
      id: roleId,
    },
  });

  // Throw error if role not found
  if (!role) {
    throw new Error('Role not found');
  }

  // Check if user has permission to delete the role
  if (
    ability &&
    (!ability.can('delete', toCaslResource('Role', role)) || !ability.can('admin', 'All'))
  ) {
    throw new UnauthorizedError();
  }

  // Delete role from database
  await dbMutator.role.delete({
    where: {
      id: roleId,
    },
  });

  return true;
}
