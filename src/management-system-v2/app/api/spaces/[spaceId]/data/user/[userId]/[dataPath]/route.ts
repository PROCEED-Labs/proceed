import { getUserConfig, updateParameter } from '@/lib/data/db/machine-config';
import { NextRequest, NextResponse } from 'next/server';
import { isUserErrorResponse } from '@/lib/user-error';
import { filterParameter, getParameterFromPath } from '../../../util';
import { getUserById } from '@/lib/data/db/iam/users';
import { Parameter } from '@/lib/data/machine-config-schema';
import { truthyFilter } from '@/lib/typescript-utils';

function toDummyParameter(
  key: string,
  value: any,
  children: { key: string; value: any }[] = [],
): Parameter {
  return {
    id: key,
    name: key,
    displayName: [
      {
        language: 'en',
        text: key,
      },
    ],
    value,
    parameterType: 'none',
    hasChanges: false,
    structureVisible: true,
    usedAsInputParameterIn: [],
    changeableByUser: false,
    subParameters: children.map(({ key, value }) => toDummyParameter(key, value)),
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ spaceId: string; userId: string; dataPath: string }> },
) {
  const searchParams = request.nextUrl.searchParams;

  try {
    const { spaceId, userId, dataPath } = await params;
    const userData = await getUserConfig(userId, spaceId);

    if (isUserErrorResponse(userData)) {
      return new NextResponse('Cannot get user data', { status: 400 });
    }

    const meta = await getUserById(userId);
    if (meta.isGuest) return new NextResponse(null, { status: 404 });

    const userInfo = toDummyParameter(
      'user-info',
      'empty',
      Object.entries({
        ...meta,
        id: undefined,
        isGuest: undefined,
        favourites: undefined,
        name: `${meta.firstName} ${meta.lastName}`,
      })
        .filter(([_, value]) => !!value)
        .map(([key, value]) => ({
          key,
          value,
        })),
    );

    const parameter = getParameterFromPath(
      [...userData.content[0].subParameters, userInfo],
      dataPath,
    );

    if (!parameter) return new NextResponse(null, { status: 404 });

    let value = searchParams.has('full', 'true') ? filterParameter(parameter) : parameter.value;

    return NextResponse.json(value, {
      status: 200,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ spaceId: string; userId: string; dataPath: string }> },
) {
  const { spaceId, userId, dataPath } = await params;
  const body = await request.json();

  if (!('value' in body)) {
    return new NextResponse('Expected an object with a value ({ value: ... })', { status: 400 });
  }

  const userData = await getUserConfig(userId, spaceId);

  if (isUserErrorResponse(userData)) {
    return new NextResponse('Cannot get user data', { status: 400 });
  }

  const parameter = getParameterFromPath(userData.content[0].subParameters, dataPath);
  if (!parameter) return new NextResponse(null, { status: 404 });

  try {
    await updateParameter(parameter.id, { value: `${body.value}` }, spaceId);
    return new NextResponse(null, { status: 200 });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
