import { defaultParameter } from '@/app/(dashboard)/[environmentId]/machine-config/configuration-helper';
import {
  addParameter,
  addParentConfig,
  getConfigIdFromShortName,
  getDeepConfigurationById,
  partialPropToParameter,
  removeParentConfiguration,
  submodelElementToParameter,
  validateParameterName,
  validateUniqueConfigField,
} from '@/lib/data/db/machine-config';
import {
  ConfigZod,
  Config,
  ParameterZod,
  Parameter,
  StoredParameterZod,
  VirtualParameter,
  BaseParameterZod,
} from '@/lib/data/machine-config-schema';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { validate as uuidValidate, v4 } from 'uuid';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ spaceId: string; configSetId: string }> },
) {
  try {
    const { spaceId, configSetId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const subParameterOf = searchParams.get('asSubParameterOf');
    const aasFormat = searchParams.get('aas-format');
    let queryId = uuidValidate(configSetId)
      ? configSetId
      : await getConfigIdFromShortName(configSetId, spaceId);
    let body: Parameter;
    if (aasFormat) {
      const aasBody = await request.json();
      body = (await partialPropToParameter(aasBody)) as Parameter | VirtualParameter;
      console.log(body);
      BaseParameterZod.extend({
        valueTemplateSource: z.enum(['shortName', 'name', 'description', 'category']).optional(),
      })
        .omit({
          id: true,
          changeableByUser: true,
          usedAsInputParameterIn: true,
          valueType: true,
        })
        .strict()
        .parse(body);
    } else {
      body = await request.json();
      StoredParameterZod.extend({
        valueTemplateSource: z.enum(['shortName', 'name', 'description', 'category']).optional(),
      })
        .omit({
          id: true,
          changeableByUser: true,
          usedAsInputParameterIn: true,
          valueType: true,
          subParameters: true,
        })
        .strict()
        .parse(body);
    }

    const newParam = { ...defaultParameter('new-param', [], []), ...body };

    if (subParameterOf) {
      if (!(await validateParameterName(queryId, subParameterOf, 'parameter', body.name))) {
        throw new Error(`The parameter name '${body.name}' already exists.`);
      }
      await addParameter(subParameterOf, 'parameter', newParam, queryId);
    } else {
      if (!(await validateParameterName(queryId, queryId, 'config', body.name))) {
        throw new Error(`The parameter name '${body.name}' already exists.`);
      }
      await addParameter(queryId, 'config', newParam, queryId);
    }
    return NextResponse.json('Success');
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ spaceId: string; configSetId: string }> },
) {
  // Answer - Success: 200 OK, Body: List of all versions of one configuration ({ id, shortname, name, versions: [ {id, name, createdOn, description, versionBasedOn }, ... ])
  // Answer - Error: 404 Not Found
  try {
    const { spaceId, configSetId } = await params;
    // TODO embed versions
    let queryId = uuidValidate(configSetId)
      ? configSetId
      : await getConfigIdFromShortName(configSetId, spaceId);
    const config = await getDeepConfigurationById(queryId);
    return NextResponse.json(config);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
}
