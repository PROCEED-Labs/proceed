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
  getMachineConfigs,
} from '@/lib/data/legacy/machine-config';
import MachineConfigList from './machine-config-list';
import { asyncMap } from '@/lib/helpers/javascriptHelpers';
import { Folder } from '@/lib/data/folder-schema';
import { MachineConfigMetadata } from '@/lib/data/machine-config-schema';
import { spaceURL } from '@/lib/utils';
import Link from 'next/link';
import { LeftOutlined } from '@ant-design/icons';
import { MachineConfig } from '@/lib/data/machine-config-schema';

export type ListItem = MachineConfigMetadata;

const MachineConfigPage = async ({
  params,
}: {
  params: { environmentId: string; folderId?: string };
}) => {
  if (!process.env.ENABLE_MACHINE_CONFIG) {
    return notFound();
  }

  const { ability, activeEnvironment } = await getCurrentEnvironment(params.environmentId);
  const folderContents = (await getMachineConfigs()) satisfies ListItem[];
  const pathToFolder: ComponentProps<typeof EllipsisBreadcrumb>['items'] = [];

  return (
    <>
      <Content title={<Space></Space>}>
        <Space direction="vertical" size="large" style={{ display: 'flex', height: '100%' }}>
          <MachineConfigList
            params={{
              environmentId: params.environmentId,
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
