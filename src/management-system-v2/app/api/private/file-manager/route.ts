import { fileTypeFromBuffer } from 'file-type';
import { getCurrentEnvironment } from '@/components/auth';
import { toCaslResource } from '@/lib/ability/caslAbility';
import { NextRequest, NextResponse } from 'next/server';
import { Readable } from 'node:stream';
import type { ReadableStream } from 'node:stream/web';
import jwt from 'jsonwebtoken';
import { TokenPayload } from '@/lib/sharing/process-sharing';
import { getProcess } from '@/lib/data/processes';
import { EntityType } from '@/lib/helpers/fileManagerHelpers';
import {
  deleteEntityFile,
  retrieveEntityFile,
  saveEntityFile,
} from '@/lib/data/file-manager-facade';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2 MB

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const entityId = searchParams.get('entityId');
  const entityType = searchParams.get('entityType');
  const environmentId = searchParams.get('environmentId') || 'unauthenticated';
  const fileName = searchParams.get('fileName') || undefined;
  if (
    !entityId ||
    !entityType ||
    !environmentId ||
    (entityType === EntityType.PROCESS && !fileName)
  ) {
    return new NextResponse(null, {
      status: 400,
      statusText: 'entityId, entityType, environmentId and fileName required as URL search params',
    });
  }

  if (entityType === EntityType.PROCESS) {
    let canAccess = false;

    const processMeta = await getProcess(entityId, environmentId);
    if (!processMeta || 'error' in processMeta) {
      return new NextResponse(null, {
        status: 404,
        statusText: 'Process with this id does not exist.',
      });
    }

    if (environmentId !== 'unauthenticated') {
      const { ability } = await getCurrentEnvironment(environmentId);

      canAccess = ability.can('view', toCaslResource('Process', processMeta));
    }

    // if the user is not an owner check if they have access if a share token is provided in the query data of the url
    const shareToken = searchParams.get('shareToken');
    if (!canAccess && shareToken) {
      const key = process.env.SHARING_ENCRYPTION_SECRET!;
      const {
        processId: shareProcessId,
        embeddedMode,
        timestamp,
      } = jwt.verify(shareToken, key!) as TokenPayload;
      canAccess =
        !embeddedMode && shareProcessId === entityId && timestamp === processMeta.shareTimestamp;
    }

    if (!canAccess) {
      return new NextResponse(null, {
        status: 403,
        statusText: 'Not allowed to access files in this process',
      });
    }
  }

  try {
    const data = await retrieveEntityFile(entityType as EntityType, entityId, fileName);

    const fileType = await fileTypeFromBuffer(data as Buffer);
    if (!fileType) {
      return new NextResponse(null, {
        status: 415,
        statusText: 'Cannot read file type of requested file',
      });
    }

    const headers = new Headers();
    headers.set('Content-Type', fileType.mime);
    return new NextResponse(data, { status: 200, statusText: 'OK', headers });
  } catch (error: any) {
    console.error('Error retrieving file:', error);

    if (error.message.includes('File') && error.message.includes('does not exist')) {
      return new NextResponse(null, {
        status: 404,
        statusText: 'File not found',
      });
    }
    return new NextResponse(null, {
      status: 500,
      statusText: 'Internal Server Error',
    });
  }
}

export async function PUT(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const entityId = searchParams.get('entityId');
  const entityType = searchParams.get('entityType');
  const environmentId = searchParams.get('environmentId');
  const fileName = searchParams.get('fileName');
  if (!entityId || !environmentId || !entityType || !fileName) {
    return new NextResponse(null, {
      status: 400,
      statusText: 'entityId, entityType, environmentId and fileName required as URL search params',
    });
  }

  const { ability } = await getCurrentEnvironment(environmentId);
  if (entityType === EntityType.PROCESS) {
    const process = await getProcess(entityId, environmentId);
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
  }

  const reader = Readable.fromWeb(request.body as ReadableStream<Uint8Array>);
  const chunks: Uint8Array[] = [];
  let totalLength = 0;

  for await (const chunk of reader) {
    if (chunk) {
      chunks.push(chunk);
      totalLength += chunk.length;
      if (totalLength > MAX_FILE_SIZE) {
        reader.destroy(
          new Error(`Allowed file size of ${MAX_FILE_SIZE / (1024 * 1024)} MB exceeded`),
        );
        return new NextResponse(null, {
          status: 413,
          statusText: `Allowed file size of ${MAX_FILE_SIZE / (1024 * 1024)} MB exceeded`,
        });
      }
    }
  }

  // Proceed with processing if the size limit is not exceeded
  const buffer = Buffer.concat(
    chunks.map((chunk) => Buffer.from(chunk)),
    totalLength,
  );

  const fileType = await fileTypeFromBuffer(buffer);
  if (!fileType) {
    return new NextResponse(null, {
      status: 415,
      statusText: 'Cannot store file with unknown file type',
    });
  }

  // Additional check for image size
  if (fileType.mime.startsWith('image/') && totalLength > MAX_IMAGE_SIZE) {
    return new NextResponse(null, {
      status: 413,
      statusText: `Allowed image size of ${MAX_IMAGE_SIZE / (1024 * 1024)}MB exceeded`,
    });
  }

  try {
    const res = await saveEntityFile(
      entityType as EntityType,
      entityId,
      fileType.mime,
      fileName,
      buffer,
    );

    if ('error' in res) throw new Error((res.error as any).message);

    const { fileName: newFileName } = res;

    return new NextResponse(newFileName, {
      status: 200,
      statusText: 'OK',
    });
  } catch (error) {
    console.error('Error saving file:', error);
    return new NextResponse(null, { status: 500, statusText: 'Internal Server Error' });
  }
}

export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const entityId = searchParams.get('entityId');
  const entityType = searchParams.get('entityType');
  const environmentId = searchParams.get('environmentId');
  const fileName = searchParams.get('fileName');

  if (!entityId || !entityType || !environmentId || !fileName) {
    return new NextResponse(null, {
      status: 400,
      statusText: 'entityId, entityType, environmentId and fileName required as URL search params',
    });
  }

  const { ability } = await getCurrentEnvironment(environmentId);
  if (entityType === EntityType.PROCESS) {
    const process = await getProcess(entityId, environmentId);

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
  }

  try {
    await deleteEntityFile(entityType as EntityType, entityId, fileName);
    return new NextResponse(null, { status: 200, statusText: 'OK' });
  } catch (error) {
    console.error('Error deleting file:', error);
    return new NextResponse(null, { status: 500, statusText: 'Internal Server Error' });
  }
}
