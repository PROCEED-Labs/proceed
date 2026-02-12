import { nestedParametersFromStorage } from '@/lib/data/db/machine-config';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ configSetId: string; versionId: string; parameterId: string }> },
) {
  // Answer - Success: 200 OK, Body: one parameter of one configuration ({id, key, type, content[], parentId, parameters[], parentType, linkedParameters[]})
  // Answer - Error: 404 Not Found
  try {
    const { configSetId, versionId, parameterId } = await params;
    const config = await nestedParametersFromStorage([parameterId]);
    return NextResponse.json(Object.values(config)[0]);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
}
