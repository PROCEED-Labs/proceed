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
  shareTimeStamp?: number;
  allowIframeTimestamp?: number;
}

export async function updateProcessGuestAccessRights(
  processId: string | string[],
  newMeta: ProcessGuestAccessRights,
  spaceId: string,
) {
  await updateProcessShareInfo(
    processId as string,
    newMeta.shared,
    newMeta.sharedAs,
    newMeta.shareTimeStamp,
    newMeta.allowIframeTimestamp,
    spaceId,
  );
}

export async function generateProcessShareToken(
  payload: TokenPayload,
  spaceId: string,
  oldTimestamp?: number,
) {
  const secretKey = process.env.JWT_SHARE_SECRET;

  let timestamp = 0;

  if (oldTimestamp) {
    timestamp = oldTimestamp;
  } else {
    timestamp = Date.now();
  }

  payload.timestamp = timestamp;

  const token = jwt.sign(payload, secretKey!);

  let newMeta: ProcessGuestAccessRights = {};

  if (payload.embeddedMode) {
    newMeta = { allowIframeTimestamp: timestamp };
  } else {
    newMeta = { shareTimeStamp: timestamp };
  }

  await updateProcessGuestAccessRights(payload.processId as string, newMeta, spaceId);
  return { token };
}