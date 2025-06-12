import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params: { spaceId } }: { params: { spaceId: string } },
) {
  // Show meta data about a space.
}
