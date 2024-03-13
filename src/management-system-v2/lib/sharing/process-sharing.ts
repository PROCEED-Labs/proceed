'use server';

import jwt from 'jsonwebtoken';
import { updateProcessShareInfo } from '../data/processes';
import { headers } from 'next/headers';

export interface TokenPayload {
  processId: string | string[];
  timestamp: number;
  embeddedMode?: boolean;
}

export interface ProcessGuestAccessRights {
  shared?: boolean;
  sharedAs?: 'public' | 'protected';
  shareTimestamp?: number;
}

export async function updateProcessGuestAccessRights(
  processId: string | string[],
  newMeta: ProcessGuestAccessRights,
) {
  await updateProcessShareInfo(
    processId as string,
    newMeta.shared,
    newMeta.sharedAs,
    newMeta.shareTimestamp,
  );
}

async function generateProcessShareToken(payload: TokenPayload) {
  const secretKey = process.env.JWT_SHARE_SECRET;
  const token = jwt.sign(payload, secretKey!);
  return token;
}

export async function generateSharedViewerUrl(
  payload: TokenPayload,
  version?: string,
  settings?: string[],
) {
  const token = await generateProcessShareToken(payload);

  const header = headers();
  const host = header.get('host');
  const scheme = header.get('referer')?.split('://')[0];

  const baseUrl = `${scheme}://${host}`;
  let url = `${baseUrl}/shared-viewer?token=${token}`;

  if (version) {
    url += `&version=${version}`;
  }

  if (settings?.length) {
    settings.forEach((option) => {
      url += `&settings=${option}`;
    });
  }

  return url;
}
