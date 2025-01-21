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

function getDeploymentNames(deployments: DeployedProcessInfo[]) {
  for (const deployment of deployments) {
    let latestVesrionIdx = deployment.versions.length - 1;
    for (let i = deployment.versions.length - 2; i >= 0; i--) {
      if (deployment.versions[i].version > deployment.versions[latestVesrionIdx].version)
        latestVesrionIdx = i;
    }
    const latestVersion = deployment.versions[latestVesrionIdx];

    // @ts-ignore
    deployment.name = latestVersion.definitionName || latestVersion.versionName;
  }

  return deployments as (DeployedProcessInfo & { name: string })[];
}

export default async function ExecutionsPage({ params }: { params: { environmentId: string } }) {
  if (!env.PROCEED_PUBLIC_ENABLE_EXECUTION) {
    return notFound();
  }

  const { ability, activeEnvironment } = await getCurrentEnvironment(params.environmentId);

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

  const deployedProcesses = getDeploymentNames(deployedInProceed.concat(deployedInSpaceEngines));

  return (
    <Content title="Executions">
      <DeploymentsView
        processes={folderContents}
        folder={folder}
        favourites={favs as string[]}
        deployedProcesses={deployedProcesses}
      ></DeploymentsView>
    </Content>
  );
}
