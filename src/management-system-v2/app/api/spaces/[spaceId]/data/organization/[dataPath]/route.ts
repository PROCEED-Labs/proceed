import { getDeepConfigurationById, updateParameter } from '@/lib/data/db/machine-config';
import { NextRequest, NextResponse } from 'next/server';
import { filterParameter, getParameterFromPath } from '../../util';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ spaceId: string; dataPath: string }> },
) {
  const searchParams = request.nextUrl.searchParams;

  try {
    const { spaceId, dataPath } = await params;

    const conf = await getDeepConfigurationById(spaceId);

    let org = conf.content.find((entry) => entry.name === 'organization');

    if (!org) return new NextResponse(null, { status: 404 });

    const parameter = getParameterFromPath(org.subParameters, dataPath);

    if (!parameter) return new NextResponse(null, { status: 404 });

    let value = searchParams.has('full', 'true') ? filterParameter(parameter) : parameter.value;

    return NextResponse.json(value, {
      status: 200,
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Not implemented' }, { status: 404 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ spaceId: string; userId: string; dataPath: string }> },
) {
  const { spaceId, dataPath } = await params;
  const body = await request.json();

  if (!('value' in body)) {
    return new NextResponse('Expected an object with a value ({ value: ... })', { status: 400 });
  }

  const conf = await getDeepConfigurationById(spaceId);

  let org = conf.content.find((entry) => entry.name === 'organization');

  if (!org) return new NextResponse(null, { status: 404 });

  const parameter = getParameterFromPath(org.subParameters, dataPath);
  if (!parameter) return new NextResponse(null, { status: 404 });

  try {
    await updateParameter(parameter.id, { value: `${body.value}` }, spaceId);
    return new NextResponse(null, { status: 200 });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
