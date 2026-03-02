import { getUserConfig } from '@/lib/data/db/machine-config';
import {
  ParameterZod,
  Parameter,
  VirtualParameter,
  StoredParameterZod,
} from '@/lib/data/machine-config-schema';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { validate as uuidValidate } from 'uuid';
import { parameterToProp } from '@/app/(dashboard)/[environmentId]/machine-config/configuration-helper';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ spaceId: string; userId: string; dataPath: string }> },
) {
  try {
    const { spaceId, userId, dataPath } = await params;
    const userData = getUserConfig(userId, spaceId);

    return NextResponse.json(userData, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
}
