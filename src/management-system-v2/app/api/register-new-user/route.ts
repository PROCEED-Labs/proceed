import { redirect } from 'next/navigation';
import {
  getEmailVerificationToken,
  updateEmailVerificationTokenExpiration,
} from '@/lib/data/db/iam/verification-tokens';
import db from '@/lib/data/db';
import { addUser, setUserPassword } from '@/lib/data/db/iam/users';
import { getTokenHash, notExpired } from '@/lib/email-verification-tokens/utils';
import { env } from '@/lib/ms-config/env-vars';
import { getErrorMessage } from '@/lib/server-error-handling/user-error';

// TODO: maybe add PRETTIER error handling

export const GET = async (req: Request) => {
  let redirectUrl: string;
  try {
    const { searchParams } = new URL(req.url);

    // Get and verify token
    const token = searchParams.get('token');
    const identifier = searchParams.get('email');
    if (!token || !identifier) return Response.json({ message: 'Bad request' }, { status: 400 });

    const tokenHash = await getTokenHash(token);

    const _verificationToken = await getEmailVerificationToken({ token: tokenHash, identifier });
    if (_verificationToken.isErr()) throw _verificationToken.error;
    if (!_verificationToken.value)
      return Response.json({ message: 'Bad request' }, { status: 400 });
    const verificationToken = _verificationToken.value!;

    if (verificationToken?.type !== 'register_new_user')
      return Response.json({ message: 'Bad request' }, { status: 400 });

    if (!notExpired(verificationToken))
      return Response.json({ message: 'Token expired' }, { status: 400 });

    // Create user
    await db.$transaction(async (tx) => {
      const user = await addUser(
        {
          isGuest: false,
          email: verificationToken.identifier,
          emailVerifiedOn: new Date(),
          username: verificationToken.username,
          firstName: verificationToken.firstName,
          lastName: verificationToken.lastName,
        },
        tx,
      );
      if (user.isErr()) throw user.error;

      if (verificationToken.passwordHash) {
        const setPassword = await setUserPassword(
          user.value.id,
          verificationToken.passwordHash,
          tx,
        );
        if (setPassword.isErr()) throw setPassword.error;
      }

      // We can't delete the token yet, because we need it to exist in the db for the redirect to
      // nextAuth's email flow. We set the expiration to 5 minutes in the future, so that it can't
      // be used again.
      // Still, if it's used again, it probably won't work, because of the unique constraints on
      // username & email, and if the user manages to use it again, nothing bad will happen, the
      // user will just have 2 or more users in the db.

      const updateToken = await updateEmailVerificationTokenExpiration(
        { token: tokenHash, identifier },
        new Date(Date.now() + 5 * 60 * 1000),
        tx,
      );
      if (updateToken.isErr()) throw updateToken.error;
    });

    // The user is already created, now we redirect to nextAuth, so that it can set the cookies
    // appropriately.

    // NOTE: if the id of the email provider is changed, it also has to be changed in the
    // signinUrl
    const nextAuthEmailRedirect = new URL('/api/auth/callback/email', env.NEXTAUTH_URL!);
    nextAuthEmailRedirect.searchParams.set('token', token);
    nextAuthEmailRedirect.searchParams.set('email', identifier);
    nextAuthEmailRedirect.searchParams.set(
      'callbackUrl',
      searchParams.get('callbackUrl') ?? env.NEXTAUTH_URL!,
    );

    redirectUrl = nextAuthEmailRedirect.toString();
  } catch (e) {
    console.error(e);
    return Response.json({ message: getErrorMessage(e) }, { status: 500 });
  }

  redirect(redirectUrl);
};
