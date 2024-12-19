/**
 * When a user authenticates himself, and it is detected, that he was signed in as a guest
 * a link with this token is set as the redirect url, after he signs he will be asked
 * if he wants to transfer the guest processes.
 * The token is necessary, because otherwise you could write any guest user id
 * this is a small attack surface, but it is better to be safe.
 * * */
import { z } from 'zod';
import { env } from './env-vars';
import jwt from 'jsonwebtoken';

const referenceSchema = z.object({ guestId: z.string() });
type Reference = z.infer<typeof referenceSchema>;

export function generateGuestReferenceToken(invitation: Reference, expiration: Date) {
  // in seconds
  const expiresIn = (expiration.getTime() - Date.now()) / 1000;

  return jwt.sign(invitation, env.GUEST_REFERENCE_SECRET, { expiresIn });
}

export function getGuestReference(token: string) {
  try {
    const payload = jwt.verify(token, env.GUEST_REFERENCE_SECRET);
    return referenceSchema.parse(payload);
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError && error.name === 'TokenExpiredError') {
      return { error: 'TokenExpiredError' as const };
    }
    return { error: 'error' as const };
  }
}
