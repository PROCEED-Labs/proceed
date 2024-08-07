import Content from '@/components/content';
import EllipsisBreadcrumb from '@/components/ellipsis-breadcrumb';
import { ComponentProps } from 'react';
import { Space } from 'antd';
import { getCurrentEnvironment } from '@/components/auth';
import { notFound } from 'next/navigation';
import { getMachineConfigs } from '@/lib/data/legacy/machine-config';
import MachineConfigList from './machine-config-list';
import { MachineConfigMetadata } from '@/lib/data/machine-config-schema';
import { env } from '@/lib/env-vars';
export type ListItem = MachineConfigMetadata;

const MachineConfigPage = async ({
  params,
}: {
  params: { environmentId: string; folderId?: string };
}) => {
  if (!env.ENABLE_MACHINE_CONFIG) {
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
