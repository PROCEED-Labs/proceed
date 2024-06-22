import { NextRequest, NextResponse } from 'next/server';
import { saveSharedSecret } from '@/lib/data/legacy/fileHandling';

export async function POST(request: NextRequest) {
  const bodyData = await request.json();
  const { clientKey, sharedSecret, baseUrl } = bodyData;

  await saveSharedSecret(
    clientKey || 'DIDNOTWORK-KEY',
    sharedSecret || 'DIDNOTWORK-SECRET',
    baseUrl || 'DIDNOTWORK-BASEURL',
  );

  return NextResponse.json({ clientKey, sharedSecret, baseUrl });
}
