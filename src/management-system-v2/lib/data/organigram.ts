'use server';

import { getCurrentEnvironment } from '@/components/auth';
import { userError, UserErrorType } from '../user-error';
import { getUserOrganigram } from './db/iam/organigram';

export async function getOrganigram(environmentId: string, userId: string) {
  try {
    const { ability } = await getCurrentEnvironment(environmentId);
    if (!ability.can('view', 'User'))
      return userError('Permission denied', UserErrorType.PermissionError);

    return await getUserOrganigram(userId, environmentId);
  } catch (_) {
    return userError('Error fetching organigram data');
  }
}
