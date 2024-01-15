import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);

  requestHeaders.set('ngrok-skip-browser-warning', 'true');

  const path = request.nextUrl.pathname.split('/proxy/')[1];
  const url = `${process.env.BACKEND}/api/${path}`;

  const response = NextResponse.rewrite(url, {
    headers: requestHeaders,
  });

  return response;
}
export const config = {
  matcher: '/proxy/:path*',
};
