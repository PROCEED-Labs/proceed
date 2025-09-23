import { NextRequest, NextResponse } from 'next/server';
import { getMSConfig } from '@/lib/ms-config/ms-config';
import { allSchedulerTasks } from '@/lib/scheduler';

export async function POST(request: NextRequest, { params }: { params: { task: string } }) {
  if (params.task !== 'all') {
    return new Response('Not implemented', {
      status: 501,
    });
  }

  try {
    const msConfig = await getMSConfig();

    // Extract and validate the Bearer token
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Missing Bearer token' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '').trim();
    if (token !== msConfig.SCHEDULER_TOKEN) {
      return NextResponse.json({ error: 'Unauthorized: Invalid Bearer token' }, { status: 403 });
    }

    const message = allSchedulerTasks();

    return NextResponse.json({ message }, { status: 200 });
  } catch (error) {
    console.error('Error cleaning up DB:', error);
    return NextResponse.json({ error: 'Failed to clean up DB' }, { status: 500 });
  }
}
