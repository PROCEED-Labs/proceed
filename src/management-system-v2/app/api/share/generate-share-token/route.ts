import { generateToken, TokenPayload } from '@/lib/utils';
import fs from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';

const TOKENS_DIRECTORY_PATH = path.join(process.cwd(), 'tokens');

export async function POST(request: NextRequest) {
  try {
    const reqBody = await request.json();

    const { registeredUsersOnly, processId } = reqBody;

    const payload: TokenPayload = {
      registeredUsersOnly,
      processId,
    };

    const token = generateToken(payload);

    //This section will be replaced by DB operation ***
    if (!fs.existsSync(TOKENS_DIRECTORY_PATH)) {
      fs.mkdirSync(TOKENS_DIRECTORY_PATH);
    }
    /* TODO: add db operation for generated token */

    const tokenFilePath = path.join(TOKENS_DIRECTORY_PATH, 'generatedToken.txt');
    fs.writeFileSync(tokenFilePath, token);
    //**
    return NextResponse.json({ token }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
