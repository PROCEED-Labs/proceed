'use server';

import jwt from 'jsonwebtoken';
import { updateProcessShareInfo } from '../data/processes';

export interface TokenPayload {
  processId: string | string[];
  embeddedMode?: boolean;
}

export interface ProcessGuestAccessRights {
  shared?: boolean;
  sharedAs?: 'public' | 'protected';
  shareToken?: string;
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
  );
}

export async function generateProcessShareToken(payload: TokenPayload) {
  const secretKey = process.env.JWT_SHARE_SECRET;
  const token = jwt.sign(payload, secretKey!);
  const newMeta: ProcessGuestAccessRights = {
    shareToken: token,
  };
  await updateProcessGuestAccessRights(payload.processId as string, newMeta);
  return { token };
}
