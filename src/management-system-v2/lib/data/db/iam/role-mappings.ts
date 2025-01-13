import { v4 } from 'uuid';
import { getRoleById } from './roles';
import Ability, { UnauthorizedError } from '@/lib/ability/abilityHelper';
import { toCaslResource } from '@/lib/ability/caslAbility';
import { z } from 'zod';
import { getUserById } from './users';
import { getEnvironmentById } from './environments';
import db from '@/lib/data/db';
import { Prisma } from '@prisma/client';

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
) {
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

  const roles = await db.role.findMany({
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
export async function addRoleMappings(roleMappingsInput: RoleMappingInput[], ability?: Ability) {
  const roleMappings = roleMappingsInput.map((roleMappingInput) =>
    RoleMappingInputSchema.parse(roleMappingInput),
  );

  const allowedRoleMappings = ability
    ? ability.filter('create', 'RoleMapping', roleMappings)
    : roleMappings;

  for (const roleMapping of allowedRoleMappings) {
    const { roleId, userId, environmentId } = roleMapping;

    const environment = await getEnvironmentById(environmentId);
    if (!environment) throw new Error(`Environment ${environmentId} doesn't exist`);
    if (!environment.isOrganization)
      throw new Error('Cannot add role mapping to personal environment');

    const role = await getRoleById(roleId);
    if (!role) throw new Error('Role not found');

    const user = await getUserById(userId);
    if (!user) throw new Error('User not found');
    if (user.isGuest) throw new Error('Guests cannot have role mappings');

    const existingRoleMapping = await db.roleMember.findFirst({
      where: { roleId, userId },
    });
    if (existingRoleMapping) throw new Error('Role mapping already exists');

    const id = v4();
    const createdOn = new Date().toISOString();

    const newRoleMapping = {
      id,
      environmentId,
      roleId,
      userId,
      expiration: roleMapping.expiration,
      createdOn,
      roleName: role.name,
    };

    await db.roleMember.create({
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
  const environment = await getEnvironmentById(environmentId);
  if (!environment) throw new Error("Environment doesn't exist");

  const user = getUserById(userId);
  if (!user) throw new Error("User doesn't exist");

  const roleMapping = (await getRoleMappingByUserId(userId, environmentId, ability, roleId))[0];
  if (!roleMapping) throw new Error("Role mapping doesn't exist");

  // Check ability
  if (ability && !ability.can('delete', toCaslResource('RoleMapping', roleMapping))) {
    throw new UnauthorizedError();
  }

  await db.roleMember.delete({
    where: { id: roleMapping.id },
  });
}
