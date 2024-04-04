'use server';

import jwt from 'jsonwebtoken';
import { updateProcessShareInfo } from '../data/processes';
import { Environment } from '../data/environment-schema';
import { getEnvironmentById } from '../data/legacy/iam/environments';
import { getUserOrganizationEnviroments } from '../data/legacy/iam/memberships';

export interface TokenPayload {
  processId: string | string[];
  embeddedMode?: boolean;
  timestamp?: number;
}

export interface ProcessGuestAccessRights {
  shared?: boolean;
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
    newMeta = { shareTimestamp: timestamp };
  }

  await updateProcessGuestAccessRights(payload.processId as string, newMeta, spaceId);
  return { token };
}

export async function getAllUserWorkspaces(userId: string) {
  const userEnvironments: Environment[] = [getEnvironmentById(userId)];
  userEnvironments.push(
    ...getUserOrganizationEnviroments(userId).map((environmentId) =>
      getEnvironmentById(environmentId),
    ),
  );
  return userEnvironments;
}
