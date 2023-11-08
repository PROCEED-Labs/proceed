import { AuthOptions } from 'next-auth';
import NextAuth from 'next-auth/next';
import Auth0Provider from 'next-auth/providers/auth0';
import { User } from '@/types/next-auth';
import { randomUUID } from 'crypto';
import CredentialsProvider from 'next-auth/providers/credentials';

export const nextAuthOptions: AuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
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
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (trigger === 'signIn') token.csrfToken = randomUUID();
      if (user) token.user = user as User;
      return token;
    },
    session({ session, token }) {
      if (token.user) session.user = token.user;
      session.csrfToken = token.csrfToken;
      return session;
    },
  },
};

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
const handler = NextAuth(nextAuthOptions);

export { handler as GET, handler as POST };
