'use server';

import jwt from 'jsonwebtoken';
import { updateProcessShareInfo } from '../data/processes';
import { headers } from 'next/headers';
import { Environment } from '../data/environment-schema';
import { getEnvironmentById } from '@/lib/data/db/iam/environments';
import { getUserOrganizationEnvironments } from '@/lib/data/db/iam/memberships';
import { asyncMap } from '../helpers/javascriptHelpers';
import Ability from '../ability/abilityHelper';
import { UserErrorType, userError } from '../server-error-handling/user-error';
import { env } from '../ms-config/env-vars';

export interface TokenPayload {
  processId: string | string[];
  embeddedMode?: boolean;
  timestamp: number;
}

export interface ProcessGuestAccessRights {
  sharedAs?: 'public' | 'protected';
  shareTimestamp?: number;
  allowIframeTimestamp?: number;
}

export async function updateProcessGuestAccessRights(
  processId: string | string[],
  newMeta: ProcessGuestAccessRights,
  spaceId: string,
) {
  await updateProcessShareInfo(
    processId as string,
    newMeta.sharedAs,
    newMeta.shareTimestamp,
    newMeta.allowIframeTimestamp,
    spaceId,
  );
}

function generateProcessShareToken(payload: TokenPayload) {
  const secretKey = env.SHARING_ENCRYPTION_SECRET;
  const token = jwt.sign(payload, secretKey!);
  return token;
}

export async function generateSharedViewerUrl(
  payload: TokenPayload,
  version?: string,
  settings?: string[],
) {
  try {
    if (payload.embeddedMode && !version)
      return userError('A version is required for embedded mode', UserErrorType.ConstraintError);

    const token = generateProcessShareToken(payload);

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
  } catch (e) {
    return userError('Something went wrong');
  }
}
