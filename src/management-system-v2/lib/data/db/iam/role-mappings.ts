import { v4 } from 'uuid';
import { getRoleById } from './roles';
import Ability, { UnauthorizedError } from '@/lib/ability/abilityHelper';
import { toCaslResource } from '@/lib/ability/caslAbility';
import { z } from 'zod';
import { getUserById } from './users';
import { getEnvironmentById } from './environments';
import db from '@/lib/data/db';
import { Prisma } from '@prisma/client';
import { UserFacingError } from '@/lib/user-error';

const RoleMappingInputSchema = z.object({
  roleId: z.string(),
  userId: z.string(),
  environmentId: z.string(),
  expiration: z.string().optional(),
});

export type RoleMappingInput = z.infer<typeof RoleMappingInputSchema>;

export type RoleMapping = RoleMappingInput & { id: string; createdOn: string; roleName: string };

/** Returns all role mappings in form of an array */
export async function getRoleMappings(ability?: Ability, environmentId?: string) {
  const roles = await db.role.findMany({
    where: { environmentId: environmentId ? environmentId : undefined },
    include: { members: true },
  });

  const roleMappings = roles.flatMap((role) =>
    role.members.map((member) => ({
      environmentId: role.environmentId || null,
      roleId: role.id,
      userId: member.userId,
      id: member.id,
      createdOn: role.createdOn,
      roleName: role.name,
      expiration: role.expiration,
      description: role.description,
      note: role.note,
      permissions: role.permissions,
      lastEditedOn: role.lastEditedOn,
      memberCreatedOn: member.createdOn,
    })),
  );

  return ability ? ability.filter('view', 'RoleMapping', roleMappings) : roleMappings;
}

/** Returns a role mapping by user id */
export async function getRoleMappingByUserId(
  userId: string,
  environmentId: string,
  ability?: Ability,
  roleId?: string,
  tx?: Prisma.TransactionClient,
) {
  const dbMutator = tx || db;

  const whereClause: Prisma.RoleWhereInput = {
    environmentId: environmentId,
    members: {
      some: {
        userId: userId,
      },
    },
  };

  if (roleId) {
    whereClause.id = roleId;
  }

  const roles = await dbMutator.role.findMany({
    where: whereClause,
    include: {
      members: {
        where: {
          userId: userId,
        },
      },
    },
  });

  const userRoleMappings = roles.map((role) => ({
    environmentId: role.environmentId,
    roleId: role.id,
    userId: userId,
    id: role.members[0].id,
    createdOn: role.createdOn,
    roleName: role.name,
    expiration: role.expiration,
    description: role.description,
    note: role.note,
    permissions: role.permissions,
    lastEditedOn: role.lastEditedOn,
    memberCreatedOn: role.members[0].createdOn,
  }));

  return ability ? ability.filter('view', 'RoleMapping', userRoleMappings) : userRoleMappings;
}

// TODO: also check if user exists?
/** Adds a user role mapping */
export async function addRoleMappings(
  roleMappingsInput: RoleMappingInput[],
  ability?: Ability,
  _tx?: Prisma.TransactionClient,
): Promise<void> {
  if (ability && !ability.can('admin', 'All')) {
    throw new UnauthorizedError();
  }

  if (!_tx) {
    return db.$transaction(async (tx) => {
      return await addRoleMappings(roleMappingsInput, ability, tx);
    });
  }
  const tx = _tx!;

  const roleMappings = roleMappingsInput.map((roleMappingInput) =>
    RoleMappingInputSchema.parse(roleMappingInput),
  );

  const allowedRoleMappings = ability
    ? ability.filter('create', 'RoleMapping', roleMappings)
    : roleMappings;

  for (const roleMapping of allowedRoleMappings) {
    const { roleId, userId, environmentId } = roleMapping;

    const environment = await getEnvironmentById(environmentId, undefined, undefined, tx);
    if (!environment) throw new Error(`Environment ${environmentId} doesn't exist`);
    if (!environment.isOrganization) {
      throw new UserFacingError('Cannot add role mapping to personal environment');
    }

    const role = await getRoleById(roleId, undefined, tx);
    if (!role) throw new UserFacingError('Role not found');

    if (role.name === '@everyone' || role.name === '@guest') {
      throw new UserFacingError(`Cannot add role mappings to ${role.name} role`);
    }

    const user = await getUserById(userId, undefined, tx);
    if (!user) throw new Error('User not found');
    if (user.isGuest) throw new UserFacingError('Guests cannot have role mappings');

    const existingRoleMapping = await tx.roleMember.findFirst({
      where: { roleId, userId },
    });
    if (existingRoleMapping) throw new UserFacingError('Role mapping already exists');

    const id = v4();
    const createdOn = new Date().toISOString();

    const newRoleMapping = {
      id,
      environmentId,
      roleId,
      userId,
      createdOn,
    };

    await tx.roleMember.create({
      data: {
        id: newRoleMapping.id,
        roleId: newRoleMapping.roleId,
        userId: newRoleMapping.userId,
        createdOn: newRoleMapping.createdOn,
      },
    });
  }
}

// TODO: also check if user exists?
//NOTE this could also work without environmentId, but it's easeier
//
/** Removes a role mapping from a user */
export async function deleteRoleMapping(
  userId: string,
  roleId: string,
  environmentId: string,
  ability?: Ability,
) {
  if (ability && !ability.can('admin', 'All')) {
    throw new UnauthorizedError();
  }

  const [environment, user, roleMapping, role] = await Promise.all([
    getEnvironmentById(environmentId),
    getUserById(userId),
    getRoleMappingByUserId(userId, environmentId, ability, roleId),
    getRoleById(roleId),
  ]);
  if (!environment) throw new Error("Environment doesn't exist");

  if (!user) throw new Error("User doesn't exist");

  if (!roleMapping[0]) throw new Error("Role mapping doesn't exist");

  // Check ability
  if (
    ability &&
    !ability.can('delete', toCaslResource('RoleMapping', roleMapping), { environmentId })
  ) {
    throw new UnauthorizedError();
  }

  if (role!.name === '@admin') {
    const memberIds = await db.roleMember.findMany({
      where: { roleId },
      select: { userId: true },
    });

    if (memberIds.length === 1) {
      throw new UserFacingError(
        'Cannot remove user from @admin role, at least one user must be in the role.',
      );
    }
  }

  await db.roleMember.delete({
    where: { id: roleMapping[0].id },
  });
}
