'use server';

import { getCurrentEnvironment } from '@/components/auth';
import {
  deleteRoleMapping as _deleteRoleMapping,
  addRoleMappings as _addRoleMappings,
  RoleMappingInput,
} from '@/lib/data/db/iam/role-mappings';

export async function addRoleMappings(
  environmentId: string,
  roleMappings: Omit<RoleMappingInput, 'environmentId'>[],
) {
  const { ability, activeEnvironment } = await getCurrentEnvironment(environmentId);

  await _addRoleMappings(
    roleMappings.map((roleMapping) => ({
      ...roleMapping,
      environmentId: activeEnvironment.spaceId,
    })),
    ability,
  );
}

export async function deleteRoleMappings(
  environmentId: string,
  roleMappings: { userId: string; roleId: string }[],
) {
  const errors: { roleId: string; error: Error }[] = [];

  const { ability, activeEnvironment } = await getCurrentEnvironment(environmentId);

  for (const { userId, roleId } of roleMappings) {
    try {
      await _deleteRoleMapping(userId, roleId, activeEnvironment.spaceId, ability);
    } catch (error) {
      errors.push({ roleId, error: error as Error });
    }
  }

  return errors;
}
