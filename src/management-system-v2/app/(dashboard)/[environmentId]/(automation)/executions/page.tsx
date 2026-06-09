import Content from '@/components/content';
import { getCurrentEnvironment } from '@/components/auth';
import DeploymentsView from './deployments-view';
import { getRootFolder, getFolderById, getFolderContents } from '@/lib/data/db/folders';
import { getUsersFavourites } from '@/lib/data/users';
import { getDeployedProcesses } from '@/lib/data/deployment';
import { isUserErrorResponse } from '@/lib/user-error';

async function Executions({ environmentId }: { environmentId: string }) {
  const { ability, activeEnvironment } = await getCurrentEnvironment(environmentId);

  // TODO: check ability

  // TODO: once the legacy storage is dropped, it would be better to do one db transaction
  let [favs, [folder, folderContents], deployedProcesses] = await Promise.all([
    getUsersFavourites(),
    (async () => {
      const rootFolder = await getRootFolder(activeEnvironment.spaceId, ability);
      const folder = await getFolderById(rootFolder.id);
      const folderContents = await getFolderContents(folder.id, ability);
      return [folder, folderContents];
    })(),
    (async () => {
      return getDeployedProcesses(activeEnvironment.spaceId);
    })(),
  ]);

  folderContents = folderContents.filter((p) => p.type === 'folder' || p.versions.length);

  if (isUserErrorResponse(deployedProcesses)) throw deployedProcesses.error;

  const mappedDeployedProcesses = deployedProcesses.map((p) => {
    return {
      id: p.id,
      name: p.name,
      versions: p.versions.map((v) => ({ id: v.id, name: v.name })),
      instances: p.versions.flatMap((v) =>
        v.deployments.flatMap((d) => d.instances.map((i) => i.id)),
      ),
    };
  });

  return (
    <DeploymentsView
      processes={folderContents}
      folder={folder}
      favourites={favs as string[]}
      deployedProcesses={mappedDeployedProcesses}
    />
  );
}

export default async function ExecutionsPage(props: {
  params: Promise<{ environmentId: string }>;
}) {
  const params = await props.params;
  return (
    <Content title="Executions">
      <Executions environmentId={params.environmentId} />
    </Content>
  );
}
