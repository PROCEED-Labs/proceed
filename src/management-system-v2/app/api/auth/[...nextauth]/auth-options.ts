import { AuthOptions } from 'next-auth';
import { User } from '@/types/next-auth';
import { randomUUID } from 'crypto';

export const nextAuthOptions: AuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (trigger === 'signIn') token.csrfToken = randomUUID();
      if (user) token.user = user as User;
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
