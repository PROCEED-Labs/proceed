import NextAuth, { NextAuthConfig } from 'next-auth';
import { JWT } from 'next-auth/jwt';
import { User as ProviderUser } from '@auth/core/types';

import EmailProvider from 'next-auth/providers/nodemailer';
import GoogleProvider from 'next-auth/providers/google';
import DiscordProvider from 'next-auth/providers/discord';
import TwitterProvider from 'next-auth/providers/twitter';
import CredentialsProvider from 'next-auth/providers/credentials';
import {
  addUser,
  deleteUser,
  getUserById,
  getUserByUsername,
  setUserPassword,
  updateUser,
} from '@/lib/data/db/iam/users';
import { usersMetaObject } from '@/lib/data/legacy/iam/users';
import { CredentialInput, OAuthProviderButtonStyles, Provider } from 'next-auth/providers';
import Adapter from './auth-database-adapter';
import { User } from '@/lib/data/user-schema';
import { sendEmail } from '@/lib/email/mailer';
import renderSigninLinkEmail from '@/lib/email/signin-link-email';
import { env } from '@/lib/env-vars';
import { enableUseDB } from 'FeatureFlags';
import { getUserAndPasswordByUsername, updateGuestUserLastSigninTime } from './data/db/iam/users';
import { comparePassword, hashPassword } from './password-hashes';
import db from './data/db';

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
  providers: [
    CredentialsProvider({
      name: 'Continue as Guest',
      id: 'guest-signin',
      credentials: {},
      async authorize() {
        return addUser({ isGuest: true });
      },
    }),
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
      maxAge: 24 * 60 * 60, // one day
    }),
  ],
  callbacks: {
    async jwt({ token, user: _user, trigger }) {
      let user = _user as User | undefined;

      if (trigger === 'update') user = (await getUserById(token.user.id)) as User;

      if (user) token.user = user;

      return token;
    },
    session({ session, token }) {
      if (token.user) (session.user as User) = token.user;

      return session;
    },
    signIn: async ({ account, user: _user, email }) => {
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
            image: user.image ?? undefined,
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
  },
};

if (env.NODE_ENV === 'production') {
  nextAuthOptions.providers.push(
    GoogleProvider({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
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
    DiscordProvider({
      clientId: env.DISCORD_CLIENT_ID,
      clientSecret: env.DISCORD_CLIENT_SECRET,
      profile(profile) {
        const image = profile.avatar
          ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
          : null;

        return { ...profile, image };
      },
    }),
    TwitterProvider({
      clientId: env.TWITTER_CLIENT_ID,
      clientSecret: env.TWITTER_CLIENT_SECRET,
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

if (env.NODE_ENV === 'development') {
  const developmentUsers = [
    {
      username: 'johndoe',
      firstName: 'John',
      lastName: 'Doe',
      email: 'johndoe@proceed-labs.org',
      id: 'development-id|johndoe',
      isGuest: false,
      emailVerifiedOn: null,
      image: null,
    },
    {
      username: 'admin',
      firstName: 'Admin',
      lastName: 'Admin',
      email: 'admin@proceed-labs.org',
      id: 'development-id|admin',
      isGuest: false,
      emailVerifiedOn: null,
      image: null,
    },
  ] satisfies User[];

  nextAuthOptions.providers.push(
    CredentialsProvider({
      id: 'development-users',
      name: 'Continue with Development User',
      credentials: {
        username: { label: 'Username', type: 'text', placeholder: 'johndoe | admin' },
      },
      async authorize(credentials) {
        if (enableUseDB) {
          const userTemplate = developmentUsers.find(
            (user) => user.username === credentials?.username,
          );

          if (!userTemplate) return null;

          let user = await getUserByUsername(userTemplate.username);
          if (!user) user = await addUser(userTemplate);

          return user;
        }
        const userTemplate = developmentUsers.find(
          (user) => user.username === credentials?.username,
        );

        if (!userTemplate) return null;

        let user = usersMetaObject[userTemplate.id];

        if (!user) user = await addUser(userTemplate);

        return user;
      },
    }),
  );
}

if (env.ENABLE_PASSWORD_SIGNIN) {
  nextAuthOptions.providers.push(
    CredentialsProvider({
      name: 'Sign in',
      type: 'credentials',
      id: 'email-password-signin',
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
      authorize: async (credentials) => {
        const userAndPassword = await getUserAndPasswordByUsername(credentials.username as string);

        if (
          !userAndPassword ||
          !(await comparePassword(
            credentials.password as string,
            userAndPassword.passwordAccount.password,
          ))
        )
          return null;

        return userAndPassword as User;
      },
    }),
    CredentialsProvider({
      name: 'Sign Up',
      type: 'credentials',
      id: 'email-password-signup',
      credentials: {
        username: {
          type: 'string',
          label: 'Username',
        },
        password: {
          type: 'password',
          label: 'Password',
        },
      },
      authorize: async (credentials) => {
        let user: User | null = null;

        await db.$transaction(async (tx) => {
          user = await addUser(
            {
              username: credentials.username as string,
              isGuest: false,
              emailVerifiedOn: null,
            },
            tx,
          );

          const hashedPassword = await hashPassword(credentials.password as string);
          await setUserPassword(user.id, hashedPassword, tx);
        });

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
