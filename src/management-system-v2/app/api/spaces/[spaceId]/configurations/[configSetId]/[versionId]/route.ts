import { configToAasFormat } from '@/app/(dashboard)/[environmentId]/machine-config/configuration-helper';
import { getConfigIdFromShortName, getDeepConfigurationById } from '@/lib/data/db/machine-config';
import { NextRequest, NextResponse } from 'next/server';
import { validate as uuidValidate, v4 } from 'uuid';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ spaceId: string; configSetId: string; versionId: string }> },
) {
  // Answer - Success: 200 OK, Body: one version of one configuration, same as export
  // Answer - Error: 404 Not Found
  try {
    const { spaceId, configSetId, versionId } = await params;
    if (versionId === 'latest') {
      const searchParams = request.nextUrl.searchParams;
      let queryId = uuidValidate(configSetId)
        ? configSetId
        : await getConfigIdFromShortName(configSetId, spaceId);
      const config = await getDeepConfigurationById(queryId);
      if (searchParams.get('aas-format') === 'true') {
        const aasConfig = configToAasFormat(config);
        return NextResponse.json(aasConfig);
      } else {
        return NextResponse.json(config);
      }
    } else {
      return NextResponse.json({ error: 'Versions API coming soon.' }, { status: 404 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
}
