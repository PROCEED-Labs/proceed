import 'server-only';

import { z } from 'zod';
import { EmailVerificationToken } from '@/lib/data/db/iam/verification-tokens';
import { env } from '@/lib/ms-config/env-vars';
import { getMSConfig } from '../ms-config/ms-config';

const MS_IN_HOUR = 1000 * 60 * 60;

async function createHash(message: string) {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  return hashHex;
}

export function getTokenHash(token: string) {
  return createHash(`${token}${env.NEXTAUTH_SECRET}`);
}

export async function createChangeEmailVerificationToken({
  email,
  userId,
}: {
  email: string;
  userId: string;
}) {
  const identifier = z.string().email().parse(email);

  const msConfig = await getMSConfig();

  const token = crypto.randomUUID();
  const expires = new Date(
    Date.now() + MS_IN_HOUR * msConfig.SCHEDULING_TASK_EXPIRATION_TIME_EMAIL_CHANGE_TOKENS,
  );

  const verificationToken = {
    type: 'change_email',
    token: await getTokenHash(token),
    expires,
    identifier,
    userId,
  } satisfies EmailVerificationToken;

  const redirectUrl = new URL(
    '/change-email?' +
      new URLSearchParams({
        token,
        email: identifier,
      }),
    process.env.NEXTAUTH_URL ?? 'http://localhost:3000',
  ).toString();

  return { verificationToken, redirectUrl };
}

export async function createUserRegistrationToken(
  {
    identifier,
    username,
    firstName,
    lastName,
    passwordHash,
  }: {
    identifier: string;
    username: string;
    firstName: string;
    lastName: string;
    passwordHash?: string;
  },
  callbackUrl?: string,
) {
  const msConfig = await getMSConfig();

  const token = crypto.randomUUID();
  const expires = new Date(
    Date.now() + MS_IN_HOUR * msConfig.SCHEDULING_TASK_EXPIRATION_TIME_EMAIL_REGISTRATION_TOKENS,
  );

  const verificationToken = {
    type: 'register_new_user',
    token: await getTokenHash(token),
    expires,
    identifier,
    username,
    firstName,
    lastName,
    passwordHash,
  } satisfies EmailVerificationToken;

  const redirectUrl = new URL(`/api/register-new-user`, env.NEXTAUTH_URL);
  redirectUrl.searchParams.set('token', token);
  redirectUrl.searchParams.set('email', identifier);
  if (callbackUrl) {
    redirectUrl.searchParams.set('callbackUrl', callbackUrl);
  }

  return { verificationToken, redirectUrl: redirectUrl.toString() };
}

export async function notExpired(verificationToken: { expires: Date }) {
  if (verificationToken.expires.valueOf() < Date.now()) return false;
  return true;
}
