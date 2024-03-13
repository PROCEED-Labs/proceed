import {
  getFolderChildren,
  getRootFolder,
  getFolderById,
  createFolder,
} from '@/lib/data/legacy/folders';
import Processes from '@/components/processes';
import Content from '@/components/content';
import { Button, Result, Space } from 'antd';
import NotLoggedInFallback from './not-logged-in-fallback';
import { getProcess, getProcesses } from '@/lib/data/legacy/process';
import Auth, { getCurrentEnvironment } from '@/components/auth';
// This is a workaround to enable the Server Actions in that file to return any
// client components. This is not possible with the current nextjs compiler
// otherwise. It might be possible in the future with turbopack without this
// import.
import '@/lib/data/processes';
import { asyncMap } from '@/lib/helpers/javascriptHelpers';
import { ProcessMetadata } from '@/lib/data/process-schema';
import { Folder } from '@/lib/data/folder-schema';
import Link from 'next/link';
import { LeftOutlined } from '@ant-design/icons';
export type ListItem = ProcessMetadata | (Folder & { type: 'folder' });

const ProcessesPage = async ({
  params,
}: {
  params: { environmentId: string; folderId?: string };
}) => {
  const { ability, activeEnvironment } = await getCurrentEnvironment(params.environmentId);

  let folderId = params.folderId;
  if (!folderId) folderId = getRootFolder(activeEnvironment.spaceId, ability).id;

  const folder = getFolderById(folderId);

  const folderContents = (await asyncMap(getFolderChildren(folderId, ability), async (item) => {
    if (item.type === 'folder') {
      return {
        ...getFolderById(item.id),
        type: 'folder' as const,
      };
    } else {
      return await getProcess(item.id);
    }
  })) satisfies ListItem[];

  if (folder.parentId) {
    const parentFolder = getFolderById(folder.parentId);

    //Change display
    parentFolder.name = '< Parent Folder >';
    parentFolder.createdAt = '';
    parentFolder.updatedAt = '';
    parentFolder.description = '';
    parentFolder.createdBy = '';

    folderContents.unshift({ ...parentFolder, type: 'folder' });
  }

  return (
    <Content
      title={
        <Space>
          {folder.parentId && (
            <Link href={`/${params.environmentId}/processes/folder/${folder.parentId}`}>
              <Button icon={<LeftOutlined />} type="text">
                Back
              </Button>
            </Link>
          )}
          {folder.parentId ? folder.name : 'Processes'}
        </Space>
      }
    >
      <Space direction="vertical" size="large" style={{ display: 'flex', height: '100%' }}>
        <Processes processes={folderContents} folder={folder} />
      </Space>
    </Content>
  );
};

export default ProcessesPage;
