import { NextRequest, NextResponse } from 'next/server';
import { signOut } from '@/lib/auth';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

// On errors we shouldn't redirect, as this could cause an infinite redirect loop
export async function GET(request: NextRequest) {
  const csrfToken = request.nextUrl.searchParams.get('csrfToken');
  if (!csrfToken) return NextResponse.json({ error: 'Missing CSRF token' }, { status: 400 });

  // Verify csrf token
  const cookieStore = cookies();
  const csrfCookie = cookieStore.get('proceed.csrf-token');
  const verified = csrfCookie && csrfCookie.value === csrfToken;

  if (!verified) return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 400 });

  await signOut({ redirect: false });
  return redirect('/signin');
}
