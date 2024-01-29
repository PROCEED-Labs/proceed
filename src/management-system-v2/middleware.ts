import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getCurrentUser } from './components/auth';
import { withAuth } from 'next-auth/middleware';

export default withAuth(
  // `withAuth` augments your `Request` with the user's token.
  function middleware(req) {
    const userId = req.nextauth.token?.user.id;

    if (userId)
      return NextResponse.redirect(new URL(`/${encodeURIComponent(userId)}/processes`, req.url));

    return NextResponse.redirect(new URL('/api/auth/signin', req.url));
  },
);

export const config = { matcher: ['/'] };
