'use server';

import { getCurrentEnvironment, getCurrentUser } from '@/components/auth';
import {
  UserOrganizationEnvironmentInput,
  UserOrganizationEnvironmentInputSchema,
} from './environment-schema';
import { UserErrorType, userError } from '../user-error';
import {
  addEnvironment,
  deleteEnvironment,
  getEnvironmentById,
  updateOrganization as _updateOrganization,
} from './legacy/iam/environments';
import { UnauthorizedError } from '../ability/abilityHelper';

export async function addOrganizationEnvironment(
  environmentInput: UserOrganizationEnvironmentInput,
) {
  const { userId } = await getCurrentUser();

  try {
    const environmentData = UserOrganizationEnvironmentInputSchema.parse(environmentInput);

    return await addEnvironment({
      ownerId: userId,
      isActive: true,
      isOrganization: true,
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

      const environment = await getEnvironmentById(environmentId);

      if (!environment?.isOrganization)
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

export async function updateOrganization(
  environmentId: string,
  data: Partial<UserOrganizationEnvironmentInput>,
) {
  try {
    const { ability } = await getCurrentEnvironment(environmentId);

    return _updateOrganization(environmentId, data, ability);
  } catch (e) {
    if (e instanceof UnauthorizedError)
      return userError("You're not allowed to update this organization");

    return userError('Error updating organization');
  }
}
