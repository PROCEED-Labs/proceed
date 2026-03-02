import { getDeepConfigurationById } from '@/lib/data/db/machine-config';
import { Parameter } from '@/lib/data/machine-config-schema';
import { NextRequest, NextResponse } from 'next/server';

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

    let data = org.subParameters[0].subParameters;

    const segments = dataPath.split('.');

    let parameter: Parameter | undefined = undefined;
    for (const segment of segments) {
      parameter = data.find((entry) => entry.name === segment);
      if (!parameter) return new NextResponse(null, { status: 404 });
      data = parameter.subParameters;
    }
    if (!parameter) return new NextResponse(null, { status: 404 });

    let value = searchParams.has('full', 'true') ? filterParameter(parameter) : parameter.value;

    return NextResponse.json(value, {
      status: 200,
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Not implemented' }, { status: 404 });
  }
}
