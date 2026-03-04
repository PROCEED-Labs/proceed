import { getNestedUserParameter, updateParameter } from '@/lib/data/db/machine-config';
import { NextRequest, NextResponse } from 'next/server';
import { isUserErrorResponse } from '@/lib/user-error';
import { filterParameter } from '../../../util';
import { getUserById } from '@/lib/data/db/iam/users';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ spaceId: string; userId: string; dataPath: string }> },
) {
  const searchParams = request.nextUrl.searchParams;

  let value: any;

  try {
    let { spaceId, userId, dataPath } = await params;

    if (dataPath.startsWith('user-info')) {
      const info = await getUserById(userId);
      if (info.isGuest) return new NextResponse(null, { status: 404 });

      const userInfo = { ...info, name: `${info.firstName} ${info.lastName}` };

      const [varName] = dataPath.split('.').slice(1);

      if (!(varName in userInfo)) return new NextResponse(null, { status: 404 });

      value = userInfo[varName as keyof typeof userInfo];
    } else {
      const parameter = await getNestedUserParameter(userId, spaceId, dataPath);

      if (isUserErrorResponse(parameter)) {
        return new NextResponse('Cannot get user data', { status: 400 });
      }

      if (!parameter) return new NextResponse(null, { status: 404 });

      value = searchParams.has('full', 'true') ? filterParameter(parameter) : parameter.value;
    }

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

  const parameter = await getNestedUserParameter(userId, spaceId, dataPath);

  if (isUserErrorResponse(parameter)) {
    return new NextResponse('Cannot get user data', { status: 400 });
  }

  if (!parameter) return new NextResponse(null, { status: 404 });

  try {
    await updateParameter(parameter.id, { value: `${body.value}` }, spaceId);
    return new NextResponse(null, { status: 200 });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
