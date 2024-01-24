'use server';

import { getCurrentEnvironment } from '@/components/auth';
import {
  deleteRoleMapping as _deleteRoleMapping,
  addRoleMappings as _addRoleMappings,
} from './legacy/iam/role-mappings';

export async function addRoleMappings(roleMappings: Parameters<typeof _addRoleMappings>[0]) {
  const { ability } = await getCurrentEnvironment();

  _addRoleMappings(roleMappings, ability);
}

export async function deleteRoleMappings(roleMappings: { userId: string; roleId: string }[]) {
  const errors: { roleId: string; error: Error }[] = [];

  const { ability } = await getCurrentEnvironment();
  for (const { userId, roleId } of roleMappings) {
    try {
      _deleteRoleMapping(userId, roleId, ability);
    } catch (error) {
      errors.push({ roleId, error: error as Error });
    }
  }

  return errors;
}
