'use server';

import { getCurrentEnvironment } from '@/components/auth';
import { UserError, UserErrorType, UserFacingError, userError } from '../user-error';
import { cacheLife, cacheTag, updateTag } from 'next/cache';

import db from '@/lib/data/db';
import { MapNestedType, Prettify } from '../typescript-utils';
import { InstanceInfo } from '../engines/deployment';
import { InstanceInput, InstanceInputSchema } from '../deployments-schema';

export async function getInstance(spaceId: string, instanceId: string) {
  const { ability } = await getCurrentEnvironment(spaceId);

  if (!ability.can('view', 'Execution'))
    return userError('Invalid Permissions', UserErrorType.PermissionError);

  async function getFromDBOrCache(instanceId: string) {
    'use cache';
    cacheLife({ stale: 5, revalidate: 10 });
    cacheTag(`instance/${instanceId}`);

    const instanceInfo = await db.processInstance.findUnique({
      where: { id: instanceId },
    });

    return instanceInfo as Prettify<
      MapNestedType<NonNullable<typeof instanceInfo>, 'state', InstanceInfo>
    > | null;
  }

  return getFromDBOrCache(instanceId);
}

export type StoredInstance = Exclude<
  NonNullable<Awaited<ReturnType<typeof getInstance>>>,
  { error: UserError }
>;

export async function addInstance(
  spaceId: string,
  instance: InstanceInput,
  skipAbilityCheck = false,
) {
  if (!skipAbilityCheck) {
    const { ability } = await getCurrentEnvironment(spaceId);

    if (!ability.can('create', 'Execution'))
      return userError('Invalid Permissions', UserErrorType.PermissionError);
  }

  const deployment = await db.processDeployment.findUnique({
    where: { id: instance.deploymentId },
    select: { version: { select: { processId: true } } },
  });

  if (!deployment) {
    throw new UserFacingError('Trying to add an instance for an unknown deployment.');
  }

  const data = InstanceInputSchema.parse(instance);

  updateTag(`deployment/process/${deployment.version.processId}`);

  return await db.processInstance.create({ data });
}

export async function updateInstance(
  spaceId: string,
  instanceId: string,
  input: Partial<InstanceInput>,
  skipAbilityCheck = false,
) {
  if (!skipAbilityCheck) {
    const { ability } = await getCurrentEnvironment(spaceId);

    if (!ability.can('create', 'Execution'))
      return userError('Invalid Permissions', UserErrorType.PermissionError);
  }

  const data = InstanceInputSchema.partial().strict().parse(input);

  updateTag(`instance/${instanceId}`);

  return await db.processInstance.update({
    where: { id: instanceId },
    data,
  });
}
