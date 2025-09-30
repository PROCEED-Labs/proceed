import NextAuth, { AuthError, NextAuthConfig } from 'next-auth';
import { JWT } from 'next-auth/jwt';
import { User as ProviderUser } from '@auth/core/types';

import EmailProvider from 'next-auth/providers/nodemailer';
import GoogleProvider from 'next-auth/providers/google';
import DiscordProvider from 'next-auth/providers/discord';
import TwitterProvider from 'next-auth/providers/twitter';
import CredentialsProvider from 'next-auth/providers/credentials';
import * as noIamUser from '@/lib/no-iam-user';
import {
  addUser,
  deleteUser,
  getUserByEmail,
  getUserById,
  getUserByUsername,
  setUserPassword,
  updateUser,
} from '@/lib/data/db/iam/users';
import { CredentialInput, OAuthProviderButtonStyles, Provider } from 'next-auth/providers';
import Adapter from './auth-database-adapter';
import { User } from '@/lib/data/user-schema';
import { sendEmail } from '@/lib/email/mailer';
import renderSigninLinkEmail from '@/lib/email/signin-link-email';
import { env } from '@/lib/ms-config/env-vars';
import { getUserAndPasswordByUsername, updateGuestUserLastSigninTime } from './data/db/iam/users';
import { comparePassword, hashPassword } from './password-hashes';
import db from './data/db';
import { createUserRegistrationToken } from './email-verification-tokens/utils';
import { saveEmailVerificationToken } from './data/db/iam/verification-tokens';
import { NextAuthEmailTakenError, NextAuthUsernameTakenError } from './authjs-error-message';
import { getMSConfig } from './ms-config/ms-config';

const nextAuthOptions: NextAuthConfig = {
  secret: env.NEXTAUTH_SECRET,
  adapter: Adapter,
  session: {
    strategy: 'jwt',
  },
  cookies: {
    csrfToken: {
      name: 'proceed.csrf-token',
    },
    callbackUrl: {
      name: 'proceed.callback-url',
    },
    sessionToken: {
      name: 'proceed.session-token',
    },
  },
  trustHost: true,
  providers: [],
  callbacks: {
    async jwt({ token, user: _user, trigger }) {
      if (!env.PROCEED_PUBLIC_IAM_ACTIVE) {
        token.user = noIamUser.user;
        return token;
      }

      let user = _user as User | undefined;

      if (trigger === 'update') user = (await getUserById(token.user.id)) as User;

      if (user) token.user = user;

      return token;
    },
    session({ session, token }) {
      if (token.user) (session.user as User) = token.user;

      return session;
    },
    signIn: async (params) => {
      const { account, user: _user, email } = params;
      if (account?.provider === 'register-as-new-user' && (_user as any).notARealUser === true) {
        return `/signin?error=${encodeURIComponent('$success Check your email: we sent you a link to sign in with your new user.')}`;
      }

      const session = await auth();
      const sessionUser = session?.user;

      // Guest account signs in with proper auth
      if (
        sessionUser?.isGuest &&
        account?.provider !== 'guest-signin' &&
        !email?.verificationRequest
      ) {
        // Check if the user's cookie is correct
        const sessionUserInDb = await getUserById(sessionUser.id);
        if (!sessionUserInDb || !sessionUserInDb.isGuest) throw new Error('Something went wrong');

        const userSigningIn = _user.id ? await getUserById(_user.id) : null;

        if (!userSigningIn) {
          const user = _user as Partial<ProviderUser>;
          await updateUser(sessionUser.id, {
            firstName: user.firstName ?? undefined,
            lastName: user.lastName ?? undefined,
            username: user.username ?? undefined,
            profileImage: user.image ?? undefined,
            email: user.email ?? undefined,
            isGuest: false,
          });
        }
      }

      return true;
    },
  },
  events: {
    async signOut(message) {
      // since we use jwt message contains a token
      const token = (message as { token: JWT }).token;

      if (!token.user.isGuest) return;

      const user = await getUserById(token.user.id);
      if (user) {
        if (!user.isGuest) {
          console.warn('User with invalid session');
          return;
        }

        await deleteUser(user.id);
      }
    },
    async session({ session }) {
      // TODO: this causes many db calls, we should debounce this with a significant delay
      if (session.user.isGuest) {
        await updateGuestUserLastSigninTime(session.user.id, new Date());
      }
    },
  },
  pages: {
    signIn: '/signin',
    error: '/signin',
  },
  logger: {
    error(error) {
      if (error instanceof AuthError) {
        if (['AdapterError', 'CallbackRouteError', 'OAuthProfileParseError'].includes(error.type)) {
          console.error(error);
        } else {
          console.error('NextAuth error:', error.type);
        }
      } else {
        console.error(error);
      }
    },
  },
};

