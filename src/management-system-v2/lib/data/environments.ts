'use server';

import { getCurrentEnvironment, getCurrentUser } from '@/components/auth';
import {
  UserOrganizationEnvironmentInput,
  UserOrganizationEnvironmentInputSchema,
} from './environment-schema';
import { UserErrorType, userError } from '../user-error';
import { addEnvironment, deleteEnvironment, getEnvironmentById } from './legacy/iam/environments';
import { UnauthorizedError } from '../ability/abilityHelper';

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
  try {
    for (const environmentId of environmentIds) {
      const { ability } = await getCurrentEnvironment(environmentId);

      const environment = getEnvironmentById(environmentId);

      if (!environment.organization)
        return userError(`Environment ${environmentId} is not an organization environment`);

      deleteEnvironment(environmentId, ability);
    }
  } catch (e) {
    if (e instanceof UnauthorizedError)
      return userError(
        "You're not allowed to delete this organization",
        UserErrorType.PermissionError,
      );

    console.error(e);
    return userError('Error deleting environment');
  }
}
