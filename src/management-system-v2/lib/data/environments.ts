'use server';

import { getCurrentEnvironment } from '@/components/auth';
import {
  UserOrganizationEnvironmentInput,
  UserOrganizationEnvironmentInputSchema,
} from './environment-schema';
import { userError } from '../user-error';
import { addEnvironment } from './legacy/iam/environments';

export async function addOrganizationEnvironment(
  environmentInput: UserOrganizationEnvironmentInput,
) {
  const { session } = await getCurrentEnvironment();
  const userId = session?.user.id || '';

  try {
    const environmentData = UserOrganizationEnvironmentInputSchema.parse(environmentInput);

    return addEnvironment({
      ownerId: userId,
      organization: true,
      ...environmentData,
    });
  } catch (e) {
    console.error(e);
    return userError('Error adding environment');
  }
}