if (env.PROCEED_PUBLIC_IAM_LOGIN_MAIL_ACTIVE) {
  nextAuthOptions.providers.push(
    EmailProvider({
      id: 'email',
      name: 'Sign in with E-mail',
      server: {},
      sendVerificationRequest(params) {
        const signinMail = renderSigninLinkEmail({
          signInLink: params.url,
          expires: params.expires,
        });

        sendEmail({
          to: params.identifier,
          subject: 'Sign in to PROCEED',
          html: signinMail.html,
          text: signinMail.text,
        });
      },
      maxAge:
        (await getMSConfig({ dontForceDynamicThroughHeaders: true }))
          .EMAIL_SIGNIN_VERIFICATION_TOKEN_EXPIRATION_HOURS *
        60 *
        60,
    }),
  );
}

if (env.PROCEED_PUBLIC_IAM_LOGIN_OAUTH_GOOGLE_ACTIVE) {
  nextAuthOptions.providers.push(
    GoogleProvider({
      id: 'google',
      clientId: env.IAM_LOGIN_OAUTH_GOOGLE_CLIENT_ID,
      clientSecret: env.IAM_LOGIN_OAUTH_GOOGLE_CLIENT_SECRET,
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          firstName: profile.given_name,
          lastName: profile.family_name,
          email: profile.email,
          image: profile.picture,
        };
      },
    }),
  );
}

if (env.PROCEED_PUBLIC_IAM_LOGIN_OAUTH_X_ACTIVE) {
  nextAuthOptions.providers.push(
    TwitterProvider({
      id: 'twitter',
      clientId: env.IAM_LOGIN_OAUTH_X_CLIENT_ID,
      clientSecret: env.IAM_LOGIN_OAUTH_X_CLIENT_SECRET,
      profile({ data, email }) {
        const nameParts = data.name.split(' ');
        const fistName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ');

        return {
          email: typeof email === 'string' ? email : undefined,
          username: data.username,
          id: data.id,
          image: data.profile_image_url,
          firstName: fistName.length > 0 ? fistName : undefined,
          lastName: lastName.length > 0 ? lastName : undefined,
        };
      },
    }),
  );
}

// Guest users can only have a personal space, so it doesn't make sense to have guests when
// personal spaces are deactivated
if (env.PROCEED_PUBLIC_IAM_PERSONAL_SPACES_ACTIVE) {
  nextAuthOptions.providers.push(
    CredentialsProvider({
      name: 'Continue as Guest',
      id: 'guest-signin',
      credentials: {},
      async authorize() {
        return addUser({ isGuest: true });
      },
    }),
  );
}

if (env.NODE_ENV === 'development') {
  const johnDoeTemplate = {
    username: 'johndoe',
    firstName: 'John',
    lastName: 'Doe',
    email: 'johndoe@proceed-labs.org',
    id: 'development-id|johndoe',
    isGuest: false,
    emailVerifiedOn: null,
    profileImage: null,
  };

  nextAuthOptions.providers.push(
    CredentialsProvider({
      id: 'development-users',
      name: 'Continue with Development User',
      credentials: {
        username: {
          label: 'Username',
          type: 'text',
          placeholder: 'johndoe | admin',
          value: 'admin',
        },
      },
      async authorize(credentials) {
        let user: User | null = null;

        if (credentials.username === 'johndoe') {
          user = await getUserByUsername('johndoe');
          if (!user) user = await addUser(johnDoeTemplate);
        } else if (credentials.username === 'admin') {
          user = await getUserByUsername('admin');
        }

        return user;
      },
    }),
  );
}

if (env.PROCEED_PUBLIC_IAM_LOGIN_OAUTH_DISCORD_ACTIVE) {
  nextAuthOptions.providers.push(
    DiscordProvider({
      id: 'discord',
      clientId: env.IAM_LOGIN_OAUTH_DISCORD_CLIENT_ID,
      clientSecret: env.IAM_LOGIN_OAUTH_DISCORD_CLIENT_SECRET,
      profile(profile) {
        const image = profile.avatar
          ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
          : null;

        return { ...profile, image };
      },
    }),
  );
}

if (env.PROCEED_PUBLIC_IAM_LOGIN_USER_PASSWORD_ACTIVE) {
  nextAuthOptions.providers.push(
    CredentialsProvider({
      name: 'Sign in',
      type: 'credentials',
      id: 'username-password-signin',
      credentials: {
        username: {
          label: 'Username',
          type: 'username',
        },
        password: {
          label: 'Password',
          type: 'password',
        },
      },
      authorize: async (credentials, req) => {
        const userAndPassword = await getUserAndPasswordByUsername(credentials.username as string);

        if (!userAndPassword) return null;

        const passwordIsCorrect = await comparePassword(
          credentials.password as string,
          userAndPassword.passwordAccount.password,
        );
        if (!passwordIsCorrect) return null;

        return userAndPassword as User;
      },
    }),
  );
}

