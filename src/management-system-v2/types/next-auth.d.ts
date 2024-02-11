import { User } from '@/lib/data/user-schema';
import NextAuth from 'next-auth';
import { JWT } from 'next-auth/jwt';

export type NextAuthUser = (
  | {
      email: string;
      image?: string;
      firstName: string;
      lastName: string;
      username: string;
      guest: false;
    }
  | { guest: true }
) & {
  id: string;
};

declare module 'next-auth' {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: User;
    csrfToken: string;
  }
}

declare module 'next-auth/jwt' {
  /** Returned by the `jwt` callback and `getToken`, when using JWT sessions */
  interface JWT {
    user: User;
    csrfToken: string;
  }
}
