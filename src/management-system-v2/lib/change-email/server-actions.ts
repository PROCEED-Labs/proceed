'use server';

import { z } from 'zod';
import { userError } from '../user-error';
import { createChangeEmailVerificationToken, getTokenHash, notExpired } from './utils';
import { getCurrentUser } from '@/components/auth';
import {
  createVerificationToken,
  getVerificationToken,
  deleteVerificationToken,
} from '@/lib/data/legacy/verification-tokens';
import { updateUser } from '@/lib/data/legacy/iam/users';

export async function requestEmailChange(newEmail: string) {
  try {
    const { session } = await getCurrentUser();
    if (!session || session.user.guest)
      return userError('You must be signed in to change your email');
    const userId = session.user.id;

    const email = z.string().email().parse(newEmail);

    const { verificationToken, redirectUrl } = await createChangeEmailVerificationToken({
      email,
      userId,
    });

    createVerificationToken(verificationToken);

    // TODO: send email
    console.log(redirectUrl);
  } catch (e) {
    if (e instanceof z.ZodError) return userError('Invalid email');

    return userError('Something went wrong');
  }
}

export async function changeEmail(token: string, identifier: string, cancel: boolean = false) {
  const { session, userId } = await getCurrentUser();
  if (!session || session.user.guest)
    return userError('You must be signed in to change your email');

  const tokenParams = { identifier, token: await getTokenHash(token) };
  const verificationToken = getVerificationToken(tokenParams);
  if (
    !verificationToken ||
    !verificationToken.updateEmail ||
    verificationToken.userId !== userId ||
    !(await notExpired(verificationToken))
  )
    return userError('Invalid token');

  if (!cancel) updateUser(userId, { email: verificationToken.identifier });

  deleteVerificationToken(tokenParams);
}
