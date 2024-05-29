import { setSharedSecret } from '@/app/confluence/sharedSecrets';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const bodyData = await request.json();
  const { clientKey, sharedSecret, baseUrl } = bodyData;

  setSharedSecret(clientKey, sharedSecret, baseUrl);

  return new NextResponse(null, { status: 200, statusText: 'App installed successfully' });
}
