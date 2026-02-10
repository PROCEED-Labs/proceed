import {
  getConfigIdFromShortName,
  getParameterParent,
  nestedParametersFromStorage,
  overrideParameter,
  removeParameter,
  validateParameterName,
  validateParentConfig,
} from '@/lib/data/db/machine-config';
import {
  ParameterZod,
  Parameter,
  VirtualParameter,
  StoredParameterZod,
} from '@/lib/data/machine-config-schema';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { validate as uuidValidate } from 'uuid';
import { parameterToProp } from '@/app/(dashboard)/[environmentId]/machine-config/configuration-helper';

export async function GET(
  request: NextRequest,
  {
    params: { configSetId, parameterId },
  }: { params: { configSetId: string; parameterId: string } },
) {
  // Answer - Success: 200 OK, Body: one parameter of one configuration ({id, key, type, content[], parentId, parameters[], parentType, linkedParameters[]})
  // Answer - Error: 404 Not Found

  const searchParams = request.nextUrl.searchParams;
  try {
    const parameter = await nestedParametersFromStorage([parameterId]);

    if (searchParams.get('aas-format') === 'true') {
      return NextResponse.json(parameterToProp(Object.values(parameter)[0]));
    } else {
      return NextResponse.json(Object.values(parameter)[0]);
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
}

export async function PUT(
  request: NextRequest,
  {
    params: { spaceId, configSetId, parameterId },
  }: { params: { spaceId: string; configSetId: string; parameterId: string } },
) {
  try {
    let queryId = uuidValidate(configSetId)
      ? configSetId
      : await getConfigIdFromShortName(configSetId, spaceId);
    if (!(await validateParentConfig(queryId, parameterId))) {
      throw new Error(
        `Config with ID '${queryId}' does not contain a parameter with the ID '${parameterId}'`,
      );
    }
    const oldParameter = (await nestedParametersFromStorage([parameterId]))[0];
    if (!oldParameter.changeableByUser) {
      throw new Error('This parameter is not changeable by the user.');
    }
    const body: Parameter = await request.json();
    StoredParameterZod.extend({
      valueTemplateSource: z.enum(['shortName', 'name', 'description', 'category']),
    })
      .omit({
        changeableByUser: true,
        subParameters: true,
        usedAsInputParameterIn: true,
        valueType: true,
      })
      .partial()
      .strict()
      .parse(body);
    if (body.id && parameterId !== body.id)
      throw new Error('ID given in body does not match ID in call URL.');
    if (
      body.value &&
      body.transformation &&
      !['none', 'manual'].includes(body.transformation?.transformationType)
    ) {
      throw new Error(
        "Value can only be set if the transformation is non-existent or has transformationType 'none' or 'manual'",
      );
    }
    if (
      'valueTemplateSource' in body &&
      !['shortName', 'name', 'description', 'category'].includes(
        (body as VirtualParameter).valueTemplateSource,
      )
    ) {
      throw new Error(
        "Virtual parameters can only reference the meta data fields 'shortName', 'name', 'description', 'categories'.",
      );
    }
    const paramParent = await getParameterParent(parameterId);
    if (paramParent == null) {
      throw new Error(`The parent to parameter '${parameterId}' was not found.`);
    }
    const { parentId, parentType } = paramParent;
    if (body.name && !(await validateParameterName(queryId, parentId, parentType, body.name))) {
      throw new Error(`The parameter name '${body.name}' already exists.`);
    }
    await overrideParameter(parameterId, body);
    return NextResponse.json('Success');
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }
}

export async function DELETE(
  request: NextRequest,
  {
    params: { spaceId, configSetId, parameterId },
  }: { params: { spaceId: string; configSetId: string; parameterId: string } },
) {
  try {
    let queryId = uuidValidate(configSetId)
      ? configSetId
      : await getConfigIdFromShortName(configSetId, spaceId);
    if (!(await validateParentConfig(queryId, parameterId))) {
      throw new Error(
        `Config with ID '${queryId}' does not contain a parameter with the ID '${parameterId}'`,
      );
    }
    await removeParameter(parameterId);
    return NextResponse.json('Success');
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
}
