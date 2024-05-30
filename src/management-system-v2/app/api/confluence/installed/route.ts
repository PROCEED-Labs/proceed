import { NextRequest, NextResponse } from 'next/server';
import { setSharedSecret } from '../sharedSecret/route';

export async function POST(request: NextRequest) {
  const bodyData = await request.json();
  const { clientKey, sharedSecret, baseUrl } = bodyData;

  setSharedSecret(clientKey, sharedSecret, baseUrl);

  return NextResponse.json({ clientKey, sharedSecret, baseUrl });
}
