'use server';

import { getCurrentEnvironment } from '@/components/auth';
import {
  deleteRoleMapping as _deleteRoleMapping,
  addRoleMappings as _addRoleMappings,
  RoleMappingInput,
} from '@/lib/data/db/iam/role-mappings';
import { getErrorMessage, userError } from '../server-error-handling/user-error';

export async function addRoleMappings(
  environmentId: string,
  roleMappings: Omit<RoleMappingInput, 'environmentId'>[],
) {
  try {
    const currentEnvironment = await getCurrentEnvironment(environmentId);
    if (currentEnvironment.isErr()) {
      return userError(getErrorMessage(currentEnvironment.error));
    }
    const { ability, activeEnvironment } = currentEnvironment.value;

    await _addRoleMappings(
      roleMappings.map((roleMapping) => ({
        ...roleMapping,
        environmentId: activeEnvironment.spaceId,
      })),
      ability,
    );
  } catch (error) {
    console.error(error);
    return userError(getErrorMessage(error));
  }
}

export async function deleteRoleMappings(
  environmentId: string,
  roleMappings: { userId: string; roleId: string }[],
) {
  const errors: unknown[] = [];

  const currentEnvironment = await getCurrentEnvironment(environmentId);
  if (currentEnvironment.isErr()) {
    return userError(getErrorMessage(currentEnvironment.error));
  }
  const { ability, activeEnvironment } = currentEnvironment.value;

  for (const { userId, roleId } of roleMappings) {
    try {
      await _deleteRoleMapping(userId, roleId, activeEnvironment.spaceId, ability);
    } catch (error) {
      console.error(error);
      errors.push(error);
    }
  }

  if (errors.length === 0) return;

  let message: string = '';

  for (let i = 0; i < errors.length; i++) {
    const error = errors[i];
    const last = i === errors.length - 1;

    message += getErrorMessage(error);
    if (!last) {
      message += '\n';
    }
  }

  console.log('error message', message);
  return userError(message);
}
