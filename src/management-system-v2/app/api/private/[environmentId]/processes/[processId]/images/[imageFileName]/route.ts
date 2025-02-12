import { fileTypeFromBuffer } from 'file-type';
import { getCurrentEnvironment } from '@/components/auth';
import { toCaslResource } from '@/lib/ability/caslAbility';
import {
  deleteProcessImage,
  getProcessImage,
  getProcessMetaObjects,
  saveProcessImage,
} from '@/lib/data/legacy/_process';
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

import { TokenPayload } from '@/lib/sharing/process-sharing';
import { invalidRequest, readImage } from '../../../../image-helpers';
import { v4 } from 'uuid';

export async function GET(
  request: NextRequest,
  {
    params: { environmentId, processId, imageFileName },
  }: { params: { environmentId: string; processId: string; imageFileName: string } },
) {
  const processMetaObjects = getProcessMetaObjects();
  const processMeta = processMetaObjects[processId];

  if (!processMeta) {
    return new NextResponse(null, {
      status: 404,
      statusText: 'Process with this id does not exist.',
    });
  }

  let canAccess = false;

  // if the user is not unauthenticated check if they have access to the process due to being an owner
  if (environmentId !== 'unauthenticated') {
    const { ability } = await getCurrentEnvironment(environmentId);

    canAccess = ability.can('view', toCaslResource('Process', processMeta));
  }

  // if the user is not an owner check if they have access if a share token is provided in the query data of the url
  const shareToken = request.nextUrl.searchParams.get('shareToken');
  if (!canAccess && shareToken) {
    const key = process.env.SHARING_ENCRYPTION_SECRET!;
    const {
      processId: shareProcessId,
      embeddedMode,
      timestamp,
    } = jwt.verify(shareToken, key!) as TokenPayload;

    canAccess =
      !embeddedMode && shareProcessId === processId && timestamp === processMeta.shareTimestamp;
  }

  if (!canAccess) {
    return new NextResponse(null, {
      status: 403,
      statusText: 'Not allowed to view image in this process',
    });
  }

  const imageBuffer = await getProcessImage(processId, imageFileName);

  const fileType = await fileTypeFromBuffer(imageBuffer);

  if (!fileType) {
    return new NextResponse(null, {
      status: 415,
      statusText: 'Can not read file type of requested image',
    });
  }

  const headers = new Headers();
  headers.set('Content-Type', fileType.mime);

  return new NextResponse(imageBuffer, { status: 200, statusText: 'OK', headers });
}

export async function PUT(
  request: NextRequest,
  {
    params: { environmentId, processId, imageFileName },
  }: { params: { environmentId: string; processId: string; imageFileName: string } },
) {
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

  const isInvalidRequest = invalidRequest(request);
  if (isInvalidRequest) return isInvalidRequest;

  const readImageResult = await readImage(request);
  if (readImageResult.error) return readImageResult.error;

  const newImageFileName = `_image${v4()}.${readImageResult.fileType.ext}`;

  await saveProcessImage(processId, newImageFileName, readImageResult.buffer);

  return new NextResponse(newImageFileName, { status: 201, statusText: 'Created' });
}

export async function DELETE(
  request: NextRequest,
  {
    params: { environmentId, processId, imageFileName },
  }: { params: { environmentId: string; processId: string; imageFileName: string } },
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

  if (!ability.can('delete', toCaslResource('Process', process))) {
    return new NextResponse(null, {
      status: 403,
      statusText: 'Not allowed to delete image in this process',
    });
  }

  await deleteProcessImage(processId, imageFileName);

  return new NextResponse(null, { status: 200, statusText: 'OK' });
}
