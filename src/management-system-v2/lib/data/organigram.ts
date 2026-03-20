'use server';

import { getCurrentEnvironment } from '@/components/auth';
import { userError, UserErrorType } from '../user-error';
import { getUserOrganigram } from './db/iam/organigram';
import db from '@/lib/data/db';

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

// Returns members with their userId for the direct manager dropdown
export async function getSpaceMembers(environmentId: string) {
  try {
    const { ability } = await getCurrentEnvironment(environmentId);
    if (!ability.can('admin', 'All'))
      return userError('Permission denied', UserErrorType.PermissionError);

    return await db.membership.findMany({
      where: { environmentId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  } catch (_) {
    return userError('Error fetching members');
  }
}
