import { getCurrentEnvironment, getCurrentUser } from '@/components/auth';
import { toCaslResource } from '@/lib/ability/caslAbility';
import {
  getProcessImageFileNames,
  getProcessMetaObjects,
  saveProcessImage,
} from '@/lib/data/legacy/_process';
import { NextRequest, NextResponse } from 'next/server';
import { v4 } from 'uuid';
import stream from 'node:stream';
import type { ReadableStream } from 'node:stream/web';
import { fileTypeFromBuffer } from 'file-type';
import { getProcess } from '@/lib/data/processes';

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

  const { ability } = await getCurrentEnvironment(environmentId);

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

  const imageFileName = `_image${v4()}.${fileType.ext}`;
  await saveProcessImage(processId, imageFileName, imageBuffer);

  return new NextResponse(imageFileName, { status: 201, statusText: 'Created' });
}