if (env.PROCEED_PUBLIC_IAM_LOGIN_USER_PASSWORD_ACTIVE || env.PROCEED_PUBLIC_IAM_LOGIN_MAIL_ACTIVE) {
  //Vorname, Nachname und Username input feldern,
  const credentials: Record<string, CredentialInput> = {
    firstName: {
      type: 'string',
      label: 'First Name',
    },
    lastName: {
      type: 'string',
      label: 'Last Name',
    },
    username: {
      type: 'string',
      label: 'Username',
    },
  };

  if (env.PROCEED_PUBLIC_IAM_LOGIN_MAIL_ACTIVE) {
    credentials['email'] = {
      type: 'email',
      label: 'E-Mail',
    };
  }

  if (env.PROCEED_PUBLIC_IAM_LOGIN_USER_PASSWORD_ACTIVE) {
    credentials['password'] = {
      type: 'password',
      label: 'Password',
    };
  }

  nextAuthOptions.providers.push(
    CredentialsProvider({
      name: 'Register as New User',
      type: 'credentials',
      id: 'register-as-new-user',
      credentials,
      authorize: async (
        credentials: Partial<
          Record<
            'firstName' | 'lastName' | 'username' | 'email' | 'password' | 'callbackUrl',
            string
          >
        >,
      ) => {
        let callbackUrl: string | undefined = undefined;
        // only allow urls that start with / = redirect to out site
        if (credentials.callbackUrl && credentials.callbackUrl.startsWith('/')) {
          callbackUrl = credentials.callbackUrl;
        }

        let user: User | null = null;

        // Whenever the email is active, we create the user after he verifies his email
        if (env.PROCEED_PUBLIC_IAM_LOGIN_MAIL_ACTIVE) {
          const [existingUserUsername, existingUserMail] = await Promise.all([
            getUserByUsername(credentials.username as string),
            getUserByEmail(credentials.email as string),
          ]);
          if (existingUserUsername) {
            throw new NextAuthUsernameTakenError();
          }
          if (existingUserMail) {
            throw new NextAuthEmailTakenError();
          }

          const tokenParams: any = {
            identifier: credentials.email,
            username: credentials.username,
            firstName: credentials.firstName,
            lastName: credentials.lastName,
          };

          if (env.PROCEED_PUBLIC_IAM_LOGIN_USER_PASSWORD_ACTIVE)
            tokenParams['passwordHash'] = await hashPassword(credentials.password as string);

          const userRegistrationToken = await createUserRegistrationToken(tokenParams, callbackUrl);

          await saveEmailVerificationToken(userRegistrationToken.verificationToken);

          const signinMail = renderSigninLinkEmail({
            signInLink: userRegistrationToken.redirectUrl,
            expires: userRegistrationToken.verificationToken.expires,
          });

          await sendEmail({
            to: credentials.email as string,
            subject: 'Sign in to PROCEED',
            html: signinMail.html,
            text: signinMail.text,
          });

          // This allows nextauth to proceed in the signin flow.
          // This dummy user will be caught by the signin callback and will redirect the user back
          // to the signin page with a success message.
          return { id: '', notARealUser: true };
        } else {
          // Only password is enabled -> immediately create user
          await db.$transaction(async (tx) => {
            user = await addUser(
              {
                username: credentials.username,
                firstName: credentials.firstName,
                lastName: credentials.lastName,
                isGuest: false,
                emailVerifiedOn: null,
              },
              tx,
            );

            const hashedPassword = await hashPassword(credentials.password as string);
            await setUserPassword(user.id, hashedPassword, tx);
          });
        }

        return user;
      },
    }),
  );
}

export const { auth, handlers, signIn, signOut } = NextAuth(nextAuthOptions);

export type ExtractedProvider =
  | {
      id: string;
      type: 'email';
      name: string;
    }
  | {
      id: string;
      type: 'oauth';
      name: string;
      style?: OAuthProviderButtonStyles;
    }
  | {
      id: string;
      type: 'credentials';
      name: string;
      credentials: Record<string, CredentialInput>;
    };

// Unfortunately, next-auth's getProviders() function does not return enough information to render the signin page.
// So we need to manually map the providers
// NOTE be careful not to leak any sensitive information
export const getProviders = () =>
  (nextAuthOptions.providers as Exclude<Provider, () => any>[]).map((provider) => ({
    id: provider.options?.id as string,
    type: provider.type as 'email' | 'oauth' | 'credentials',
    name: (provider.options?.name ?? provider.name) as string,
    style: provider.type === 'oauth' ? provider.style : undefined,
    credentials: provider.type === 'credentials' ? provider?.options?.credentials : undefined,
  })) as ExtractedProvider[];
