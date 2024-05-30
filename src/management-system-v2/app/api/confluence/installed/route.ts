import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const bodyData = await request.json();
  const { clientKey, sharedSecret, baseUrl } = bodyData;

  const res = await fetch(
    `https://pr-281---ms-server-staging-c4f6qdpj7q-ew.a.run.app/api/confluence/sharedSecret`,
    {
      method: 'PUT',
      body: JSON.stringify({ clientKey, sharedSecret, baseUrl }),
    },
  );
  console.log('res', res);

  return NextResponse.json({ clientKey, sharedSecret, baseUrl });
}
