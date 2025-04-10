'use server';

import { getCurrentEnvironment } from '@/components/auth';
import { redirect } from 'next/navigation';
import { UserErrorType, userError } from '../user-error';
import { RedirectType } from 'next/dist/client/components/redirect';
import {
  deleteRole,
  addRole as _addRole,
  updateRole as _updateRole,
  getRoles as _getRoles,
} from '@/lib/data/db/iam/roles';
import { UnauthorizedError } from '../ability/abilityHelper';

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

export async function addRole(environmentId: string, role: Parameters<typeof _addRole>[0]) {
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

  redirect(`/${environmentId}/iam/roles/${newRoleId}`, RedirectType.push);
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

export async function getRoles(environmentId: string) {
  try {
    const { ability } = await getCurrentEnvironment(environmentId);

    return await _getRoles(environmentId, ability);
  } catch (_) {
    return userError("Something wen't wrong");
  }
}
