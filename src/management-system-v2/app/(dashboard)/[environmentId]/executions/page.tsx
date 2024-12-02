import Content from '@/components/content';
import { getCurrentEnvironment } from '@/components/auth';
import { notFound } from 'next/navigation';
import { env } from '@/lib/env-vars';
import DeploymentsView from './deployments-view';
import { getRootFolder, getFolderById, getFolderContents } from '@/lib/data/DTOs';
import { getUsersFavourites } from '@/lib/data/users';
import { getDeployments } from '@/lib/engines/deployment';
import { getEngines } from '@/lib/engines/machines';

export default async function ExecutionsPage({ params }: { params: { environmentId: string } }) {
  if (!env.NEXT_PUBLIC_ENABLE_EXECUTION) {
    return notFound();
  }

  const { ability, activeEnvironment } = await getCurrentEnvironment(params.environmentId);

  // TODO: once the legacy storage is dropped, it would be better to do one db transaction
  const [favs, [folder, folderContents], deployedProcesses] = await Promise.all([
    getUsersFavourites(),
    (async () => {
      const rootFolder = await getRootFolder(activeEnvironment.spaceId, ability);
      const folder = await getFolderById(rootFolder.id);
      const folderContents = await getFolderContents(folder.id, ability);
      return [folder, folderContents];
    })(),
    (async () => {
      const engines = await getEngines();
      return await getDeployments(engines);
    })(),
  ]);

  // TODO: check ability

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
