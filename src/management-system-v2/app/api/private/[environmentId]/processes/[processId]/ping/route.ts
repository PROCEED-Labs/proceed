import { getCurrentEnvironment, getCurrentUser } from '@/components/auth';
import { toCaslResource } from '@/lib/ability/caslAbility';
import { getProcess, updateProcessMetaData } from '@/lib/data/processes';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ environmentId: string; processId: string }> },
) {
  const { environmentId, processId } = await params;
  const { ability } = await getCurrentEnvironment(environmentId);
  const { userId } = await getCurrentUser();

  const process = await getProcess(processId, environmentId);

  if (!process) {
    return new NextResponse(null, {
      status: 404,
      statusText: 'Process with this id does not exist.',
    });
  }

  if (!ability.can('update', toCaslResource('Process', process))) {
    return new NextResponse(null, {
      status: 403,
      statusText: 'Not allowed to update this process',
    });
  }

  updateProcessMetaData(processId, environmentId, {
    inEditingBy: [{ userId, timestamp: Date.now() }],
  });

  return NextResponse.json({ success: true });
}
