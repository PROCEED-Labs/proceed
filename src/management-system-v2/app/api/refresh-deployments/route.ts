import { refetchDeployments } from '@/lib/executions/deployment-server-actions';
import { NextResponse } from 'next/server';

export async function POST() {
  await refetchDeployments();

  return new NextResponse(undefined, { status: 200, statusText: 'Success' });
}
