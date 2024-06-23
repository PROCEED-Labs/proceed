import { v4 } from 'uuid';
import store from '../store.js';
import { getRoleById, roleMetaObjects } from './roles';
import Ability, { UnauthorizedError } from '@/lib/ability/abilityHelper';
import { toCaslResource } from '@/lib/ability/caslAbility';
import { z } from 'zod';
import { getUserById, usersMetaObject } from './users';
import { environmentsMetaObject, getEnvironmentById } from './environments';
import { enableUseDB } from 'FeatureFlags';
import db from '@/lib/data';

const RoleMappingInputSchema = z.object({
  roleId: z.string(),
  userId: z.string(),
  environmentId: z.string(),
  expiration: z.string().optional(),
});

export type RoleMappingInput = z.infer<typeof RoleMappingInputSchema>;

export type RoleMapping = RoleMappingInput & { id: string; createdOn: string; roleName: string };

// @ts-ignore
let firstInit = !global.roleMappingsMetaObjects;

export let roleMappingsMetaObjects: {
  [EnvironmentId: string]: {
    users: {
      [UserId: string]: RoleMapping[];
    };
  };
} =
  //@ts-ignore
  global.roleMappingsMetaObjects || (global.roleMappingsMetaObjects = {});

/**
 * initializes the role mappings meta information objects
 */
export function init() {
  if (!firstInit) return;

  // get role mappings that were persistently stored
  const storedRoleMappings = store.get('roleMappings');

  // set role mappings store
  store.set('roleMappings', storedRoleMappings);

  roleMappingsMetaObjects = storedRoleMappings;
  //@ts-ignore
  global.roleMappingsMetaObjects = roleMappingsMetaObjects;
}
init();

/** Returns all role mappings in form of an array */
export async function getRoleMappings(ability?: Ability, environmentId?: string) {
  if (enableUseDB) {
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
  if (environmentId) {
    if (!(environmentId in roleMappingsMetaObjects)) return [];
    const roleMappings = Object.values(roleMappingsMetaObjects[environmentId].users).flat();
    return ability ? ability.filter('view', 'RoleMapping', roleMappings) : roleMappings;
  }

  const roleMappings: RoleMapping[] = [];

  for (const environment of Object.values(roleMappingsMetaObjects))
    roleMappings.push(...Object.values(environment.users).flat());

  return ability ? ability.filter('view', 'RoleMapping', roleMappings) : roleMappings;
}

/** Returns a role mapping by user id */
export function getRoleMappingByUserId(
  userId: string,
  environmentId: string,
  ability?: Ability,
  roleId?: string,
) {
  if (enableUseDB) {
    const whereClause: any = {
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

  const environmentMappings = roleMappingsMetaObjects[environmentId];
  if (!environmentMappings) return [];

  const userRoleMappings = environmentMappings.users[userId] || [];

  if (!ability) return userRoleMappings;
  return ability.filter('view', 'RoleMapping', userRoleMappings);
}

// TODO: also check if user exists?
/** Adds a user role mapping */
export async function addRoleMappings(roleMappingsInput: RoleMappingInput[], ability?: Ability) {
  if (enableUseDB) {
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
  } else {
    const roleMappings = roleMappingsInput.map((roleMappingInput) =>
      RoleMappingInputSchema.parse(roleMappingInput),
    );

    const allowedRoleMappings = ability
      ? ability.filter('create', 'RoleMapping', roleMappings)
      : roleMappings;

    allowedRoleMappings.forEach((roleMapping) => {
      const { roleId, userId, environmentId } = roleMapping;

      const environment = environmentsMetaObject[environmentId];
      if (!environment) throw new Error(`Environment ${environmentId} doesn't exist`);

      if (!environment.isOrganization)
        throw new Error('Cannot add role mapping to personal environment');

      let role = roleMetaObjects[roleId];
      if (!role.hasOwnProperty('id')) {
        role = store.getById('roles', roleId);
        if (!role.hasOwnProperty('id')) throw new Error('Role not found');
      }

      let environmentMappings = roleMappingsMetaObjects[environmentId];
      if (!environmentMappings) {
        environmentMappings = { users: {} };
        roleMappingsMetaObjects[environmentId] = environmentMappings;
      }

      let userMappings = environmentMappings.users[userId];
      if (!userMappings) {
        environmentMappings.users[userId] = [];
        userMappings = environmentMappings.users[userId];
      }

      if (userMappings && userMappings.some((mapping) => mapping.roleId === roleId)) {
        throw new Error('Role mapping already exists');
      }

      const user = usersMetaObject[userId];
      if (!user) throw new Error('User not found');
      if (user.isGuest) throw new Error('Guests cannot have role mappings');

      const id = v4();
      const createdOn = new Date().toUTCString();

      const newRoleMapping: RoleMapping = {
        id,
        ...roleMapping,
        roleName: role.name,
        createdOn,
      };

      userMappings.push(newRoleMapping);
      role.members.push({
        userId: userId,
        username: user.username ?? '',
        firstName: user.firstName ?? '',
        lastName: user.lastName ?? '',
        email: user.email,
      });

      // persist new role mapping in file system
      store.setDictElement('roleMappings', roleMappingsMetaObjects);

      store.update('roles', roleId, roleMetaObjects[roleId]);
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
  if (enableUseDB) {
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
  } else {
    const environmentMappings = roleMappingsMetaObjects[environmentId];
    if (!environmentMappings) throw new Error("Role mapping doesn't exist");

    const userMappings = environmentMappings.users[userId];
    if (!userMappings) throw new Error("Role mapping doesn't exist");

    const roleMappingIndex = userMappings.findIndex((mapping) => mapping.roleId === roleId);
    if (roleMappingIndex == -1) throw new Error("Role mapping doesn't exist");

    const roleMapping = userMappings[roleMappingIndex];

    if (ability && !ability.can('delete', toCaslResource('RoleMapping', roleMapping)))
      throw new UnauthorizedError();

    userMappings.splice(roleMappingIndex, 1);

    if (userMappings.length === 0) delete environmentMappings.users[userId];

    // persist new role mapping in file system
    store.setDictElement('roleMappings', roleMappingsMetaObjects);

    if (roleMetaObjects[roleId]) {
      const index = roleMetaObjects[roleId].members.findIndex((member) => member.userId === userId);
      if (index > -1) {
        roleMetaObjects[roleId].members.splice(index, 1);
      }
    }

    store.update('roles', roleId, roleMetaObjects[roleId]);
  }
}
