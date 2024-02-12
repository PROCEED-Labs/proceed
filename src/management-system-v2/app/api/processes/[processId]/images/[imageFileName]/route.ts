import { getCurrentEnvironment } from '@/components/auth';
import { toCaslResource } from '@/lib/ability/caslAbility';
import { getProcessImage, getProcessMetaObjects } from '@/lib/data/legacy/_process';
import { userError, UserErrorType } from '@/lib/user-error';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  {
    params: { processId, imageFileName },
  }: { params: { processId: string; imageFileName: string } },
) {
  const { ability } = await getCurrentEnvironment();

  const processMetaObjects = getProcessMetaObjects();
  const process = processMetaObjects[processId];

  if (!process) {
    return new NextResponse(null, {
      status: 404,
      statusText: 'Process with this id does not exist.',
    });
  }

  if (!ability.can('view', toCaslResource('Process', process))) {
    return new NextResponse(null, {
      status: 403,
      statusText: 'Not allowed to view image in this process',
    });
  }

  const image = await getProcessImage(processId, imageFileName);

  const imageType = imageFileName.split('.').pop();
  const contentType = `image/${imageType || '*'}`;

  const headers = new Headers();
  headers.set('Content-Type', contentType);

  return new NextResponse(image, { status: 200, statusText: 'OK', headers });
}
