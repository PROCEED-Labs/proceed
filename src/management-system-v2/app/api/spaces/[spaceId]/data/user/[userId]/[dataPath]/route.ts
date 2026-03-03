import { getUserConfig, updateParameter } from '@/lib/data/db/machine-config';
import { Parameter, VirtualParameter } from '@/lib/data/machine-config-schema';
import { NextRequest, NextResponse } from 'next/server';
import { isUserErrorResponse } from '@/lib/user-error';

type FilteredParameter = Pick<Parameter, 'name' | 'value' | 'id'> & {
  description?: string;
  displayName?: string;
};

type NestedFilteredParameter = FilteredParameter & { subParameters: NestedFilteredParameter[] };

function filterParameter(parameter: Parameter): NestedFilteredParameter {
  return {
    name: parameter.name,
    value: parameter.value,
    id: parameter.id,
    description: parameter.description?.[0].text,
    displayName: parameter.displayName[0].text,
    subParameters: parameter.subParameters.map(filterParameter),
  };
}

function getParameterFromPath(data: (Parameter | VirtualParameter)[], dataPath: string) {
  const segments = dataPath.split('.');

  let parameter: Parameter | undefined = undefined;
  for (const segment of segments) {
    parameter = data.find((entry) => entry.name === segment);
    if (!parameter) return;
    data = parameter.subParameters;
  }

  return parameter;
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

    const parameter = getParameterFromPath(userData.content[0].subParameters, dataPath);
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
