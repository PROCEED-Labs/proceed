import {
  extractParameter,
  extractParameterFromParameter,
  findParameter,
} from '@/app/(dashboard)/[environmentId]/machine-config/configuration-helper';
import { getDeepConfigurationById, updateParameter } from '@/lib/data/db/machine-config';
import { Parameter } from '@/lib/data/machine-config-schema';
import { NextRequest, NextResponse } from 'next/server';
import { validate as uuidValidate } from 'uuid';
import { z } from 'zod';

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ spaceId: string; dataObjectId: string }> },
) {
  // Answer - Success: 200 OK - Returns the full, requested Data Object
  // Answer - Error: 404 Not found - Specified Space or Data Object not found

  const { spaceId, dataObjectId } = await props.params;
  const fetchedData = await getDataObject(spaceId, dataObjectId);
  if (fetchedData.isResponse) return fetchedData.data;
  else if (fetchedData.data) return NextResponse.json(fetchedData.data);
  else return NextResponse.json(`Parameter ${dataObjectId} not found.`, { status: 404 });
}

export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ spaceId: string; dataObjectId: string }> },
) {
  // Answer - Success: 200 OK - Data Object updated
  // Answer - Error: 404 Invalid input - Specified Space or Data Object not found
  // Answer - Error: 409 Invalid input. Body contains the reason. For example, syntax invalid, etc.

  const { spaceId, dataObjectId } = await props.params;
  try {
    const rawBody = await request.text();
    const schema = z
      .string()
      .refine((s) => !/[^\x20-\x7E\t\n\r]/.test(s), { message: 'Binary data detected' });
    const body = schema.parse(rawBody);
    const fetchedData = await getDataObject(spaceId, dataObjectId);
    if (fetchedData.isResponse) return fetchedData.data;
    else if (fetchedData.data) {
      const parameter = fetchedData.data as Parameter;
      const parameterChanges = {
        value: body,
        ...((parameter.transformation?.transformationType === 'linked' ||
          parameter.transformation?.transformationType === 'algorithm') && {
          transformation: { ...parameter.transformation, transformationType: 'manual' as const },
        }),
      };
      await updateParameter(parameter.id, parameterChanges, spaceId);
      return NextResponse.json('Success.');
    } else {
      return NextResponse.json(`Parameter ${dataObjectId} not found.`, { status: 404 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }
}

async function getDataObject(spaceId: string, dataObjectId: string) {
  try {
    const parentConfig = await getDeepConfigurationById(spaceId);
    const parentParameter = extractParameter(parentConfig, ['organization']);
    if (!parentParameter) {
      return {
        isResponse: true,
        data: NextResponse.json(`Organization parameter not found in config of space ${spaceId}.`, {
          status: 404,
        }),
      };
    }
    let parameter: Parameter | undefined;
    if (parentConfig.configType !== 'organization') {
      return {
        isResponse: true,
        data: NextResponse.json('This ID does not correspond to a space.', { status: 404 }),
      };
    } else {
      if (uuidValidate(dataObjectId)) {
        parameter = findParameter(dataObjectId, parentParameter, 'parameter')?.selection;
      } else {
        const path = dataObjectId.toLocaleLowerCase().split('.');
        parameter = extractParameterFromParameter(parentParameter, path);
      }
      return { isResponse: false, data: parameter };
    }
  } catch {
    return {
      isResponse: true,
      data: NextResponse.json(`No config found for spaceId ${spaceId}.`, { status: 404 }),
    };
  }
}
