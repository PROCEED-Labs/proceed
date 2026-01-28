'use server';
import { z } from 'zod';
import { createChangeEmailVerificationToken, getTokenHash, notExpired } from './utils';
import { getCurrentUser } from '@/components/auth';
import {
  saveEmailVerificationToken,
  getEmailVerificationToken,
  deleteEmailVerificationToken,
} from '@/lib/data/db/iam/verification-tokens';
import { updateUser } from '@/lib/data/db/iam/users';
import { sendEmail } from '../email/mailer';
import renderSigninLinkEmail from '../email/signin-link-email';
import { getErrorMessage, userError } from '../server-error-handling/user-error';

export async function requestEmailChange(newEmail: string) {
  try {
    const currentUser = await getCurrentUser();
    if (currentUser.isErr()) {
      return userError(getErrorMessage(currentUser.error));
    }
    const { session } = currentUser.value;

    if (!session || session.user.isGuest)
      return userError('You must be signed in to change your email');
    const userId = session.user.id;

    const email = z.string().email().parse(newEmail);

    const { verificationToken, redirectUrl } = await createChangeEmailVerificationToken({
      email,
      userId,
    });

    await saveEmailVerificationToken(verificationToken);

    const signinMail = renderSigninLinkEmail({
      signInLink: redirectUrl,
      expires: verificationToken.expires,
      headerText: 'Change your email address',
      description:
        'Hi, you have requested to change the email address associated with your PROCEED account. Please click the link below to confirm this change:',
      footerText:
        'If you did not request this email change, you can ignore this email. Your account remains secure and can only be accessed with your original email address. The PROCEED Crew',
      linkText: 'Change my email address',
    });

    await sendEmail({
      to: email,
      subject: 'PROCEED: Change your email address',
      html: signinMail.html,
      text: signinMail.text,
    });
  } catch (e) {
    if (e instanceof z.ZodError) return userError('Invalid email');

    return userError('Something went wrong');
  }
}

export async function changeEmail(token: string, identifier: string, cancel: boolean = false) {
  const currentUser = await getCurrentUser();
  if (currentUser.isErr()) {
    return currentUser;
  }
  const { session, userId } = currentUser.value;
  if (!session || session.user.isGuest)
    return userError('You must be signed in to change your email');

  const tokenParams = { identifier, token: await getTokenHash(token) };
  const verificationToken = await getEmailVerificationToken(tokenParams);
  if (verificationToken.isErr()) {
    return userError(getErrorMessage(verificationToken.error));
  }

  if (
    !verificationToken.value ||
    verificationToken.value.type !== 'change_email' ||
    verificationToken.value.userId !== userId ||
    !(await notExpired(verificationToken.value))
  )
    return userError('Invalid token');

  if (!cancel) updateUser(userId, { email: verificationToken.value.identifier, isGuest: false });

  const deleteResult = await deleteEmailVerificationToken(tokenParams);
  if (deleteResult.isErr()) {
    return userError(getErrorMessage(deleteResult.error));
  }
}
