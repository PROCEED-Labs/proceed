'use server';

import db from '@/lib/data/db';
import z from 'zod';

import { getCurrentEnvironment, getCurrentUser } from '@/components/auth';
import { isUserErrorResponse, userError } from '../user-error';

import crypto from 'crypto';
import { getMSConfig } from '../ms-config/ms-config';

const pairingCodeSchema = z.object({
  userId: z.string(),
  code: z.string(),
  expires: z.date(),
  environmentId: z.string(),
});

const getUserData = async () => {
  const { user } = await getCurrentUser();

  if (!user || user.isGuest) return userError('Invalid session, please sign in.');

  return user;
};

export const createPairingCode = async (environmentId: string) => {
  try {
    const msConfig = await getMSConfig();
    if (!msConfig.PROCEED_PUBLIC_MCP_ACTIVE) {
      return userError('Not available.');
    }

    const user = await getUserData();
    if (isUserErrorResponse(user)) return user;

    // check that the current user is a member of the space
    await getCurrentEnvironment(environmentId);

    const { id: userId } = user;

    // revoke codes that might have been generated before
    await db.mcpPairingCode.deleteMany({
      where: { userId: userId, environmentId },
    });

    // generate a code
    // using the same method as https://github.com/nextauthjs/cli to generate the code string
    const gen = crypto.getRandomValues(new Uint8Array(32));
    // @ts-expect-error
    const code = Buffer.from(gen, 'base64').toString('base64');
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const codeInput = pairingCodeSchema.parse({ userId, code, expires, environmentId });

    await db.mcpPairingCode.create({ data: codeInput });

    return code;
  } catch (err) {
    return userError('Something went wrong.');
  }
};

export const getPairingCode = async (environmentId: string) => {
  const msConfig = await getMSConfig();
  if (!msConfig.PROCEED_PUBLIC_MCP_ACTIVE) {
    return userError('Not available.');
  }

  const user = await getUserData();
  if (isUserErrorResponse(user)) return user;

  const pairingInfo = await db.mcpPairingCode.findFirst({
    where: { environmentId, userId: user.id },
    select: { code: true, expires: true },
  });

  if (!pairingInfo) return pairingInfo;

  if (pairingInfo.expires.getTime() < Date.now()) {
    await db.mcpPairingCode.deleteMany({
      where: { userId: user.id, environmentId },
    });
    return null;
  }

  return pairingInfo?.code;
};

export const getPairingInfo = async (code: string) => {
  try {
    const msConfig = await getMSConfig();
    if (!msConfig.PROCEED_PUBLIC_MCP_ACTIVE) {
      return userError('Not available.');
    }

    const pairingInfo = await db.mcpPairingCode.findUnique({
      where: { code },
    });

    const error = userError('Invalid user code.');
    if (!pairingInfo) return error;
    if (pairingInfo.expires.getTime() < Date.now()) {
      await db.mcpPairingCode.deleteMany({
        where: { userId: pairingInfo.userId, environmentId: pairingInfo.environmentId },
      });
      return error;
    }

    return pairingInfo;
  } catch (err) {
    return userError('Something went wrong.');
  }
};

export const revokePairingCode = async (environmentId: string) => {
  const msConfig = await getMSConfig();
  if (!msConfig.PROCEED_PUBLIC_MCP_ACTIVE) {
    return userError('Not available.');
  }

  const user = await getUserData();
  if (isUserErrorResponse(user)) return user;

  await db.mcpPairingCode.deleteMany({
    where: { userId: user.id, environmentId },
  });
};
