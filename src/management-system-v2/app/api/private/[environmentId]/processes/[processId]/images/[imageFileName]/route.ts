import { fileTypeFromBuffer } from 'file-type';
import { getCurrentEnvironment, getCurrentUser } from '@/components/auth';
import { toCaslResource } from '@/lib/ability/caslAbility';
import {
  deleteProcessImage,
  getProcessImage,
  getProcessMetaObjects,
  saveProcessImage,
} from '@/lib/data/legacy/_process';
import { NextRequest, NextResponse } from 'next/server';
import stream from 'node:stream';
import type { ReadableStream } from 'node:stream/web';
import jwt from 'jsonwebtoken';

import { TokenPayload } from '@/lib/sharing/process-sharing';
import { getProcess } from '@/lib/data/processes';
import { enableUseFileManager } from 'FeatureFlags';
import { deleteFile, retrieveFile, saveFile } from '@/lib/data/file-manager';

export async function GET(
  request: NextRequest,
  {
    params: { environmentId, processId, imageFileName },
  }: { params: { environmentId: string; processId: string; imageFileName: string } },
) {
  const processMeta = await getProcess(processId, environmentId);
  const { userId } = await getCurrentUser();

  if (!processMeta || 'error' in processMeta) {
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

  const imageBuffer = enableUseFileManager
    ? await retrieveFile(environmentId, userId, 'image', imageFileName, processId)
    : await getProcessImage(processId, imageFileName);

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

  const { userId } = await getCurrentUser();

  const process = await getProcess(processId, environmentId);

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

  const allowedContentTypes = ['image/jpeg', 'image/svg+xml', 'image/png'];

  const contentType = request.headers.get('content-Type');

  if (!contentType || !allowedContentTypes.includes(contentType)) {
    return new NextResponse(null, {
      status: 400,
      statusText: 'Wrong content type. Image must be of type JPEG, PNG or SVG.',
    });
  }

  if (!request.body) {
    return new NextResponse(null, {
      status: 400,
      statusText: 'No image was given in request',
    });
  }

  const reader = stream.Readable.fromWeb(request.body as ReadableStream<Uint8Array>);
  const chunks: Uint8Array[] = [];
  let totalLength = 0;
  for await (const chunk of reader) {
    if (chunk) {
      chunks.push(chunk);
      totalLength += chunk.length;
      if (totalLength > 2000000) {
        // 2MB limit
        reader.destroy(new Error('Allowed image size of 2MB exceeded'));
        return new NextResponse(null, {
          status: 413,
          statusText: 'Allowed image size of 2MB exceeded',
        });
      }
    }
  }
  // Proceed with processing if the size limit is not exceeded
  const imageBuffer = Buffer.concat(
    chunks.map((chunk) => Buffer.from(chunk)),
    totalLength,
  );

  const fileType = await fileTypeFromBuffer(imageBuffer);

  if (!fileType) {
    return new NextResponse(null, {
      status: 415,
      statusText: 'Can not store image with unknown file type',
    });
  }

  if (enableUseFileManager) {
    await saveFile(environmentId, userId, 'image', imageFileName, imageBuffer, processId);
  } else await saveProcessImage(processId, imageFileName, imageBuffer);

  return new NextResponse(null, { status: 200, statusText: 'OK' });
}

export async function DELETE(
  request: NextRequest,
  {
    params: { environmentId, processId, imageFileName },
  }: { params: { environmentId: string; processId: string; imageFileName: string } },
) {
  const { ability } = await getCurrentEnvironment(environmentId);
  const { userId } = await getCurrentUser();

  const process = await getProcess(processId, environmentId);

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

  if (enableUseFileManager) {
    try {
      await deleteFile(environmentId, userId, 'image', imageFileName, processId);
    } catch (error) {
      console.error('Error deleting image: ', error);
    }
  } else await deleteProcessImage(processId, imageFileName);

  return new NextResponse(null, { status: 200, statusText: 'OK' });
}
