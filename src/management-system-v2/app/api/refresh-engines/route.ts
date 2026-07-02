import { refetchEngines } from '@/lib/engines/server-actions';
import { NextResponse } from 'next/server';

export async function POST() {
  await refetchEngines();

  return new NextResponse(undefined, { status: 200, statusText: 'Success' });
}
