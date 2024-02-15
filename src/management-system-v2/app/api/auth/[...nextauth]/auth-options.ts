import { AuthOptions } from 'next-auth';
import Auth0Provider from 'next-auth/providers/auth0';
import CredentialsProvider from 'next-auth/providers/credentials';
import { addUser, usersMetaObject } from '@/lib/data/legacy/iam/users';
import Adapter from './adapter';
import { User } from '@/lib/data/user-schema';

const nextAuthOptions: AuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  adapter: Adapter,
  session: {
    strategy: 'jwt',
  },
  providers: [
    CredentialsProvider({
      name: 'Guest',
      id: 'guest-loguin',
      credentials: {},
      async authorize() {
        return addUser({ guest: true });
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user: _user }) {
      const user = _user as User;

      if (_user) token.user = user;

      return token;
    },
    session({ session, token }) {
      if (token.user) session.user = token.user;

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
          id: profile.sub,
          email: profile.email,
          image: profile.picture,
          firstName: profile.given_name,
          lastName: profile.family_name,
          username: profile.preferred_username,
          guest: false,
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
      email: 'difewe7223@fkcod.com',
      id: 'development-id|johndoe',
      guest: false,
      emailVerified: null,
      image: null,
    },
    {
      username: 'admin',
      firstName: 'Admin',
      lastName: 'Admin',
      email: 'felipe.trost@gmail.com',
      id: 'development-id|admin',
      guest: false,
      emailVerified: null,
      image: null,
    },
  ] satisfies User[];

  nextAuthOptions.providers.push(
    CredentialsProvider({
      name: 'Development Users',
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

export default nextAuthOptions;
