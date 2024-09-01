'use server';

import { getCurrentEnvironment } from '@/components/auth';
import { redirect } from 'next/navigation';
import { UserErrorType, userError } from '../user-error';
import { RedirectType } from 'next/dist/client/components/redirect';
import Ability, { UnauthorizedError } from '../ability/abilityHelper';
import { enableUseDB } from 'FeatureFlags';

let deleteRole:
  | typeof import('./db/iam/roles').deleteRole
  | typeof import('./legacy/iam/roles').deleteRole;
let _addRole: typeof import('./db/iam/roles').addRole | typeof import('./legacy/iam/roles').addRole;
let _updateRole:
  | typeof import('./db/iam/roles').updateRole
  | typeof import('./legacy/iam/roles').updateRole;

const loadModules = async () => {
  const moduleImport = await (enableUseDB
    ? import('./db/iam/roles')
    : import('./legacy/iam/roles'));

  ({ deleteRole, addRole: _addRole, updateRole: _updateRole } = moduleImport);
};

loadModules().catch(console.error);

export async function deleteRoles(envitonmentId: string, roleIds: string[]) {
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
    _updateRole(roleId, { ...updatedRole, environmentId: activeEnvironment.spaceId }, ability);
  } catch (e) {
    if (e instanceof UnauthorizedError)
      return userError('Permission denied', UserErrorType.PermissionError);
    else return userError('Error updating role');
  }
}
