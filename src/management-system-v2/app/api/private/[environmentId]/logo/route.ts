import { getCurrentEnvironment } from '@/components/auth';
import { NextRequest, NextResponse } from 'next/server';
import { invalidRequest, readImage } from '../image-helpers';
import { deleteSpaceLogo, getEnvironmentById, getSpaceLogo } from '@/lib/data/db/iam/environments';

export async function GET(
  _: NextRequest,
  { params: { environmentId } }: { params: { environmentId: string } },
) {
  const organization = await getEnvironmentById(environmentId);
  if (!organization)
    return new NextResponse(null, {
      status: 404,
      statusText: 'Space with this id does not exist.',
    });
  if (!organization.isOrganization)
    return new NextResponse(null, {
      status: 405,
      statusText: "Personal spaces don't support logos",
    });

  try {
    await getCurrentEnvironment(environmentId, {
      permissionErrorHandling: {
        action: 'throw-error',
      },
    });
  } catch (e) {
    return new NextResponse(null, {
      status: 403,
      statusText: "You're not allowed to view this logo",
    });
  }

  // TODO: implement this here
  // const imageBuffer = (await getOrganizationLogo(decodeURIComponent(environmentId)))?.logo;
  //
  // if (!imageBuffer)
  //   return new NextResponse(null, {
  //     status: 204,
  //     statusText: 'Organization has no logo',
  //   });
  //
  // const fileType = await fileTypeFromBuffer(imageBuffer);
  //
  // if (!fileType) {
  //   return new NextResponse(null, {
  //     status: 415,
  //     statusText: 'Can not read file type of requested image',
  //   });
  // }
  //
  // const headers = new Headers();
  // headers.set('Content-Type', fileType.mime);
  //
  // return new NextResponse(imageBuffer, { status: 200, statusText: 'OK', headers });
}

async function updateOrgLogo(
  request: NextRequest,
  { params: { environmentId } }: { params: { environmentId: string } },
) {
  const { ability, activeEnvironment } = await getCurrentEnvironment(environmentId);

  if (!activeEnvironment.isOrganization)
    return new NextResponse(null, {
      status: 405,
      statusText: "Personal spaces don't support logos",
    });

  if (!ability.can('update', 'Environment', { environmentId: activeEnvironment.spaceId })) {
    return new NextResponse(null, {
      status: 403,
      statusText: 'Not allowed to change the logo from an organization',
    });
  }

  const isInvalidRequest = invalidRequest(request);
  if (isInvalidRequest) return isInvalidRequest;

  const readImageResult = await readImage(request);
  if (readImageResult.error) return readImageResult.error;

  // TODO: implement this here
  // saveEntityFile(EntityType.ORGANIZATION,

  return new NextResponse(activeEnvironment.spaceId, { status: 201, statusText: 'Created' });
}

export { updateOrgLogo as POST, updateOrgLogo as PUT };

export async function DELETE(
  _: NextRequest,
  { params: { environmentId } }: { params: { environmentId: string } },
) {
  const { ability, activeEnvironment } = await getCurrentEnvironment(environmentId);

  if (!activeEnvironment.isOrganization)
    return new NextResponse(null, {
      status: 405,
      statusText: "Personal spaces don't support logos",
    });

  if (!ability.can('update', 'Environment', { environmentId: activeEnvironment.spaceId })) {
    return new NextResponse(null, {
      status: 403,
      statusText: 'Not allowed to change the logo from an organization',
    });
  }

  try {
    deleteSpaceLogo(activeEnvironment.spaceId);
  } catch (e) {
    // We assume the organization didn't have a logo
    return new NextResponse(null, {
      status: 405,
      statusText: 'Something went wrong',
    });
  }

  return new NextResponse(activeEnvironment.spaceId, { status: 200, statusText: 'Created' });
}
