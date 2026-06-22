'use server';

import db from '@/lib/data/db';
import { DeploymentInput, DeploymentInputSchema } from '../deployment-schema';
import { getCurrentEnvironment } from '@/components/auth';
import { SuccessType, UserErrorType, userError } from '../user-error';
import Ability from '../ability/abilityHelper';
import { cacheLife, cacheTag, revalidateTag } from 'next/cache';

export async function getDeployedProcesses(environmentId: string) {
  const { ability } = await getCurrentEnvironment(environmentId);

  if (!ability.can('view', 'Execution'))
    return userError('Invalid Permissions', UserErrorType.PermissionError);

  async function getFromDBOrCache(environmentId: string) {
    'use cache';
    cacheLife({ revalidate: 10, expire: 15 });
    cacheTag(`space/${environmentId}/deployments`);
    const deploymentIsNotDeleted = { AND: [{ removeTime: null }, { toRemove: false }] };

    return await db.process.findMany({
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
  }

  return ability.filter('view', 'Process', await getFromDBOrCache(environmentId));
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

  async function getFromDBOrCache(processId: string) {
    'use cache';
    cacheLife({ revalidate: 10, expire: 15 });
    cacheTag(`deployments/process/${processId}`);
    const deployments = await db.processDeployment.findMany({
      where: {
        AND: [
          {
            version: {
              AND: [
                { processId },
                ...(!showArchivedProcesses ? [{ NOT: { process: { folderId: null } } }] : []),
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
        engine: {
          include: {
            connections: {
              where: { reachable: true },
              include: {
                connection: true,
              },
            },
          },
        },
      },
    });

    return deployments.map((d) => ({
      ...d,
      processId: d.version.processId,
      instances: d.instances.map(({ id }) => id),
    }));
  }

  return getFromDBOrCache(processId);
}

export type StoredDeployment = SuccessType<
  Awaited<ReturnType<typeof getProcessDeployments>>
>[number];

export async function addDeployment(
  spaceId: string,
  processId: string,
  input: DeploymentInput,
  ability?: Ability,
) {
  if (!ability) ({ ability } = await getCurrentEnvironment(spaceId));

  if (!ability.can('create', 'Execution'))
    return userError('Invalid Permissions', UserErrorType.PermissionError);

  const data = DeploymentInputSchema.parse(input);

  await db.processDeployment.createMany({
    data: data.engineIds.map((engineId) => ({ ...data, engineIds: undefined, engineId })),
  });

  revalidateTag(`space/${spaceId}/deployments`, 'max');
  revalidateTag(`deployments/process/${processId}`, 'max');
}

export async function updateDeployment(
  spaceId: string,
  processId: string,
  deploymentId: string,
  input: Partial<DeploymentInput>,
  ability?: Ability,
) {
  if (!ability) ({ ability } = await getCurrentEnvironment(spaceId));

  if (!ability.can('update', 'Execution')) {
    return userError('Invalid Permissions', UserErrorType.PermissionError);
  }

  const data = DeploymentInputSchema.partial().strict().parse(input);

  const result = await db.processDeployment.update({
    where: { id: deploymentId },
    data,
  });

  revalidateTag(`space/${spaceId}/deployments`, 'max');
  revalidateTag(`deployments/process/${processId}`, 'max');

  return result;
}
