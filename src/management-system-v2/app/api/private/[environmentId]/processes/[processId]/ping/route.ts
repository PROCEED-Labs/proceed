import { getCurrentEnvironment, getCurrentUser } from '@/components/auth';
import { toCaslResource } from '@/lib/ability/caslAbility';
import { getProcessMetaObjects } from '@/lib/data/legacy/_process';
import { updateProcessMetaData } from '@/lib/data/processes';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  {
    params: { environmentId, processId },
  }: { params: { environmentId: string; processId: string } },
) {
  const { ability } = await getCurrentEnvironment(environmentId);
  const { userId } = await getCurrentUser();

  const processMetaObjects: any = getProcessMetaObjects();
  const process = processMetaObjects[processId];

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
    inEditingBy: [{ userId, lastPing: Date.now() }],
  });

  return NextResponse.json({ success: true });
}
