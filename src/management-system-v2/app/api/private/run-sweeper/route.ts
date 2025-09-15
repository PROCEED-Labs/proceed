import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/data/db';
import { removeDeletedArtifactsFromDb } from '@/lib/data/file-manager-facade';
import { deleteInactiveGuestUsers } from '@/lib/data/db/iam/users';
import { removeExpiredEmailVerificationTokens } from '@/lib/data/db/iam/verification-tokens';
import { removeInactiveSpaces } from '@/lib/data/db/iam/environments';
import { getMSConfig } from '@/lib/ms-config/ms-config';

const MS_IN_DAY = 1000 * 60 * 60 * 24;

export async function POST(request: NextRequest) {
  try {
    const msConfig = await getMSConfig();

    // Extract and validate the Bearer token
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Missing Bearer token' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '').trim();
    if (token !== msConfig.SCHEDULER_TOKEN) {
      return NextResponse.json({ error: 'Unauthorized: Invalid Bearer token' }, { status: 403 });
    }

    let message = '';
    await db.$transaction(async (tx) => {
      const removedArtifacts = await removeDeletedArtifactsFromDb(
        msConfig.SCHEDULER_JOB_DELETE_OLD_ARTIFACTS * MS_IN_DAY,
        tx,
      );
      message += `Removed ${removedArtifacts.count} artifacts.\n`;

      const removedInactiveGuests = await deleteInactiveGuestUsers(
        msConfig.SCHEDULER_JOB_DELETE_INACTIVE_GUESTS * MS_IN_DAY,
        tx,
      );
      message += `Removed ${removedInactiveGuests.count} inactive guests.\n`;

      const inactiveSpaces = await removeInactiveSpaces(
        msConfig.SCHEDULER_JOB_DELETE_INACTIVE_SPACES * MS_IN_DAY,
        tx,
      );
      message += `Removed ${inactiveSpaces.count} inactive spaces.\n`;

      const removedVerificationTokens = await removeExpiredEmailVerificationTokens(tx);
      message += `Removed ${removedVerificationTokens.count} expired verification tokens.`;
    });
    return NextResponse.json({ message }, { status: 200 });
  } catch (error) {
    console.error('Error cleaning up DB:', error);
    return NextResponse.json({ error: 'Failed to clean up DB' }, { status: 500 });
  }
}
