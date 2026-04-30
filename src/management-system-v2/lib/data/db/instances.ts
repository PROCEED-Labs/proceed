import db from '@/lib/data/db';
import { InstanceInput, InstanceInputSchema } from '@/lib/deployments-schema';
import { UserFacingError } from '@/lib/user-error';
import { InstanceInfo } from '@proceed/user-task-helper';
import { cacheLife, cacheTag, updateTag } from 'next/cache';

export async function getProcessInstance(instanceId: string) {
  'use cache';
  cacheLife({ stale: 5, revalidate: 10 });
  cacheTag(`instance/${instanceId}`);

  const instanceInfo = await db.processInstance.findUnique({
    where: { id: instanceId },
  });

  return instanceInfo as unknown as
    | null
    | (Omit<NonNullable<typeof instanceInfo>, 'state'> & { state: InstanceInfo });
}

export type StoredInstance = NonNullable<Awaited<ReturnType<typeof getProcessInstance>>>;

export async function addProcessInstance(input: InstanceInput) {
  const deployment = await db.processDeployment.findUnique({
    where: { id: input.deploymentId },
    select: { version: { select: { processId: true } } },
  });

  if (!deployment) {
    throw new UserFacingError('Trying to add an instance for an unknown deployment.');
  }

  const data = InstanceInputSchema.parse(input);

  updateTag(`deployment/process/${deployment.version.processId}`);

  return await db.processInstance.create({ data });
}

export async function updateProcessInstance(instanceId: string, input: Partial<InstanceInput>) {
  const data = InstanceInputSchema.partial().strict().parse(input);

  updateTag(`instance/${instanceId}`);

  return await db.processInstance.update({
    where: { id: instanceId },
    data,
  });
}
