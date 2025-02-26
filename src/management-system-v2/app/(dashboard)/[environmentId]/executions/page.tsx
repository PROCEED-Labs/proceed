import Content from '@/components/content';
import { getCurrentEnvironment } from '@/components/auth';
import { notFound } from 'next/navigation';
import { env } from '@/lib/env-vars';
import DeploymentsView from './deployments-view';
import { getRootFolder, getFolderById, getFolderContents } from '@/lib/data/DTOs';
import { getUsersFavourites } from '@/lib/data/users';
import { DeployedProcessInfo } from '@/lib/engines/deployment';
import { getDbEngines } from '@/lib/data/db/engines';
import { getDeployedProcessesFromSavedEngines } from '@/lib/engines/saved-engines-helpers';

function getDeploymentNames(deployments: DeployedProcessInfo[]) {
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

  return deployments as (DeployedProcessInfo & { name: string })[];
}

export default async function ExecutionsPage({ params }: { params: { environmentId: string } }) {
  if (!env.PROCEED_PUBLIC_ENABLE_EXECUTION) {
    return notFound();
  }

  const { ability, activeEnvironment } = await getCurrentEnvironment(params.environmentId);

  // TODO: check ability

  // TODO: once the legacy storage is dropped, it would be better to do one db transaction
  const [favs, [folder, folderContents], _deployedProcesses] = await Promise.all([
    getUsersFavourites(),
    (async () => {
      const rootFolder = await getRootFolder(activeEnvironment.spaceId, ability);
      const folder = await getFolderById(rootFolder.id);
      const folderContents = await getFolderContents(folder.id, ability);
      return [folder, folderContents];
    })(),
    (async () => {
      const [spaceEngines, proceedEngines] = await Promise.all([
        getDbEngines(activeEnvironment.spaceId, ability),
        getDbEngines(null, ability, 'dont-check'),
      ]);
      return await getDeployedProcessesFromSavedEngines([...spaceEngines, ...proceedEngines]);
    })(),
  ]);

  const deployedProcesses = getDeploymentNames(_deployedProcesses);

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
