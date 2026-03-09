import {
  extractParameterFromParameter,
  findParameter,
} from '@/app/(dashboard)/[environmentId]/machine-config/configuration-helper';
import { getMembers } from '@/lib/data/db/iam/memberships';
import { getDeepConfigurationById, updateParameter } from '@/lib/data/db/machine-config';
import { Parameter } from '@/lib/data/machine-config-schema';
import { NextRequest, NextResponse } from 'next/server';
import { validate as uuidValidate } from 'uuid';
import { z } from 'zod';

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ spaceId: string; userId: string; dataObjectId: string }> },
) {
  const { spaceId, userId, dataObjectId } = await props.params;
  const fetchedData = await getDataObject(spaceId, userId, dataObjectId);
  if (fetchedData.isResponse) return fetchedData.data;
  else if (fetchedData.data) return NextResponse.json(fetchedData.data);
  else
    return NextResponse.json(
      `Parameter ${dataObjectId} not found in user parameter for user ${userId} in space config for space ${spaceId}.`,
      { status: 404 },
    );
}

export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ spaceId: string; userId: string; dataObjectId: string }> },
) {
  const { spaceId, userId, dataObjectId } = await props.params;
  try {
    const rawBody = await request.text();
    const schema = z
      .string()
      .refine((s) => !/[^\x20-\x7E\t\n\r]/.test(s), { message: 'Binary data detected' });
    const body = schema.parse(rawBody);
    const fetchedData = await getDataObject(spaceId, userId, dataObjectId);
    if (fetchedData.isResponse) return fetchedData.data;
    else if (fetchedData.data) {
      const parameter = fetchedData.data as Parameter;
      const parameterChanges = {
        value: body,
        ...((parameter.transformation?.transformationType === 'linked' ||
          parameter.transformation?.transformationType === 'algorithm') && {
          transformation: {
            ...parameter.transformation,
            transformationType: 'manual' as const,
            action: '',
          },
        }),
      };
      await updateParameter(parameter.id, parameterChanges, spaceId);
      return NextResponse.json('Success.');
    } else {
      return NextResponse.json(
        `Parameter ${dataObjectId} not found in user parameter for user ${userId} in space config for space ${spaceId}.`,
        { status: 404 },
      );
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }
}

async function getDataObject(spaceId: string, userId: string, dataObjectId: string) {
  try {
    const parentConfig = await getDeepConfigurationById(spaceId);
    const memberId = (await getMembers(spaceId)).find((member) => member.userId == userId)?.id;
    if (!memberId) {
      return {
        isResponse: true,
        data: NextResponse.json(`User ${userId} is not part of space ${spaceId}.`, { status: 404 }),
      };
    }
    const userParameter = findParameter(memberId, parentConfig, 'config')?.selection;
    let parameter: Parameter | undefined;
    if (parentConfig.configType !== 'organization') {
      return {
        isResponse: true,
        data: NextResponse.json(`${spaceId} does not correspond to a space.`, { status: 404 }),
      };
    } else if (!userParameter) {
      return {
        isResponse: true,
        data: NextResponse.json(
          `User Parameter for ${userId} (memberId: ${memberId}) not found in config for space ${spaceId}.`,
          { status: 404 },
        ),
      };
    } else {
      if (uuidValidate(dataObjectId)) {
        parameter = findParameter(dataObjectId, userParameter, 'config')?.selection;
      } else {
        const path = dataObjectId.toLocaleLowerCase().split('.');
        parameter = extractParameterFromParameter(userParameter, path);
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
