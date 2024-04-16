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
import stream from 'node:stream';
import type { ReadableStream } from 'node:stream/web';

export async function GET(
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

  if (!ability.can('view', toCaslResource('Process', process))) {
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

  await saveProcessImage(processId, imageFileName, imageBuffer);

  return new NextResponse(null, { status: 200, statusText: 'OK' });
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
