import { NextRequest, NextResponse } from 'next/server';
import { deleteInactiveGuestUsers } from '@/lib/data/db/iam/users';

// TODO: get this time from the database
const GUESET_INACTIVE_TIME = 4; // 30 days

export async function POST(request: NextRequest) {
  try {
    // Extract and validate the Bearer token
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Missing Bearer token' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '').trim();
    // TODO: use different token
    if (token !== process.env.SWEEPER_TRIGGER_TOKEN) {
      return NextResponse.json({ error: 'Unauthorized: Invalid Bearer token' }, { status: 403 });
    }

    const { count } = await deleteInactiveGuestUsers(GUESET_INACTIVE_TIME);

    return NextResponse.json(
      {
        message: `${count} guest users deleted`,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Error deleting inactive guest users:', error);
    return NextResponse.json({ error: 'Failed to delete inactive guest users' }, { status: 500 });
  }
}
