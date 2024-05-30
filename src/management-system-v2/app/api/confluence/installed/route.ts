import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

const secretsFilePath = path.join(process.cwd(), 'app/api/confluence/sharedSecret/secretFile.json');

const setSharedSecret = (clientKey: any, sharedSecret: any, baseUrl: any) => {
  const sharedSecrets = JSON.parse(fs.readFileSync(secretsFilePath, 'utf-8'));
  sharedSecrets[`${clientKey}`] = { sharedSecret, baseUrl };
  fs.writeFileSync(secretsFilePath, JSON.stringify(sharedSecrets, null, 2));
};

export async function POST(request: NextRequest) {
  const bodyData = await request.json();
  const { clientKey, sharedSecret, baseUrl } = bodyData;

  setSharedSecret(
    clientKey || 'DIDNOTWORK-KEY',
    sharedSecret || 'DIDNOTWORK-SECRET',
    baseUrl || 'DIDNOTWORK-BASEURL',
  );

  return NextResponse.json({ clientKey, sharedSecret, baseUrl });
}
