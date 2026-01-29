import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/data/db';
import { env } from '@/lib/ms-config/env-vars';

export async function GET(request: NextRequest) {
  if (!env.PROCEED_PUBLIC_IAM_ACTIVE) {
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
