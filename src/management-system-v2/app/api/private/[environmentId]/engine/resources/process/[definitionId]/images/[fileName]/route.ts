import { UnauthorizedError } from '@/lib/ability/abilityHelper';
import { auth } from '@/lib/auth';
import { getProcessImage } from '@/lib/engines/server-actions';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  props: {
    params: Promise<{ environmentId: string; definitionId: string; fileName: string }>;
  }
) {
  const params = await props.params;

  const {
    environmentId,
    definitionId,
    fileName
  } = params;

  const session = await auth();
  if (!session) throw new UnauthorizedError();

  const blob = await getProcessImage(environmentId, definitionId, fileName);

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
