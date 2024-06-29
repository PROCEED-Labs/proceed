import Content from '@/components/content';
import { Space } from 'antd';
import { getCurrentEnvironment } from '@/components/auth';
import { notFound } from 'next/navigation';
import DeploymentsView from './deployments-view';
import { getRootFolder, getFolderById, getFolderChildren } from '@/lib/data/legacy/folders';
import { getProcess } from '@/lib/data/legacy/process';
import { getUsersFavourites } from '@/lib/data/users';
import { asyncMap } from '@/lib/helpers/javascriptHelpers';
import { ListItem } from '../processes/folder/[folderId]/page';

const ExecutionsPage = async ({ params }: { params: { environmentId: string } }) => {
  if (!process.env.ENABLE_EXECUTION) {
    return notFound();
  }

  const { ability, activeEnvironment } = await getCurrentEnvironment(params.environmentId);

  const favs = await getUsersFavourites();

  const rootFolder = getRootFolder(activeEnvironment.spaceId, ability);

  const folder = getFolderById(rootFolder.id);

  const folderContents = (await asyncMap(getFolderChildren(folder.id, ability), async (item) => {
    if (item.type === 'folder') {
      return {
        ...getFolderById(item.id),
        type: 'folder' as const,
      };
    } else {
      return await getProcess(item.id);
    }
  })) satisfies ListItem[];

  return (
    <Content title="Executions">
      <Space direction="vertical" size="large" style={{ display: 'flex', height: '100%' }}>
        <DeploymentsView
          processes={folderContents}
          folder={folder}
          favourites={favs as string[]}
        ></DeploymentsView>
      </Space>
    </Content>
  );
};

export default ExecutionsPage;
