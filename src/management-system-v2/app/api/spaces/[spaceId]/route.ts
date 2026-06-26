import db from '@/lib/data/db';
import { getMSConfig } from '@/lib/ms-config/ms-config';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, props: { params: Promise<{ spaceId: string }> }) {
  const params = await props.params;

  const { spaceId } = params;

  const config = await getMSConfig();
  if (!config.PROCEED_PUBLIC_IAM_ACTIVE) {
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
