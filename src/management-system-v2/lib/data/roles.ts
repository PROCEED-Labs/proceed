'use server';

import { getCurrentEnvironment } from '@/components/auth';
import { RedirectType, redirect } from 'next/navigation';
import { UserErrorType, userError } from '../user-error';
import {
  deleteRole,
  addRole as _addRole,
  updateRole as _updateRole,
  getRoles as _getRoles,
  getUserRoles as _getUserRoles,
  getRoleWithMembersById,
} from '@/lib/data/db/iam/roles';
import { UnauthorizedError } from '../ability/abilityHelper';
import { Role } from './role-schema';
import db from '@/lib/data/db';
import { asyncForEach } from '../helpers/javascriptHelpers';
import { addRoleMappings } from './db/iam/role-mappings';

export async function deleteRoles(envitonmentId: string, roleIds: string[]) {
  const { ability } = await getCurrentEnvironment(envitonmentId);

  try {
    for (const roleId of roleIds) {
      await deleteRole(roleId, ability);
    }
  } catch (e) {
    if (e instanceof UnauthorizedError)
      return userError('Permission denied', UserErrorType.PermissionError);
    else return userError('Error deleting roles');
  }
}

export async function addRole(
  environmentId: string,
  role: Parameters<typeof _addRole>[0],
  withoutRedirect = false,
) {
  const { activeEnvironment } = await getCurrentEnvironment(environmentId);

  let newRoleId;
  try {
    const { ability } = await getCurrentEnvironment(environmentId);

    const newRole = await _addRole({ ...role, environmentId: activeEnvironment.spaceId }, ability);
    newRoleId = newRole.id;
  } catch (e) {
    if (e instanceof UnauthorizedError)
      return userError('Permission denied', UserErrorType.PermissionError);
    else return userError('Error adding role');
  }

  if (!withoutRedirect) redirect(`/${environmentId}/iam/roles/${newRoleId}`, RedirectType.push);
}

export async function updateRole(
  environmentId: string,
  roleId: string,
  updatedRole: Omit<Parameters<typeof _updateRole>[1], 'environmentId'>,
) {
  try {
    const { ability, activeEnvironment } = await getCurrentEnvironment(environmentId);
    await _updateRole(
      roleId,
      { ...updatedRole, environmentId: activeEnvironment.spaceId },
      ability,
    );
  } catch (e) {
    if (e instanceof UnauthorizedError)
      return userError('Permission denied', UserErrorType.PermissionError);
    else return userError('Error updating role');
  }
}

export async function handleFolderRoleChanges(
  environmentId: string,
  parentRoleId: string,
  toAdd: Parameters<typeof _addRole>[0][],
  toUpdate: { roleId: string; permissions: Role['permissions'] }[],
  toRemove: string[],
) {
  try {
    const { ability } = await getCurrentEnvironment(environmentId);
    await db.$transaction(async (trx) => {
      const parentRole = await getRoleWithMembersById(parentRoleId, ability, false, trx);
      if (!parentRole) throw new Error('The role to update does not exist');

      await asyncForEach(toRemove, async (id) => {
        await deleteRole(id, ability, trx);
      });

      await asyncForEach(toUpdate, async ({ roleId, permissions }) => {
        await _updateRole(roleId, { permissions }, ability, trx);
      });

      await asyncForEach(toAdd, async (input) => {
        const added = await _addRole(
          { ...input, expiration: parentRole.expiration },
          ability,
          trx,
          true,
        );

        const roleMappings = parentRole.members.map(({ id }) => ({
          environmentId,
          roleId: added.id,
          userId: id,
        }));

        await addRoleMappings(roleMappings, ability, trx);
      });
    });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return userError('Permissions denied', UserErrorType.PermissionError);
    } else {
      return userError('Error updating role');
    }
  }
}

export async function getRoles(environmentId: string) {
  try {
    const { ability } = await getCurrentEnvironment(environmentId);

    return await _getRoles(environmentId, ability);
  } catch (_) {
    return userError("Something wen't wrong");
  }
}

export async function getUserRoles(environmentId: string, userId: string) {
  try {
    const { ability } = await getCurrentEnvironment(environmentId);

    return _getUserRoles(userId, environmentId, ability);
  } catch (e) {
    if (e instanceof UnauthorizedError)
      return userError('Permission denied', UserErrorType.PermissionError);
    else return userError('Error getting user roles');
  }
}
