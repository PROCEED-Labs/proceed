import db from '@/lib/data/db';
import { getEnvironmentById } from '@/lib/data/db/iam/environments';
import { isMember } from '@/lib/data/db/iam/memberships';
import { env } from '@/lib/ms-config/env-vars';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, props: { params: Promise<{ spaceId: string }> }) {
  const params = await props.params;
  const searchParams = request.nextUrl.searchParams;

  const userId = searchParams.get('user-id');

  if (!userId) {
    return new NextResponse(null, {
      status: 400,
      statusText: 'Expected "user-id" in query params.',
    });
  }

  const { spaceId } = params;

  const memberExists = await isMember(spaceId, userId);

  if (!memberExists) {
    return new NextResponse(null, {
      status: 404,
      statusText: 'Not found',
    });
  }

  return new NextResponse(null, {
    status: 200,
  });
}
