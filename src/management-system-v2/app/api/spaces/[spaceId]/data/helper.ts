import {
  extractParameter,
  findParameter,
} from '@/app/(dashboard)/[environmentId]/machine-config/configuration-helper';
import { getMembers } from '@/lib/data/db/iam/memberships';
import { getDeepConfigurationById } from '@/lib/data/db/machine-config';
import {
  Parameter,
  StoredParameter,
  StoredVirtualParameter,
} from '@/lib/data/machine-config-schema';
import { NextResponse } from 'next/server';
import { validate as uuidValidate } from 'uuid';
import { z } from 'zod';

export function toErrorResponse(msg: string) {
  return {
    isError: true,
    data: NextResponse.json(msg, { status: 404 }),
  };
}

export function isErrorResponse(
  obj: Awaited<ReturnType<typeof getDataObject>>,
): obj is ReturnType<typeof toErrorResponse> {
  return 'isError' in obj;
}

export async function getDataObject(spaceId: string, dataObjectId: string, userId?: string) {
  try {
    const parentConfig = await getDeepConfigurationById(spaceId);
    if (parentConfig.configType !== 'organization') {
      return toErrorResponse(`This ID (${spaceId}) does not correspond to a space.`);
    }
    let parentParameter;
    if (userId) {
      const memberId = (await getMembers(spaceId)).find((member) => member.userId == userId)?.id;
      if (!memberId) {
        return toErrorResponse(`User ${userId} is not part of space ${spaceId}.`);
      }

      parentParameter = findParameter(memberId, parentConfig, 'config')?.selection;
    } else {
      parentParameter = extractParameter(parentConfig, ['organization']);
    }

    if (!parentParameter) {
      return toErrorResponse(`Organization parameter not found in config of space ${spaceId}.`);
    }

    let parameter: Parameter | undefined;
    if (uuidValidate(dataObjectId)) {
      parameter = findParameter(dataObjectId, parentParameter, 'parameter')?.selection;
    } else {
      const path = dataObjectId.split('.');
      // TODO once lower case enforcement on parameter names is implemented
      // const path = dataObjectId.toLocaleLowerCase().split('.');
      parameter = extractParameter(parentParameter, path);
    }
    if (!parameter)
      return toErrorResponse(`Parameter ${dataObjectId} not found in config of space ${spaceId}.`);

    return { data: parameter };
  } catch {
    return toErrorResponse(`No config found for spaceId ${spaceId}.`);
  }
}

export async function parseAndGetChanges(rawBody: string, originalParameter: Parameter) {
  const schema = z.string().refine((s) => /^(?!.*\p{C}).+$/u.test(s), 'Binary data detected');
  const body = schema.parse(rawBody);
  const parameterChanges: Partial<StoredParameter | StoredVirtualParameter> = {
    value: body,
    ...((originalParameter.transformation?.transformationType === 'linked' ||
      originalParameter.transformation?.transformationType === 'algorithm') && {
      transformation: {
        ...originalParameter.transformation,
        transformationType: 'manual' as const,
        action: '',
      },
    }),
  };
  return { id: originalParameter.id, changes: parameterChanges };
}
