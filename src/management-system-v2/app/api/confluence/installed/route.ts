import { NextRequest, NextResponse } from 'next/server';
const confluenceStore = { clientKey: '', sharedSecret: '', baseUrl: '' };

export async function POST(request: NextRequest) {
  const bodyData = await request.json();
  const { clientKey, sharedSecret, baseUrl } = bodyData;
  confluenceStore.clientKey = clientKey;
  confluenceStore.sharedSecret = sharedSecret;
  confluenceStore.baseUrl = baseUrl;

  return new NextResponse(null, { status: 200, statusText: 'App installed successfully' });
}
