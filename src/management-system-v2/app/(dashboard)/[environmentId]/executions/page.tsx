import Content from '@/components/content';
import { getCurrentEnvironment } from '@/components/auth';
import { notFound } from 'next/navigation';
import DeploymentsView from './deployments-view';
import {
  getRootFolder,
  getFolderById,
  getFolderChildren,
  FolderChildren,
} from '@/lib/data/legacy/folders';
import { getUsersFavourites } from '@/lib/data/users';
import { asyncMap } from '@/lib/helpers/javascriptHelpers';
import { ListItem } from '../processes/folder/[folderId]/page';
import { getProcess } from '@/lib/data/processes';
import { getFolder } from '@/lib/data/folders';

const ExecutionsPage = async ({ params }: { params: { environmentId: string } }) => {
  if (!process.env.ENABLE_EXECUTION) {
    return notFound();
  }

  const { ability, activeEnvironment } = await getCurrentEnvironment(params.environmentId);

  const favs = await getUsersFavourites();

  const rootFolder = await getRootFolder(activeEnvironment.spaceId, ability);

  const folder = await getFolderById(rootFolder.id);

  const folderChildren = (await getFolderChildren(folder.id, ability)) as FolderChildren[];

  const folderContents = (await asyncMap(folderChildren, async (item) => {
    if (item.type === 'folder') {
      const folder = await getFolder(item.id);
      if ('error' in folder) {
        throw new Error('Failed to fetch folder');
      }
      return {
        ...folder,
        type: 'folder' as const,
      };
    } else {
      const res = await getProcess(item.id, activeEnvironment.spaceId);
      if ('error' in res) {
        throw new Error('Failed to fetch process');
      }
      return res;
    }
  })) satisfies ListItem[];

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
