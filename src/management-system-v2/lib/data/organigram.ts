'use server';

import { getCurrentEnvironment } from '@/components/auth';
import { userError, UserErrorType } from '../user-error';
import { getUserOrganigram } from './db/iam/organigram';
import { getUsersInSpace } from './db/iam/memberships';

export async function getOrganigram(environmentId: string, userId: string) {
  try {
    const { ability } = await getCurrentEnvironment(environmentId);
    if (!ability.can('admin', 'All'))
      return userError('Permission denied', UserErrorType.PermissionError);

    return await getUserOrganigram(userId, environmentId);
  } catch (_) {
    return userError('Error fetching organigram data');
  }
}

export async function getSpaceUsers(environmentId: string) {
  try {
    const { ability } = await getCurrentEnvironment(environmentId);
    if (!ability.can('admin', 'All'))
      return userError('Permission denied', UserErrorType.PermissionError);

    return await getUsersInSpace(environmentId, ability);
  } catch (_) {
    return userError('Error fetching users');
  }
}
