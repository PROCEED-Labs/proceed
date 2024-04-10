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

  const image = await getProcessImage(processId, imageFileName);

  const fileType = await fileTypeFromBuffer(image);

  if (!fileType) {
    return new NextResponse(null, {
      status: 415,
      statusText: 'Can not read file type of requested image',
    });
  }

  const headers = new Headers();
  headers.set('Content-Type', fileType.mime);

  return new NextResponse(image, { status: 200, statusText: 'OK', headers });
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

  const reader = request.body.getReader();
  let imageBuffer: Buffer = Buffer.from('');
  try {
    // read() returns a promise that resolves when a value has been received.
    // See https://developer.mozilla.org/en-US/docs/Web/API/Streams_API/Using_readable_streams#reading_the_stream for details
    await reader.read().then(async function handleImageStream({
      done,
      value,
    }: {
      done: boolean;
      value?: Uint8Array;
    }): Promise<any> {
      if (value) {
        imageBuffer = Buffer.concat([imageBuffer, value]);

        if (imageBuffer.byteLength > 2000000) {
          throw new Error('Allowed image size of 2MB exceed');
        }
      }

      if (!done) {
        // call async read function again to read further chunks of stream when available
        return reader.read().then(handleImageStream);
      }
    });
  } catch (err) {
    if (err instanceof Error && err.message === 'Allowed image size of 2MB exceed') {
      await reader.cancel(err.message);
      return new NextResponse(null, {
        status: 413,
        statusText: err.message,
      });
    }
    throw err;
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
