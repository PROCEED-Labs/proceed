import { NextRequest, NextResponse } from 'next/server';
import { addConfluenceClient } from '@/lib/data/legacy/fileHandling';

export async function POST(request: NextRequest) {
  const bodyData = await request.json();
  const { clientKey, sharedSecret, baseUrl } = bodyData;

  await addConfluenceClient(clientKey, sharedSecret, baseUrl);

  return new NextResponse(null, { status: 201, statusText: 'Created' });
}
