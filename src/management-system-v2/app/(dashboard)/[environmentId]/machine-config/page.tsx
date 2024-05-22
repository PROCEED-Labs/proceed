import Content from '@/components/content';
import { getFolderChildren, getRootFolder, getFolderById } from '@/lib/data/legacy/folders';
import EllipsisBreadcrumb from '@/components/ellipsis-breadcrumb';
import { ComponentProps } from 'react';
import { Button, Space } from 'antd';
import { getCurrentEnvironment } from '@/components/auth';
import { notFound } from 'next/navigation';
import {
  getMachineConfig,
  getMachineConfigById,
  createMachineConfig,
} from '@/lib/data/legacy/machine-config';
import MachineConfigList from './machine-config-list';
import { asyncMap } from '@/lib/helpers/javascriptHelpers';
import { Folder } from '@/lib/data/folder-schema';
import { MachineConfigMetadata } from '@/lib/data/machine-config-schema';
import { spaceURL } from '@/lib/utils';
import Link from 'next/link';
import { LeftOutlined } from '@ant-design/icons';
export type ListItem = MachineConfigMetadata | (Folder & { type: 'folder' });

const MachineConfigPage = async ({
  params,
}: {
  params: { environmentId: string; folderId?: string };
}) => {
  if (!process.env.ENABLE_MACHINE_CONFIG) {
    return notFound();
  }

  const { ability, activeEnvironment } = await getCurrentEnvironment(params.environmentId);
  const rootFolder = getRootFolder(activeEnvironment.spaceId, ability);
  const folder = getFolderById(
    params.folderId ? decodeURIComponent(params.folderId) : rootFolder.id,
  );
  const folderContents = (await asyncMap(getFolderChildren(folder.id, ability), async (item) => {
    if (item.type === 'folder') {
      return {
        ...getFolderById(item.id),
        type: 'folder' as const,
      };
    } else {
      return await getMachineConfigById(item.id);
    }
  })) satisfies ListItem[];
  const pathToFolder: ComponentProps<typeof EllipsisBreadcrumb>['items'] = [];
  let currentFolder = folder;
  while (currentFolder.parentId) {
    pathToFolder.push({
      title: currentFolder.name,
      href: spaceURL(activeEnvironment, `/machine-config/folder/${currentFolder.id}`),
    });
    currentFolder = getFolderById(currentFolder.parentId);
  }
  pathToFolder.push({
    title: 'Machine Config',
    href: spaceURL(activeEnvironment, `/machine-config/folder/${rootFolder.id}`),
  });
  pathToFolder.reverse();

  const data = await getMachineConfig(activeEnvironment.spaceId);

  return (
    <>
      <Content
        title={
          <Space>
            {folder.parentId && (
              <Link href={spaceURL(activeEnvironment, `/machine-config/folder/${folder.parentId}`)}>
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
          <MachineConfigList
            params={{
              environmentId: params.environmentId,
              canCreateConfig: ability && ability.can('create', 'MachineConfig'),
              canCreateFolder: ability && ability.can('create', 'Folder'),
            }}
            data={folderContents}
          />
          {/* <Processes processes={folderContents} favourites={favs as string[]} folder={folder} /> */}
        </Space>
      </Content>
    </>
  );
};

export default MachineConfigPage;
