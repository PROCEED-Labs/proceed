'use server';

import jwt from 'jsonwebtoken';
import { updateProcessShareInfo } from '../data/processes';
import { headers } from 'next/headers';
import { Environment } from '../data/environment-schema';
import { getEnvironmentById } from '../data/legacy/iam/environments';
import { getUserOrganizationEnvironments } from '../data/legacy/iam/memberships';

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

export async function getAllUserWorkspaces(userId: string) {
  const userEnvironments: Environment[] = [getEnvironmentById(userId)];
  userEnvironments.push(
    ...getUserOrganizationEnvironments(userId).map((environmentId) =>
      getEnvironmentById(environmentId),
    ),
  );
  return userEnvironments;
}
