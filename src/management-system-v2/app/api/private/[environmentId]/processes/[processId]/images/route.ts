import { getCurrentEnvironment } from '@/components/auth';
import { toCaslResource } from '@/lib/ability/caslAbility';
import {
  getProcessImageFileNames,
  getProcessMetaObjects,
  saveProcessImage,
} from '@/lib/data/legacy/_process';
import { NextRequest, NextResponse } from 'next/server';
import { v4 } from 'uuid';
import { invalidRequest, readImage } from '../../../image-helpers';

export async function GET(
  request: NextRequest,
  {
    params: { environmentId, processId },
  }: { params: { environmentId: string; processId: string } },
) {
  const { ability } = await getCurrentEnvironment(environmentId);

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
      statusText: 'Not allowed to view image filenames in this process',
    });
  }

  const fileNames = await getProcessImageFileNames(processId);

  return NextResponse.json(fileNames);
}

export async function POST(
  request: NextRequest,
  {
    params: { environmentId, processId },
  }: { params: { environmentId: string; processId: string } },
) {
  const isInvalidRequest = invalidRequest(request);
  if (isInvalidRequest) return invalidRequest;

  const { ability } = await getCurrentEnvironment(environmentId);

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

  const readImageResult = await readImage(request);
  if (readImageResult.error) return readImageResult.error;

  const imageFileName = `_image${v4()}.${readImageResult.fileType.ext}`;

  await saveProcessImage(processId, imageFileName, readImageResult.buffer);

  return new NextResponse(imageFileName, { status: 201, statusText: 'Created' });
}
