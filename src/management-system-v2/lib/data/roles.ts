'use server';

import { getCurrentUser } from '@/components/auth';
import { deleteRole, addRole as _addRole, updateRole as _updateRole } from './legacy/iam/roles.js';
import { redirect } from 'next/navigation.js';

export async function deleteRoles(roleIds: string[]) {
  const { ability } = await getCurrentUser();

  const errors: { roleId: string; error: Error }[] = [];

  for (const roleId of roleIds) {
    try {
      deleteRole(roleId, ability);
    } catch (error) {
      errors.push({ roleId, error: error as Error });
    }
  }

  return errors;
}

export async function addRole(role: Parameters<typeof _addRole>[0]) {
  const { ability } = await getCurrentUser();

  const newRole = _addRole(role, ability);
  redirect(`/iam/roles/${newRole.id}`);
}

export async function updateRole(roleId: string, updatedRole: Parameters<typeof _updateRole>[1]) {
  const { ability } = await getCurrentUser();

  _updateRole(roleId, updatedRole, ability);
}
