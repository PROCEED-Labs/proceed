import { getCurrentEnvironment } from '@/components/auth';
import { toCaslResource } from '@/lib/ability/caslAbility';
import { getProcess, getProcessImageFileNames, saveProcessImage } from '@/lib/data/db/process';
import { NextRequest, NextResponse } from 'next/server';
import { v4 } from 'uuid';
import { invalidRequest, readImage } from '../../../image-helpers';
import { getErrorMessage } from '@/lib/server-error-handling/user-error';

export async function GET(
  request: NextRequest,
  {
    params: { environmentId, processId },
  }: { params: { environmentId: string; processId: string } },
) {
  try {
    const currentSpace = await getCurrentEnvironment(environmentId);
    if (currentSpace.isErr()) throw currentSpace.error;
    const { ability } = currentSpace.value;

    const process = await getProcess(processId, false);
    if (process.isErr()) throw process.error;

    if (!process.value) {
      return new NextResponse(null, {
        status: 404,
        statusText: 'Process with this id does not exist.',
      });
    }

    if (!ability.can('view', toCaslResource('Process', process.value))) {
      return new NextResponse(null, {
        status: 403,
        statusText: 'Not allowed to view image filenames in this process',
      });
    }

    const fileNames = await getProcessImageFileNames(processId);

    return NextResponse.json(fileNames);
  } catch (error) {
    return new NextResponse(null, {
      status: 500,
      statusText: getErrorMessage(error),
    });
  }
}

export async function POST(
  request: NextRequest,
  {
    params: { environmentId, processId },
  }: { params: { environmentId: string; processId: string } },
) {
  try {
    const isInvalidRequest = invalidRequest(request);
    if (isInvalidRequest) return isInvalidRequest;

    const currentEnvironment = await getCurrentEnvironment(environmentId);
    if (currentEnvironment.isErr()) throw currentEnvironment.error;
    const { ability } = currentEnvironment.value;

    const process = await getProcess(processId, false);
    if (process.isErr()) throw process.error;

    if (!process.value) {
      return new NextResponse(null, {
        status: 404,
        statusText: 'Process with this id does not exist.',
      });
    }

    if (!ability.can('view', toCaslResource('Process', process.value))) {
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
  } catch (error) {
    return new NextResponse(null, {
      status: 500,
      statusText: getErrorMessage(error),
    });
  }
}
