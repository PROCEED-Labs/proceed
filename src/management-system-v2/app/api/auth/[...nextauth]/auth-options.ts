import { AuthOptions } from 'next-auth';
import { User } from '@/types/next-auth';
import { randomUUID } from 'crypto';
import Auth0Provider from 'next-auth/providers/auth0';
import CredentialsProvider from 'next-auth/providers/credentials';
import { addUser, usersMetaObject } from '@/lib/data/legacy/iam/users';

const nextAuthOptions: AuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [],
  callbacks: {
    async jwt({ token, user: _user, trigger, account }) {
      if (trigger === 'signIn') token.csrfToken = randomUUID();

      if (_user) {
        token.user = { ..._user } as User;
        const provider = account?.provider ?? 'none';
        const nameSpacedId = `${provider}:${_user.id}`;
        token.user.id = nameSpacedId;
      }

      const user = token.user;

      if (trigger === 'signUp' || trigger === 'signIn') {
        if (!usersMetaObject[user.id])
          addUser({
            id: user.id,
            oauthProvider: account?.provider ?? 'none',
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            image: user.image ?? '',
          });
      }

      return token;
    },
    session(args) {
      const { session, token } = args;
      if (token.user) session.user = token.user;
      session.csrfToken = token.csrfToken;
      return session;
    },
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
          id: `auth0:${profile.sub}`,
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
    },
    {
      username: 'admin',
      firstName: 'Admin',
      lastName: 'Admin',
      email: 'admin@proceed-labs.org',
      id: 'development-id|admin',
    },
  ];

  nextAuthOptions.providers.push(
    CredentialsProvider({
      name: 'Development Users',
      credentials: {
        username: { label: 'Username', type: 'text', placeholder: 'johndoe | admin' },
      },
      async authorize(credentials) {
        const user = developmentUsers.find((user) => user.username === credentials?.username);

        return user || null;
      },
    }),
  );
}

export default nextAuthOptions;
