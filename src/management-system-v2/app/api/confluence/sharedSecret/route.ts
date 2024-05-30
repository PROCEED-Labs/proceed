import { NextRequest, NextResponse } from 'next/server';

let sharedSecrets: { [key: string]: { sharedSecret: any; baseUrl: any } } = {}; // Variable zum Speichern der sharedSecrets

export const setSharedSecret = (clientKey: any, sharedSecret: any, baseUrl: any) => {
  sharedSecrets[`${clientKey}`] = { sharedSecret, baseUrl };
};

export const getSharedSecret = (clientKey: string) => {
  return sharedSecrets[clientKey];
};

export const getAllSharedSecrets = () => {
  return { ...sharedSecrets };
};

export default async function handler(request: NextRequest) {
  if (request.method === 'GET') {
    return NextResponse.json({ sharedSecrets });
  }

  if (request.method === 'PUT') {
    const bodyData = await request.json();
    const { clientKey, sharedSecret, baseUrl } = bodyData;

    setSharedSecret(clientKey, sharedSecret, baseUrl);

    return NextResponse.json({ clientKey, sharedSecret, baseUrl });
  }
}
