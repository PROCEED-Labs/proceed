import { getCurrentEnvironment } from '@/components/auth';
import { toCaslResource } from '@/lib/ability/caslAbility';
import { getProcessMetaObjects, saveProcessImage } from '@/lib/data/legacy/_process';
import { NextRequest, NextResponse } from 'next/server';
import { v4 } from 'uuid';

export async function POST(
  request: NextRequest,
  { params: { processId } }: { params: { processId: string } },
) {
  const { ability } = await getCurrentEnvironment();

  const processMetaObjects: any = getProcessMetaObjects();
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

  const imageBlob = await request.blob();
  const imageType = imageBlob.type.split('image/').pop();
  const imageFileName = `_image${v4()}.${imageType}`;

  await saveProcessImage(processId, imageFileName, imageBlob);

  return new NextResponse(imageFileName, { status: 201, statusText: 'Created' });
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '2mb',
    },
  },
};
