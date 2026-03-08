import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ spaceId: string; userId: string; dataObjectId: string }> },
) {
  const { spaceId, userId, dataObjectId } = await props.params;
  return NextResponse.json('Success.');
}

export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ spaceId: string; userId: string; dataObjectId: string }> },
) {
  const { spaceId, userId, dataObjectId } = await props.params;
  try {
    const rawBody = await request.text();
    const schema = z
      .string()
      .refine((s) => !/[^\x20-\x7E\t\n\r]/.test(s), { message: 'Binary data detected' });
    const body = schema.parse(rawBody);
    return NextResponse.json('Success.');
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }
}
