import Processes from '@/components/processes';
import Content from '@/components/content';
import { Button, Space } from 'antd';
import { getCurrentEnvironment } from '@/components/auth';
// This is a workaround to enable the Server Actions in that file to return any
// client components. This is not possible with the current nextjs compiler
// otherwise. It might be possible in the future with turbopack without this
// import.
import '@/lib/data/processes';
import { getUsersFavourites } from '@/lib/data/users';
import { ProcessMetadata } from '@/lib/data/process-schema';
import { Folder } from '@/lib/data/folder-schema';
import Link from 'next/link';
import { LeftOutlined } from '@ant-design/icons';
import EllipsisBreadcrumb from '@/components/ellipsis-breadcrumb';
import { ComponentProps } from 'react';
import { spaceURL } from '@/lib/utils';
import { getFolderById, getRootFolder, getFolderContents } from '@/lib/data/db/folders';
export type ListItem = ProcessMetadata | (Folder & { type: 'folder' });

const ProcessesPage = async (props: {
  params: Promise<{ environmentId: string; folderId?: string; mode: string }>;
}) => {
  const params = await props.params;

  const { ability, activeEnvironment } = await getCurrentEnvironment(params.environmentId);

  const favs = await getUsersFavourites();

  const rootFolder = await getRootFolder(activeEnvironment.spaceId, ability);

  const folder = await getFolderById(
    params.folderId ? decodeURIComponent(params.folderId) : rootFolder.id,
  );

  const folderContents = await getFolderContents(folder.id, ability);

  const isListView = params.mode === 'list';

  const folderContentsFiltered = isListView
    ? folderContents.filter(
        (folderContent) => folderContent.type === 'folder' || folderContent.versions.length > 0,
      )
    : folderContents;

  const hasNoReleasedProcesses = isListView
    ? folderContentsFiltered.every((item) => item.type === 'folder')
    : undefined;

  const pathToFolder: ComponentProps<typeof EllipsisBreadcrumb>['items'] = [];
  const wrappingFolderIds = [] as string[];
  let currentFolder: Folder | null = folder;
  do {
    pathToFolder.push({
      title: (
        <Link
          href={spaceURL(activeEnvironment, `/processes/${params.mode}/folder/${currentFolder.id}`)}
        >
          {currentFolder.parentId ? currentFolder.name : isListView ? 'List' : 'Editor'}
        </Link>
      ),
    });
    if (currentFolder) wrappingFolderIds.push(currentFolder.id);
    currentFolder = currentFolder.parentId ? await getFolderById(currentFolder.parentId) : null;
  } while (currentFolder);
  pathToFolder.reverse();
  wrappingFolderIds.reverse();

  return (
    <>
      <Content
        title={
          <Space>
            {folder.parentId && (
              <Link
                href={spaceURL(
                  activeEnvironment,
                  `/processes/${params.mode}/folder/${folder.parentId}`,
                )}
              >
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
          <Processes
            {...(isListView && { readOnly: true, hasNoReleasedProcesses })}
            rootFolder={rootFolder}
            processes={folderContentsFiltered}
            favourites={favs as string[]}
            folder={folder}
            pathToFolder={wrappingFolderIds}
          />
        </Space>
      </Content>
    </>
  );
};

export default ProcessesPage;
