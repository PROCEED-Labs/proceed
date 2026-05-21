'use server';

import db from '@/lib/data/db';
import { DeploymentInput, DeploymentInputSchema } from '../deployment-schema';
import { getCurrentEnvironment } from '@/components/auth';
import { UserErrorType, userError } from '../user-error';

export async function getProcessDeployments(spaceId: string, processId: string) {
  const { ability } = await getCurrentEnvironment(spaceId);

  if (!ability.can('view', 'Execution'))
    return userError('Invalid Permissions', UserErrorType.PermissionError);

  const deployments = await db.processDeployment.findMany({
    where: { AND: [{ version: { processId } }, { removeTime: null }] },
    include: { version: { select: { processId: true } } },
  });

  return deployments.map((d) => ({ ...d, version: undefined, processId: d.version.processId }));
}

export async function addDeployment(spaceId: string, input: DeploymentInput) {
  const { ability } = await getCurrentEnvironment(spaceId);

  if (!ability.can('create', 'Execution'))
    return userError('Invalid Permissions', UserErrorType.PermissionError);

  const data = DeploymentInputSchema.parse(input);

  const result = await db.processDeployment.createMany({
    data: data.engineIds.map((engineId) => ({ ...data, engineIds: undefined, engineId })),
  });

  return result;
}

export async function updateDeployment(
  spaceId: string,
  deploymentId: string,
  input: Partial<DeploymentInput>,
) {
  const { ability } = await getCurrentEnvironment(spaceId);

  if (!ability.can('update', 'Execution')) {
    return userError('Invalid Permissions', UserErrorType.PermissionError);
  }

  const data = DeploymentInputSchema.partial().strict().parse(input);

  const result = await db.processDeployment.update({
    where: { id: deploymentId },
    data,
  });

  return result;
}
