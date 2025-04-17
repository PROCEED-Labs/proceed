import { AuthOptions, getServerSession } from 'next-auth';
import Auth0Provider from 'next-auth/providers/auth0';
import EmailProvider from 'next-auth/providers/email';
import GoogleProvider from 'next-auth/providers/google';
import DiscordProvider from 'next-auth/providers/discord';
import TwitterProvider from 'next-auth/providers/twitter';
import CredentialsProvider from 'next-auth/providers/credentials';
import { addUser, deleteUser, getUserById, getUserByUsername, updateUser } from '@/lib/data/DTOs';
import { usersMetaObject } from '@/lib/data/legacy/iam/users';
import { CredentialInput, OAuthProviderButtonStyles } from 'next-auth/providers';
import Adapter from './adapter';
import { AuthenticatedUser, User } from '@/lib/data/user-schema';
import { sendEmail } from '@/lib/email/mailer';
import renderSigninLinkEmail from '@/lib/email/signin-link-email';
import { env } from '@/lib/env-vars';
import { enableUseDB } from 'FeatureFlags';
import * as noIamUser from '@/lib/no-iam-user';

const nextAuthOptions: AuthOptions = {
  secret: env.NEXTAUTH_SECRET,
  adapter: Adapter,
  session: {
    strategy: 'jwt',
  },
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
      if (!env.PROCEED_PUBLIC_IAM_ACTIVATE) {
        token.user = noIamUser.user;
        return token;
      }

      let user = _user as User | undefined;

      if (trigger === 'update') user = (await getUserById(token.user.id)) as User;

      if (user) token.user = user;

      return token;
    },
    session({ session, token }) {
      if (token.user) session.user = token.user;
      if (token.csrfToken) session.csrfToken = token.csrfToken;

      return session;
    },
    signIn: async ({ account, user: _user, email }) => {
      const session = await getServerSession(nextAuthOptions);
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

        const user = _user as Partial<AuthenticatedUser>;
        const userSigningIn = await getUserById(_user.id);

        if (!userSigningIn) {
          await updateUser(sessionUser.id, {
            firstName: user.firstName ?? undefined,
            lastName: user.lastName ?? undefined,
            username: user.username ?? undefined,
            profileImage: user.profileImage ?? undefined,
            email: user.email ?? undefined,
            isGuest: false,
          });
        }
      }

      return true;
    },
  },
  events: {
    async signOut({ token }) {
      if (!token.user.isGuest) return;

      const user = await getUserById(token.user.id);
      if (user) {
        if (!user.isGuest) {
          console.warn('User with invalid session');
          return;
        }

        deleteUser(user.id);
      }
    },
  },
  pages: {
    signIn: '/signin',
  },
};

if (env.NODE_ENV === 'production') {
  nextAuthOptions.providers.push(
    Auth0Provider({
      clientId: env.AUTH0_CLIENT_ID,
      clientSecret: env.AUTH0_CLIENT_SECRET,
      issuer: env.AUTH0_ISSUER,
      authorization: {
        params: {
          scope: env.AUTH0_SCOPE,
        },
      },
      profile(profile) {
        return {
          id: profile.sub,
          email: profile.email,
          image: profile.picture,
          firstName: profile.given_name,
          lastName: profile.family_name,
          username: profile.preferred_username,
        };
      },
    }),
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
      version: '2.0',
      profile({ data, email }) {
        const nameParts = data.name.split(' ');
        const fistName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ');

        return {
          email,
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
      profileImage: null,
    },
    {
      username: 'admin',
      firstName: 'Admin',
      lastName: 'Admin',
      email: 'admin@proceed-labs.org',
      id: 'development-id|admin',
      isGuest: false,
      emailVerifiedOn: null,
      profileImage: null,
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
  nextAuthOptions.providers.map((provider) => ({
    id: provider.options?.id ?? provider.id,
    type: provider.type,
    name: provider.options?.name ?? provider.name,
    style: provider.type === 'oauth' ? provider.style : undefined,
    credentials: provider.type === 'credentials' ? provider.options.credentials : undefined,
  })) as ExtractedProvider[];

export default nextAuthOptions;
