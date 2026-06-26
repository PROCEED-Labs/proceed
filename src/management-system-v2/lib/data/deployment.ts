'use server';

import db from '@/lib/data/db';
import { getCurrentEnvironment } from '@/components/auth';
import { SuccessType, UserErrorType, userError } from '../user-error';
import Ability from '../ability/abilityHelper';
import { cacheLife, cacheTag } from 'next/cache';

export async function getDeployedProcesses(environmentId: string, withArchived = false) {
  const { ability } = await getCurrentEnvironment(environmentId);

  if (!ability.can('view', 'Execution'))
    return userError('Invalid Permissions', UserErrorType.PermissionError);

  async function getFromDBOrCache(environmentId: string) {
    'use cache';
    cacheLife({ revalidate: 10, expire: 15 });
    cacheTag(`space/${environmentId}/deployments`);

    return await db.process.findMany({
      where: {
        AND: [{ environmentId }],
      },
      select: {
        id: true,
        name: true,
        versions: {
          include: {
            deployments: {
              include: { instances: { select: { id: true } } },
            },
          },
        },
      },
    });
  }

  let deployedProcesses = await getFromDBOrCache(environmentId);

  deployedProcesses = deployedProcesses
    .filter((p) => {
      if (withArchived) {
        return p.versions.some((v) => !!v.deployments.length);
      }

      return p.versions.some((v) => v.deployments.filter((d) => !d.removeTime).length);
    })
    .map((p) => {
      return {
        ...p,
        versions: p.versions
          .map((v) => ({
            ...v,
            deployments: withArchived ? v.deployments : v.deployments.filter((d) => !d.removeTime),
          }))
          .filter((v) => !!v.deployments.length),
      };
    });

  return ability.filter('view', 'Process', deployedProcesses);
}

export async function getProcessDeployments(
  spaceId: string,
  processId: string,
  ability?: Ability,
  showArchivedProcesses = false,
  showArchivedDeployments = false,
) {
  if (!ability) ({ ability } = await getCurrentEnvironment(spaceId));

  if (!ability.can('view', 'Execution'))
    return userError('Invalid Permissions', UserErrorType.PermissionError);

  async function getFromDBOrCache(processId: string) {
    'use cache';
    cacheLife({ revalidate: 10, expire: 15 });
    cacheTag(`deployments/process/${processId}`);
    const deployments = await db.processDeployment.findMany({
      include: {
        version: {
          select: {
            id: true,
            processId: true,
            name: true,
            process: { select: { folderId: true } },
          },
        },
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

  let deployments = await getFromDBOrCache(processId);

  deployments = deployments.filter((d) => {
    if (!showArchivedProcesses && d.version.process.folderId === null) return false;
    if (!showArchivedDeployments && d.removeTime !== null) return false;

    return true;
  });

  return deployments;
}

export type StoredDeployment = SuccessType<
  Awaited<ReturnType<typeof getProcessDeployments>>
>[number];
