import {
  extractParameter,
  findParameter,
} from '@/app/(dashboard)/[environmentId]/machine-config/configuration-helper';
import db from '@/lib/data/db';
import {
  nestedParametersFromStorage,
  getParameterParent,
  getDeepConfigurationById,
} from '@/lib/data/db/machine-config';
import { env } from '@/lib/ms-config/env-vars';
import { NextRequest, NextResponse } from 'next/server';
import { validate as uuidValidate } from 'uuid';

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ spaceId: string; dataObjectId: string }> },
) {
  const params = await props.params;

  const { spaceId, dataObjectId } = params;
  const parentConfig = await getDeepConfigurationById(spaceId);
  let parameter;
  if (parentConfig.configType !== 'organization')
    return NextResponse.json('This ID does not correspond to a space.', { status: 404 });
  if (uuidValidate(dataObjectId)) {
    parameter = findParameter(dataObjectId, parentConfig, 'config')?.selection;
  } else {
    const path = dataObjectId.toLocaleLowerCase().split('.');
    parameter = extractParameter(parentConfig, path);
  }
  if (parameter) return NextResponse.json(parameter);
  else return NextResponse.json('This ID does not correspond to a space.', { status: 404 });
}
