'use server';

import db from '@/lib/data/db';

import { getCurrentEnvironment } from '@/components/auth';
import { InstanceInput, InstanceInputSchema } from '../instance-schema';
import { UserErrorType, userError } from '../user-error';
import { InstanceInfo } from '../engines/deployment';
import Ability from '../ability/abilityHelper';

export async function getInstance(spaceId: string, instanceId: string, ability?: Ability) {
  if (!ability) ({ ability } = await getCurrentEnvironment(spaceId));

  if (!ability.can('view', 'Execution'))
    return userError('Invalid Permissions', UserErrorType.PermissionError);

  const instanceInfo = await db.processInstance.findUnique({
    where: { id: instanceId },
  });

  if (!instanceInfo) return null;

  return instanceInfo as Omit<typeof instanceInfo, 'state'> & { state: InstanceInfo };
}

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

  const data = InstanceInputSchema.parse(instance);

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

  return await db.processInstance.update({
    where: { id: instanceId },
    data,
  });
}
