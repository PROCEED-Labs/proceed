'use server';

import { getCurrentEnvironment, getCurrentUser } from '@/components/auth';
import {
  UserOrganizationEnvironmentInput,
  UserOrganizationEnvironmentInputSchema,
} from './environment-schema';
import { UserErrorType, userError } from '../user-error';
import { addEnvironment, deleteEnvironment, getEnvironmentById } from './legacy/iam/environments';

export async function addOrganizationEnvironment(
  environmentInput: UserOrganizationEnvironmentInput,
) {
  const { userId } = await getCurrentUser();

  try {
    const environmentData = UserOrganizationEnvironmentInputSchema.parse(environmentInput);

    return addEnvironment({
      ownerId: userId,
      active: true,
      organization: true,
      ...environmentData,
    });
  } catch (e) {
    console.error(e);
    return userError('Error adding environment');
  }
}

export async function deleteOrganizationEnvironments(environmentIds: string[]) {
  const { userId } = await getCurrentUser();

  try {
    for (const environmentId of environmentIds) {
      const { ability } = await getCurrentEnvironment(environmentId);

      const environment = getEnvironmentById(environmentId);

      if (!environment.organization)
        return userError(`Environment ${environmentId} is not an organization environment`);

      if (!environment.active) return userError(`Environment ${environmentId} is not active`);

      //TODO: remove this once the ability is checked in deleteEnvironment
      if (environment.ownerId !== userId)
        return userError(
          `You are not the owner of ${environmentId}`,
          UserErrorType.PermissionError,
        );

      deleteEnvironment(environmentId, ability);
    }
  } catch (e) {
    console.error(e);
    return userError('Error deleting environment');
  }
}
