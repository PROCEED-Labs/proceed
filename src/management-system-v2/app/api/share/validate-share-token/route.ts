import { NextRequest, NextResponse } from 'next/server';

import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { TokenPayload } from '@/lib/utils';
import { getProcess } from '@/lib/data/legacy/_process';

const TOKENS_DIRECTORY_PATH = path.join(process.cwd(), 'tokens');

export async function POST(request: NextRequest) {
  try {
    const reqBody = await request.json();
    const { token } = reqBody;

    const tokenFilePath = path.join(TOKENS_DIRECTORY_PATH, 'generatedToken.txt');
    const storedToken = fs.readFileSync(tokenFilePath, 'utf-8').trim();

    if (token !== storedToken) {
      return NextResponse.json({ error: 'Unauthorized - Invalid Token' }, { status: 401 });
    }

    const key = process.env.JWT_KEY;
    const decodedToken = jwt.verify(token, key!) as TokenPayload;

    const { registeredUsersOnly, processId } = decodedToken;

    if (processId) {
      const process = await getProcess(processId, true);
      return NextResponse.json(
        { process: process, registeredUsersOnly: registeredUsersOnly },
        { status: 200 },
      );
    } else {
      return NextResponse.json({ error: 'Forbidden - Insufficeint Permission' }, { status: 403 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
