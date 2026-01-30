import Content from '@/components/content';
import { getCurrentEnvironment } from '@/components/auth';
import DeploymentsView from './deployments-view';
import { getRootFolder, getFolderById, getFolderContents } from '@/lib/data/db/folders';
import { getUsersFavourites } from '@/lib/data/users';
import { getDeployedProcessesFromSavedEngines } from '@/lib/engines/saved-engines-helpers';
import { DeployedProcessInfo } from '@/lib/engines/deployment';
import { isUserErrorResponse } from '@/lib/server-error-handling/user-error';
import { getDbEngines } from '@/lib/data/db/engines';
import { errorResponse } from '@/lib/server-error-handling/page-error-response';
import { Result, err, ok } from 'neverthrow';

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
  const currentSpace = await getCurrentEnvironment(environmentId);
  if (currentSpace.isErr()) {
    return errorResponse(currentSpace);
  }
  const { ability, activeEnvironment } = currentSpace.value;

  // TODO: check ability

  // TODO: once the legacy storage is dropped, it would be better to do one db transaction
  let promises = await Promise.all([
    (async () => {
      const favorites = await getUsersFavourites();
      if (isUserErrorResponse(favorites)) return err(favorites);

      return ok(favorites);
    })(),
    (async () => {
      const rootFolder = await getRootFolder(activeEnvironment.spaceId, ability);
      if (rootFolder.isErr()) return rootFolder;

      const folder = await getFolderById(rootFolder.value.id);
      if (folder.isErr()) return folder;

      const folderContents = await getFolderContents(folder.value.id, ability);
      if (folderContents.isErr()) {
        return folderContents;
      }

      return ok([folder.value, folderContents.value] as const);
    })(),
    (async () => {
      const engines = await getDbEngines(null, ability, 'dont-check');
      if (engines.isErr()) return engines;

      return ok(await getDeployedProcessesFromSavedEngines(engines.value));
    })(),
    (async () => {
      const spaceEngines = await getDbEngines(activeEnvironment.spaceId, ability);
      if (spaceEngines.isErr()) return spaceEngines;

      return ok(await getDeployedProcessesFromSavedEngines(spaceEngines.value));
    })(),
  ]);

  const results = Result.combine(promises);
  if (results.isErr()) {
    return errorResponse(results);
  }

  let [favs, [folder, folderContents], deployedInProceed, deployedInSpaceEngines] = results.value;

  folderContents = folderContents.filter((p) => p.type === 'folder' || p.versions.length);

  const deployedWithRemappedIds: (Omit<DeployedProcessInfo, 'definitionId'> & { id: string })[] =
    deployedInProceed.concat(deployedInSpaceEngines).map((_process) => {
      const process = _process as any;
      process.id = process.definitionId;
      delete process.definitionId;
      return process;
    });
  const deployedProcesses = getDeploymentNames(deployedWithRemappedIds);

  return (
    <Content title="Executions">
      <DeploymentsView
        processes={folderContents}
        folder={folder}
        favourites={favs as string[]}
        deployedProcesses={deployedProcesses}
      />
    </Content>
  );
}

export default async function ExecutionsPage(props: {
  params: Promise<{ environmentId: string }>;
}) {
  const params = await props.params;
  return <Executions environmentId={params.environmentId} />;
}
