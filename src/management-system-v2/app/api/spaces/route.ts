import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/data/db';
import { getMSConfig } from '@/lib/ms-config/ms-config';

export async function GET(request: NextRequest) {
  const config = await getMSConfig();
  if (!config.PROCEED_PUBLIC_IAM_ACTIVE) {
    return NextResponse.json([
      { id: 'proceed-default-no-iam-user', type: 'personal', name: 'Default User' },
    ]);
  }

  // List of all existing Spaces.
  const spaces = (
    await db.space.findMany({
      select: {
        id: true,
        isOrganization: true,
        name: true,
      },
    })
  ).map((space) => ({
    id: space.id,
    type: space.isOrganization ? 'organizational' : 'personal',
    name: space.name,
  }));

  return NextResponse.json(spaces);
}
