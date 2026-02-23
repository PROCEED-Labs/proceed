'use server';

import { getCurrentEnvironment, getCurrentUser } from '@/components/auth';
import {
  addPairingCode as _addPairingCode,
  getPairingCodeInfo as _getPairingCodeInfo,
  revokePairingCodes as _revokePairingCodes,
} from './db/iam/mcp-authorization';
import { isUserErrorResponse, userError } from '../user-error';
import { getTokenHash } from '../email-verification-tokens/utils';

import crypto from 'crypto';

const getUserData = async () => {
  const { user } = await getCurrentUser();

  if (!user || user.isGuest) return userError('Invalid session, please sign in.');

  return user;
};

export const getPairingCode = async (environmentId: string) => {
  try {
    const user = await getUserData();
    if (isUserErrorResponse(user)) return user;

    // check that the current user is a member of the space
    await getCurrentEnvironment(environmentId);

    const { id: userId } = user;

    // revoke codes that might have been generated before
    await _revokePairingCodes(userId, environmentId);

    // generate a code
    // using the same method as https://github.com/nextauthjs/cli to generate the code string
    const gen = crypto.getRandomValues(new Uint8Array(32));
    // @ts-expect-error
    const code = Buffer.from(gen, 'base64').toString('base64');
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    const codeHash = await getTokenHash(code);

    await _addPairingCode({ userId, codeHash, expires, environmentId });

    return code;
  } catch (err) {
    return userError('Something went wrong.');
  }
};

export const getPairingInfo = async (code: string) => {
  try {
    const codeHash = await getTokenHash(code);

    const pairingInfo = await _getPairingCodeInfo(codeHash);

    const error = userError('Invalid code.');
    if (!pairingInfo) return error;
    if (pairingInfo.expires.getTime() < Date.now()) {
      await _revokePairingCodes(pairingInfo.userId, pairingInfo.environmentId);
      return error;
    }

    return pairingInfo;
  } catch (err) {
    return userError('Something went wrong.');
  }
};

export const revokePairingCodes = async () => {
  const user = await getUserData();
  if (isUserErrorResponse(user)) return user;

  await _revokePairingCodes(user.id);
};
