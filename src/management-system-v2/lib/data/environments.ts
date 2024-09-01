'use server';

import { getCurrentEnvironment, getCurrentUser } from '@/components/auth';
import {
  UserOrganizationEnvironmentInput,
  UserOrganizationEnvironmentInputSchema,
} from './environment-schema';
import { UserErrorType, userError } from '../user-error';
import { UnauthorizedError } from '../ability/abilityHelper';
import { enableUseDB } from 'FeatureFlags';

let addEnvironment:
  | typeof import('./db/iam/environments').addEnvironment
  | typeof import('./legacy/iam/environments').addEnvironment;
let deleteEnvironment:
  | typeof import('./db/iam/environments').deleteEnvironment
  | typeof import('./legacy/iam/environments').deleteEnvironment;
let getEnvironmentById:
  | typeof import('./db/iam/environments').getEnvironmentById
  | typeof import('./legacy/iam/environments').getEnvironmentById;
let _updateOrganization:
  | typeof import('./db/iam/environments').updateOrganization
  | typeof import('./legacy/iam/environments').updateOrganization;

const loadModules = async () => {
  const moduleImport = await (enableUseDB
    ? import('./db/iam/environments')
    : import('./legacy/iam/environments'));

  ({
    addEnvironment,
    deleteEnvironment,
    getEnvironmentById,
    updateOrganization: _updateOrganization,
  } = moduleImport);
};

loadModules().catch(console.error);

export async function addOrganizationEnvironment(
  environmentInput: UserOrganizationEnvironmentInput,
) {
  await loadModules();

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
  await loadModules();

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
  await loadModules();

  try {
    const { ability } = await getCurrentEnvironment(environmentId);

    return _updateOrganization(environmentId, data, ability);
  } catch (e) {
    if (e instanceof UnauthorizedError)
      return userError("You're not allowed to update this organization");

    return userError('Error updating organization');
  }
}
