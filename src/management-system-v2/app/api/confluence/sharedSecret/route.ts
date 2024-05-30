import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const secretsFilePath = path.join(process.cwd(), 'app/api/confluence/sharedSecret/secretFile.json');

const setSharedSecret = (clientKey: any, sharedSecret: any, baseUrl: any) => {
  const sharedSecrets = JSON.parse(fs.readFileSync(secretsFilePath, 'utf-8'));
  sharedSecrets[`${clientKey}`] = { sharedSecret, baseUrl };
  fs.writeFileSync(secretsFilePath, JSON.stringify(sharedSecrets, null, 2));
};

export async function GET(request: NextRequest) {
  const sharedSecrets = JSON.parse(fs.readFileSync(secretsFilePath, 'utf-8'));
  return NextResponse.json({ sharedSecrets });
}

export async function PUT(request: NextRequest) {
  console.log('PUT sharedsecret');
  const bodyData = await request.json();
  const { clientKey, sharedSecret, baseUrl } = bodyData;

  setSharedSecret(clientKey, sharedSecret, baseUrl);

  return NextResponse.json({ clientKey, sharedSecret, baseUrl });
}
