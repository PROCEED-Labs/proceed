import { AuthOptions, getServerSession } from 'next-auth';
import Auth0Provider from 'next-auth/providers/auth0';
import EmailProvider from 'next-auth/providers/email';
import CredentialsProvider from 'next-auth/providers/credentials';
import { addUser, getUserById, updateUser, usersMetaObject } from '@/lib/data/legacy/iam/users';
import { CredentialInput, OAuthProviderButtonStyles } from 'next-auth/providers';
import Adapter from './adapter';
import { AuthenticatedUser, User } from '@/lib/data/user-schema';
import { sendEmail } from '@/lib/email/mailer';
import { randomUUID } from 'crypto';

const nextAuthOptions: AuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  adapter: Adapter,
  session: {
    strategy: 'jwt',
  },
  providers: [
    CredentialsProvider({
      name: 'Continue as a Guest',
      id: 'guest-loguin',
      credentials: {},
      async authorize() {
        return addUser({ guest: true });
      },
    }),
    EmailProvider({
      sendVerificationRequest(params) {
        sendEmail({
          to: params.identifier,
          body: params.url,
          subject: 'Sign in',
        });
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user: _user, trigger }) {
      if (trigger === 'signIn') token.csrfToken = randomUUID();

      const user = _user as User;

      if (_user) token.user = user;

      return token;
    },
    session(args) {
      const { session, token } = args;
      if (token.user) session.user = token.user;
      if (token.csrfToken) session.csrfToken = token.csrfToken;

      return session;
    },
    signIn: async ({ account, user: _user }) => {
      const session = await getServerSession(nextAuthOptions);
      const sessionUser = session?.user;

      if (sessionUser?.guest && account?.provider !== 'guest-loguin') {
        const user = _user as Partial<AuthenticatedUser>;
        const guestUser = getUserById(sessionUser.id);

        if (guestUser.guest) {
          updateUser(guestUser.id, {
            firstName: user.firstName ?? undefined,
            lastName: user.lastName ?? undefined,
            username: user.username ?? undefined,
            image: user.image ?? undefined,
            email: user.email ?? undefined,
            guest: false,
          });
        }
      }

      return true;
    },
  },
  pages: {
    signIn: '/signin',
  },
};

if (process.env.USE_AUTH0) {
  nextAuthOptions.providers.push(
    Auth0Provider({
      clientId: process.env.AUTH0_CLIENT_ID as string,
      clientSecret: process.env.AUTH0_CLIENT_SECRET as string,
      issuer: process.env.AUTH0_ISSUER,
      authorization: {
        params: {
          scope: process.env.AUTH0_SCOPE,
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
  );
}

if (process.env.NODE_ENV === 'development') {
  const developmentUsers = [
    {
      username: 'johndoe',
      firstName: 'John',
      lastName: 'Doe',
      email: 'johndoe@proceed-labs.org',
      id: 'development-id|johndoe',
      guest: false,
      emailVerified: null,
      image: null,
    },
    {
      username: 'admin',
      firstName: 'Admin',
      lastName: 'Admin',
      email: 'admin@proceed-labs.org',
      id: 'development-id|admin',
      guest: false,
      emailVerified: null,
      image: null,
    },
  ] satisfies User[];

  nextAuthOptions.providers.push(
    CredentialsProvider({
      name: 'Continue with Development Users',
      credentials: {
        username: { label: 'Username', type: 'text', placeholder: 'johndoe | admin' },
      },
      async authorize(credentials) {
        const userTemplate = developmentUsers.find(
          (user) => user.username === credentials?.username,
        );

        if (!userTemplate) return null;

        let user = usersMetaObject[userTemplate.id];

        if (!user) user = addUser(userTemplate);

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

// Unfortunatly, next-auth's getProviders() function does not return enough information to render the login page.
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
