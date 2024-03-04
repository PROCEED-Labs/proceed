'use server';

import jwt from 'jsonwebtoken';
import { updateProcessShareInfo } from '../data/processes';

export interface TokenPayload {
  processId: string | string[];
  embeddedMode?: boolean;
  timestamp?: number;
}

export interface ProcessGuestAccessRights {
  shared?: boolean;
  sharedAs?: 'public' | 'protected';
  shareToken?: string;
  shareTimeStamp?: number;
}

export async function updateProcessGuestAccessRights(
  processId: string | string[],
  newMeta: ProcessGuestAccessRights,
) {
  await updateProcessShareInfo(
    processId as string,
    newMeta.shared,
    newMeta.sharedAs,
    newMeta.shareToken,
    newMeta.shareTimeStamp,
  );
}

export async function generateProcessShareToken(payload: TokenPayload) {
  const secretKey = process.env.JWT_SHARE_SECRET;
  const timestamp = Date.now();
  payload.timestamp = timestamp;
  const token = jwt.sign(payload, secretKey!);
  const newMeta: ProcessGuestAccessRights = {
    shareToken: token,
    shareTimeStamp: timestamp,
  };
  await updateProcessGuestAccessRights(payload.processId as string, newMeta);
  return { token };
}
