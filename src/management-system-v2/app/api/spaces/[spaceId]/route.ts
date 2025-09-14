import db from '@/lib/data/db';
import { env } from '@/lib/ms-config/env-vars';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params: { spaceId } }: { params: { spaceId: string } },
) {
  if (!env.PROCEED_PUBLIC_IAM_ACTIVE) {
    return NextResponse.json({
      id: 'proceed-default-no-iam-user',
      type: 'personal',
      name: 'Default User',
    });
  }

  // Show meta data about a space.
  const space = await db.space.findUniqueOrThrow({
    where: {
      id: spaceId,
    },
    select: {
      id: true,
      isOrganization: true,
      name: true,
    },
  });

  return NextResponse.json({
    id: space.id,
    type: space.isOrganization ? 'organizational' : 'personal',
    name: space.name,
  });
}
