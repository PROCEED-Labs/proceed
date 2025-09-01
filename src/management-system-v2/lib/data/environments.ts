'use server';

import { getCurrentEnvironment, getCurrentUser } from '@/components/auth';
import {
  UserOrganizationEnvironmentInput,
  UserOrganizationEnvironmentInputSchema,
} from './environment-schema';
import { UserErrorType, getErrorMessage, userError } from '../user-error';
import { UnauthorizedError } from '../ability/abilityHelper';
import {
  addEnvironment,
  deleteEnvironment,
  getEnvironmentById,
  updateOrganization as _updateOrganization,
} from '@/lib/data/db/iam/environments';
import { env } from '../ms-config/env-vars';
import { isMember, removeMember } from './db/iam/memberships';
import { UserHasToDeleteOrganizationsError } from './db/iam/users';

export async function addOrganizationEnvironment(
  environmentInput: UserOrganizationEnvironmentInput,
) {
  if (env.PROCEED_PUBLIC_IAM_ONLY_ONE_ORGANIZATIONAL_SPACE)
    return userError(
      'Not allowed under the current configuration of the MS',
      UserErrorType.PermissionError,
    );

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
  // NOTE: maybe this should be removed
  if (env.PROCEED_PUBLIC_IAM_ONLY_ONE_ORGANIZATIONAL_SPACE)
    return userError(
      'Not allowed under the current configuration of the MS',
      UserErrorType.PermissionError,
    );

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

export async function leaveOrganization(spaceId: string) {
  try {
    const { user } = await getCurrentUser();

    if (!user || user.isGuest) {
      return userError('You need to be signed in');
    }

    if (user.id === spaceId) {
      return userError('You cannot leave your personal spcae');
    }

    if (!(await isMember(spaceId, user.id))) {
      // I don't think we should return a specific error, as it allows to check environment ID's
      throw new Error();
    }

    await removeMember(spaceId, user.id);
  } catch (e) {
    console.error(e);
    let message;
    if (e instanceof UserHasToDeleteOrganizationsError) {
      message =
        "You're the only admin of this organization, you have to either add a new admin or delete it.";
    } else {
      message = getErrorMessage(e);
    }
    return userError(message);
  }
}
