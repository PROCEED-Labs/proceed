import { User as DBUser } from '@/lib/data/user-schema';
import NextAuth from 'next-auth';
import * as nextauth from 'next-auth';
import * as n from 'next-auth/adapters';
import { JWT } from 'next-auth/jwt';

declare module 'next-auth' {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: DBUser;
  }
}

declare module 'next-auth/jwt' {
  /** Returned by the `jwt` callback and `getToken`, when using JWT sessions */
  interface JWT {
    user: DBUser;
  }
}
