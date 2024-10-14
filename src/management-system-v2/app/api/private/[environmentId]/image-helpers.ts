import { fileTypeFromBuffer } from 'file-type';
import { NextRequest, NextResponse } from 'next/server';
import stream from 'node:stream';
import type { ReadableStream } from 'node:stream/web';

export function invalidRequest(request: NextRequest) {
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
}

export async function readImage(request: NextRequest) {
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
        return {
          error: new NextResponse(null, {
            status: 413,
            statusText: 'Allowed image size of 2MB exceeded',
          }),
          success: undefined,
        };
      }
    }
  }
  // Proceed with processing if the size limit is not exceeded
  const imageBuffer = Buffer.concat(chunks, totalLength);

  const fileType = await fileTypeFromBuffer(imageBuffer);

  if (!fileType) {
    return {
      error: new NextResponse(null, {
        status: 415,
        statusText: 'Can not store image with unknown file type',
      }),
      success: true,
    };
  }

  return {
    buffer: imageBuffer,
    fileType,
    error: undefined,
  };
}
