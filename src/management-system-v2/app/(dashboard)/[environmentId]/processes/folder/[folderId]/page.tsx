import { getFolderChildren, getRootFolder, getFolderById } from '@/lib/data/legacy/folders';
import Processes from '@/components/processes';
import Content from '@/components/content';
import { Button, Space } from 'antd';
import { getProcess } from '@/lib/data/legacy/process';
import { getCurrentEnvironment } from '@/components/auth';
// This is a workaround to enable the Server Actions in that file to return any
// client components. This is not possible with the current nextjs compiler
// otherwise. It might be possible in the future with turbopack without this
// import.
import '@/lib/data/processes';
import { getUsersFavourites } from '@/lib/data/users';
import { asyncMap } from '@/lib/helpers/javascriptHelpers';
import { ProcessMetadata } from '@/lib/data/process-schema';
import { Folder } from '@/lib/data/folder-schema';
import Link from 'next/link';
import { LeftOutlined } from '@ant-design/icons';
import EllipsisBreadcrumb from '@/components/ellipsis-breadcrumb';
import { ComponentProps } from 'react';
import { spaceURL } from '@/lib/utils';
export type ListItem = ProcessMetadata | (Folder & { type: 'folder' });

const ProcessesPage = async ({
  params,
}: {
  params: { environmentId: string; folderId?: string };
}) => {
  const { ability, activeEnvironment } = await getCurrentEnvironment(params.environmentId);

  const favs = await getUsersFavourites();

  const rootFolder = await getRootFolder(activeEnvironment.spaceId, ability);

  const folder = await getFolderById(
    params.folderId ? decodeURIComponent(params.folderId) : rootFolder.id,
  );

  const getFolderItemDetails = async (item: any): Promise<ListItem> => {
    if (item.type === 'folder') {
      const folderDetails = await getFolderById(item.id);
      return {
        ...folderDetails,
        type: 'folder' as const,
      };
    } else {
      const process = await getProcess(item.id);
      return process as ListItem;
    }
  };

  const getFolderContents = async (folderId: string, ability: any): Promise<ListItem[]> => {
    const children = await getFolderChildren(folderId, ability);
    const folderContents = await asyncMap(children, getFolderItemDetails);

    return folderContents satisfies ListItem[];
  };

  const folderContents = await getFolderContents(folder.id, ability);

  const pathToFolder: ComponentProps<typeof EllipsisBreadcrumb>['items'] = [];
  let currentFolder: Folder | null = folder;
  do {
    pathToFolder.push({
      title: (
        <Link href={spaceURL(activeEnvironment, `/processes/folder/${currentFolder.id}`)}>
          {currentFolder.parentId ? currentFolder.name : 'Processes'}
        </Link>
      ),
    });
    currentFolder = currentFolder.parentId ? await getFolderById(currentFolder.parentId) : null;
  } while (currentFolder);
  pathToFolder.reverse();

  return (
    <>
      <Content
        title={
          <Space>
            {folder.parentId && (
              <Link href={spaceURL(activeEnvironment, `/processes/folder/${folder.parentId}`)}>
                <Button icon={<LeftOutlined />} type="text">
                  Back
                </Button>
              </Link>
            )}
            <EllipsisBreadcrumb keepInBack={2} keepInFront={2} items={pathToFolder} />
          </Space>
        }
      >
        <Space direction="vertical" size="large" style={{ display: 'flex', height: '100%' }}>
          <Processes processes={folderContents} favourites={favs as string[]} folder={folder} />
        </Space>
      </Content>
    </>
  );
};

export default ProcessesPage;
