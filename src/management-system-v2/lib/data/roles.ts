'use server';

import { getCurrentEnvironment } from '@/components/auth';
import { deleteRole, addRole as _addRole, updateRole as _updateRole } from './legacy/iam/roles';
import { redirect } from 'next/navigation';
import { userError } from '../user-error';

import { RedirectType } from 'next/dist/client/components/redirect';

export async function deleteRoles(roleIds: string[]) {
  const { ability } = await getCurrentEnvironment();

  try {
    for (const roleId of roleIds) {
      deleteRole(roleId, ability);
    }
  } catch (_) {
    return userError('Error deleting roles');
  }
}

export async function addRole(role: Parameters<typeof _addRole>[0]) {
  let newRoleId;
  try {
    const { ability } = await getCurrentEnvironment();

    const newRole = _addRole(role, ability);
    newRoleId = newRole.id;
  } catch (e) {
    return userError('Error adding role');
  }
  redirect(`/iam/roles/${newRoleId}`, RedirectType.push);
}

export async function updateRole(roleId: string, updatedRole: Parameters<typeof _updateRole>[1]) {
  try {
    const { ability } = await getCurrentEnvironment();
    _updateRole(roleId, updatedRole, ability);
  } catch (e) {
    return userError('Error updating role');
  }
}
