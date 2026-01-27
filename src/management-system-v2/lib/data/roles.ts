'use server';

import { getCurrentEnvironment } from '@/components/auth';
import { redirect } from 'next/navigation';
import { UserErrorType, getErrorMessage, userError } from '../server-error-handling/user-error';
import { RedirectType } from 'next/dist/client/components/redirect';
import {
  deleteRole,
  addRole as _addRole,
  updateRole as _updateRole,
  getRoles as _getRoles,
} from '@/lib/data/db/iam/roles';
import { UnauthorizedError } from '../ability/abilityHelper';

export async function deleteRoles(envitonmentId: string, roleIds: string[]) {
  const currentEnvironment = await getCurrentEnvironment(envitonmentId);
  if (currentEnvironment.isErr()) {
    return userError(getErrorMessage(currentEnvironment.error));
  }
  const { ability } = currentEnvironment.value;

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
  const currentEnvironment = await getCurrentEnvironment(environmentId);
  if (currentEnvironment.isErr()) {
    return userError(getErrorMessage(currentEnvironment.error));
  }
  const { activeEnvironment, ability } = currentEnvironment.value;

  let newRoleId;
  try {
    const newRole = await _addRole({ ...role, environmentId: activeEnvironment.spaceId }, ability);
    if (newRole.isErr()) {
      return userError(getErrorMessage(newRole.error));
    }

    newRoleId = newRole.value.id;
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
    const currentEnvironment = await getCurrentEnvironment(environmentId);
    if (currentEnvironment.isErr()) {
      return userError(getErrorMessage(currentEnvironment.error));
    }
    const { ability, activeEnvironment } = currentEnvironment.value;

    const result = await _updateRole(
      roleId,
      { ...updatedRole, environmentId: activeEnvironment.spaceId },
      ability,
    );
    if (result.isErr()) return userError(getErrorMessage(result.error));
  } catch (e) {
    if (e instanceof UnauthorizedError)
      return userError('Permission denied', UserErrorType.PermissionError);
    else return userError('Error updating role');
  }
}

export async function getRoles(environmentId: string) {
  try {
    const currentEnvironment = await getCurrentEnvironment(environmentId);
    if (currentEnvironment.isErr()) {
      return userError(getErrorMessage(currentEnvironment.error));
    }
    const { ability } = currentEnvironment.value;

    const result = await _getRoles(environmentId, ability);
    if (result.isErr()) {
      return userError(getErrorMessage(result.error));
    }

    return result.value;
  } catch (_) {
    return userError('Something went wrong');
  }
}
