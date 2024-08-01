import Content from '@/components/content';
import { getCurrentEnvironment } from '@/components/auth';
import { notFound } from 'next/navigation';
import { env } from '@/lib/env-vars';
import DeploymentsView from './deployments-view';
import { getRootFolder, getFolderById, getFolderContents } from '@/lib/data/legacy/folders';
import { getUsersFavourites } from '@/lib/data/users';

const ExecutionsPage = async ({ params }: { params: { environmentId: string } }) => {
  if (!env.ENABLE_EXECUTION) {
    return notFound();
  }

  const { ability, activeEnvironment } = await getCurrentEnvironment(params.environmentId);

  const favs = await getUsersFavourites();

  const rootFolder = getRootFolder(activeEnvironment.spaceId, ability);

  const folder = getFolderById(rootFolder.id);

  const folderContents = await getFolderContents(folder.id, ability);

  return (
    <Content title="Executions">
      <DeploymentsView
        processes={folderContents}
        folder={folder}
        favourites={favs as string[]}
      ></DeploymentsView>
    </Content>
  );
};

export default ExecutionsPage;
