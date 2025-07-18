import 'server-only';

import { z } from 'zod';
import { VerificationToken } from '@/lib/data/db/iam/verification-tokens';
import { env } from '../ms-config/env-vars';

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

  const token = crypto.randomUUID();
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24);

  const verificationToken = {
    token: await getTokenHash(token),
    expires,
    identifier,
    userId,
  } satisfies VerificationToken;

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

export async function notExpired(verificationToken: VerificationToken) {
  if (verificationToken.expires.valueOf() < Date.now()) return false;
  return true;
}
