'use server';

import jwt from 'jsonwebtoken';
import { getProcessMetaObjects, updateProcessMetaData } from '@/lib/data/legacy/_process';
import { getCurrentUser } from '@/components/auth';
import { UserErrorType, userError } from '../user-error';
import { toCaslResource } from '../ability/caslAbility';

export interface TokenPayload {
  processId: string | string[];
  embeddedMode?: boolean;
  timestamp?: number;
}

export interface ProcessGuestAccessRights {
  shared?: boolean;
  sharedAs?: 'public' | 'protected';
  shareTimeStamp?: number;
}

export async function updateProcessGuestAccessRights(
  processId: string | string[],
  newMeta: ProcessGuestAccessRights,
) {
  const { ability } = await getCurrentUser();

  const processMetaObjects: any = getProcessMetaObjects();
  const process = processMetaObjects[processId as string];

  if (!process) {
    return userError('A process with this id does not exist.', UserErrorType.NotFoundError);
  }

  if (!ability.can('update', toCaslResource('Process', process))) {
    return userError('Not allowed to update this process', UserErrorType.PermissionError);
  }

  await updateProcessMetaData(processId as string, newMeta);
}

export async function generateProcessShareToken(payload: TokenPayload) {
  const secretKey = process.env.JWT_SHARE_SECRET;
  const timestamp = Date.now();
  payload.timestamp = timestamp;
  const token = jwt.sign(payload, secretKey!);
  const newMeta: ProcessGuestAccessRights = {
    shareTimeStamp: timestamp,
  };
  await updateProcessGuestAccessRights(payload.processId as string, newMeta);
  return { token };
}
