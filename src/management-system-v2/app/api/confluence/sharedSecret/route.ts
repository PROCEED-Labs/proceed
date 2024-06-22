import { NextRequest, NextResponse } from 'next/server';
import { getSharedSecret, saveSharedSecret } from '@/lib/data/legacy/fileHandling';

export async function GET(request: NextRequest) {
  const sharedSecrets = await getSharedSecret();
  return NextResponse.json({ sharedSecrets });
}

export async function POST(request: NextRequest) {
  const bodyData = await request.json();
  const { clientKey, sharedSecret, baseUrl } = bodyData;

  await saveSharedSecret(clientKey, sharedSecret, baseUrl);

  return NextResponse.json({ clientKey, sharedSecret, baseUrl });
}
