import { getCurrentEnvironment } from '@/components/auth';
import { toCaslResource } from '@/lib/ability/caslAbility';
import { getProcessMetaObjects, saveProcessImage } from '@/lib/data/legacy/_process';
import { NextRequest, NextResponse } from 'next/server';
import { Readable } from 'stream';
import { v4 } from 'uuid';

export async function POST(
  request: NextRequest,
  { params: { processId } }: { params: { processId: string } },
) {
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

  const contentType = request.headers.get('Content-Type') || '';
  const imageType = contentType.split('image/').pop() || '';
  const imageFileName = `_image${v4()}.${imageType}`;
  const imageBlob = new Blob([imageBuffer], { type: contentType });

  await saveProcessImage(processId, imageFileName, imageBlob);

  return new NextResponse(imageFileName, { status: 201, statusText: 'Created' });
}
