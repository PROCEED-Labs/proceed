'use server';

import db from '@/lib/data/db';
import { DeploymentInput, DeploymentInputSchema } from '../deployment-schema';
import { getCurrentEnvironment } from '@/components/auth';
import { SuccessType, UserErrorType, userError } from '../user-error';
import Ability from '../ability/abilityHelper';

export async function getDeployedProcesses(environmentId: string) {
  const { ability } = await getCurrentEnvironment(environmentId);

  if (!ability.can('view', 'Execution'))
    return userError('Invalid Permissions', UserErrorType.PermissionError);

  const deploymentIsNotDeleted = { AND: [{ removeTime: null }, { toRemove: false }] };

  let deployedProcesses = await db.process.findMany({
    where: {
      // get all processes in the current environment that have at least one version that is
      // currently deployed
      AND: [
        { environmentId },
        { NOT: { folderId: null } },
        {
          versions: {
            some: { deployments: { some: deploymentIsNotDeleted } },
          },
        },
      ],
    },
    select: {
      id: true,
      name: true,
      versions: {
        // only include deployed versions in the output
        where: { deployments: { some: deploymentIsNotDeleted } },
        include: {
          deployments: {
            // only include deployments in the output that are still actively deployed
            where: deploymentIsNotDeleted,
            include: { instances: { select: { id: true } } },
          },
        },
      },
    },
  });

  return ability.filter('view', 'Process', deployedProcesses);
}

export async function getProcessDeployments(
  spaceId: string,
  processId: string,
  ability?: Ability,
  showArchivedProcesses = false,
) {
  if (!ability) ({ ability } = await getCurrentEnvironment(spaceId));

  if (!ability.can('view', 'Execution'))
    return userError('Invalid Permissions', UserErrorType.PermissionError);

  const deployments = await db.processDeployment.findMany({
    where: {
      AND: [
        {
          version: {
            AND: [
              { processId },
              { NOT: !showArchivedProcesses ? { process: { folderId: null } } : undefined },
            ],
          },
        },
        { removeTime: null },
        { toRemove: false },
      ],
    },
    include: {
      version: { select: { id: true, processId: true, name: true } },
      instances: { select: { id: true } },
    },
  });

  return deployments.map((d) => ({
    ...d,
    processId: d.version.processId,
    instances: d.instances.map(({ id }) => id),
  }));
}

export type StoredDeployment = SuccessType<
  Awaited<ReturnType<typeof getProcessDeployments>>
>[number];

export async function addDeployment(spaceId: string, input: DeploymentInput) {
  const { ability } = await getCurrentEnvironment(spaceId);

  if (!ability.can('create', 'Execution'))
    return userError('Invalid Permissions', UserErrorType.PermissionError);

  const data = DeploymentInputSchema.parse(input);

  await db.processDeployment.createMany({
    data: data.engineIds.map((engineId) => ({ ...data, engineIds: undefined, engineId })),
  });
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
