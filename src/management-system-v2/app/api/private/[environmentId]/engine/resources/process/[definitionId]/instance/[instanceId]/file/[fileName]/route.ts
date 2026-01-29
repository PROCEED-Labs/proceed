import { UnauthorizedError } from '@/lib/ability/abilityHelper';
import { auth } from '@/lib/auth';
import { getFile } from '@/lib/engines/server-actions';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  context: {
    params: Promise<{
      environmentId: string;
      definitionId: string;
      instanceId: string;
      fileName: string;
    }>;
  },
) {
  const { environmentId, definitionId, instanceId, fileName } = await context.params;
  const session = await auth();
  if (!session) throw new UnauthorizedError();

  const blob = await getFile(environmentId, definitionId, instanceId, fileName);

  if (!(blob instanceof Blob)) {
    return new NextResponse(null, {
      status: 400,
      statusText: 'Unable to get the requested file!',
    });
  }

  const headers = new Headers();
  headers.set('Content-Type', blob.type);

  return new NextResponse(blob, { status: 200, statusText: 'OK', headers });
}
