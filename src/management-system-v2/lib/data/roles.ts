'use server';

import { getCurrentEnvironment } from '@/components/auth';
import { redirect } from 'next/navigation';
import { UserErrorType, userError } from '../user-error';
import { RedirectType } from 'next/dist/client/components/redirect';
import Ability, { UnauthorizedError } from '../ability/abilityHelper';
import { enableUseDB } from 'FeatureFlags';
import { TRolesModule } from './module-import-types-temp';

let deleteRole: TRolesModule['deleteRole'];
let _addRole: TRolesModule['addRole'];
let _updateRole: TRolesModule['updateRole'];
let _getRoles: TRolesModule['getRoles'];

const loadModules = async () => {
  const moduleImport = await (enableUseDB
    ? import('./db/iam/roles')
    : import('./legacy/iam/roles'));

  ({ deleteRole, addRole: _addRole, updateRole: _updateRole } = moduleImport);
};

loadModules().catch(console.error);

export async function deleteRoles(envitonmentId: string, roleIds: string[]) {
  await loadModules();

  const { ability } = await getCurrentEnvironment(envitonmentId);

  try {
    for (const roleId of roleIds) {
      deleteRole(roleId, ability);
    }
  } catch (e) {
    if (e instanceof UnauthorizedError)
      return userError('Permission denied', UserErrorType.PermissionError);
    else return userError('Error deleting roles');
  }
}

export async function addRole(environmentId: string, role: Parameters<typeof _addRole>[0]) {
  await loadModules();

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
  await loadModules();
  try {
    const { ability, activeEnvironment } = await getCurrentEnvironment(environmentId);
    _updateRole(roleId, { ...updatedRole, environmentId: activeEnvironment.spaceId }, ability);
  } catch (e) {
    if (e instanceof UnauthorizedError)
      return userError('Permission denied', UserErrorType.PermissionError);
    else return userError('Error updating role');
  }
}

export async function getRoles(environmentId: string) {
  await loadModules();

  try {
    const { ability } = await getCurrentEnvironment(environmentId);

    return await _getRoles(environmentId, ability);
  } catch (_) {
    return userError("Something wen't wrong");
  }
}
