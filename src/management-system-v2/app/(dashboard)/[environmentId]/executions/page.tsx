import Content from '@/components/content';
import { getCurrentEnvironment } from '@/components/auth';
import { notFound } from 'next/navigation';
import { env } from '@/lib/env-vars';
import DeploymentsView from './deployments-view';
import { getRootFolder, getFolderById, getFolderContents } from '@/lib/data/DTOs';
import { getUsersFavourites } from '@/lib/data/users';
import { DeployedProcessInfo, getDeployments } from '@/lib/engines/deployment';
import { getProceedEngines } from '@/lib/engines/machines';
import { getSpaceEngines } from '@/lib/data/space-engines';
import { getDeployedProcessesFromSpaceEngines } from '@/lib/engines/space-engines-helpers';
import { isUserErrorResponse } from '@/lib/user-error';
import { Skeleton } from 'antd';
import { Suspense } from 'react';

function getDeploymentNames<T extends { versions: DeployedProcessInfo['versions'] }>(
  deployments: T[],
) {
  for (const deployment of deployments) {
    let latestDeploymentIdx = deployment.versions.length - 1;
    for (let i = deployment.versions.length - 2; i >= 0; i--) {
      if (deployment.versions[i].versionId > deployment.versions[latestDeploymentIdx].versionId)
        latestDeploymentIdx = i;
    }
    const latestDeployment = deployment.versions[latestDeploymentIdx];

    // @ts-ignore
    deployment.name = latestDeployment.definitionName || latestDeployment.versionName;
  }

  return deployments as (T & { name: string })[];
}

async function Executions({ environmentId }: { environmentId: string }) {
  const { ability, activeEnvironment } = await getCurrentEnvironment(environmentId);

  // TODO: check ability

  // TODO: once the legacy storage is dropped, it would be better to do one db transaction
  const [favs, [folder, folderContents], deployedInProceed, deployedInSpaceEngines] =
    await Promise.all([
      getUsersFavourites(),
      (async () => {
        const rootFolder = await getRootFolder(activeEnvironment.spaceId, ability);
        const folder = await getFolderById(rootFolder.id);
        const folderContents = await getFolderContents(folder.id, ability);
        return [folder, folderContents];
      })(),
      (async () => {
        const engines = await getProceedEngines();
        return await getDeployments(engines);
      })(),
      (async () => {
        const spaceEngines = await getSpaceEngines(activeEnvironment.spaceId);
        if (isUserErrorResponse(spaceEngines)) return [];
        return await getDeployedProcessesFromSpaceEngines(spaceEngines);
      })(),
    ]);

  const deployedWithRemappedIds: (Omit<DeployedProcessInfo, 'definitionId'> & { id: string })[] =
    deployedInProceed.concat(deployedInSpaceEngines).map((_process) => {
      const process = _process as any;
      process.id = process.definitionId;
      delete process.definitionId;
      return process;
    });
  const deployedProcesses = getDeploymentNames(deployedWithRemappedIds);

  return (
    <DeploymentsView
      processes={folderContents}
      folder={folder}
      favourites={favs as string[]}
      deployedProcesses={deployedProcesses}
    />
  );
}

export default function ExecutionsPage({ params }: { params: { environmentId: string } }) {
  if (!env.PROCEED_PUBLIC_ENABLE_EXECUTION) {
    return notFound();
  }

  return (
    <Content title="Executions">
      <Suspense fallback={<Skeleton active />}>
        <Executions environmentId={params.environmentId} />
      </Suspense>
    </Content>
  );
}
