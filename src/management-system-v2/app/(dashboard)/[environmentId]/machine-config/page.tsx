import Content from '@/components/content';
import EllipsisBreadcrumb from '@/components/ellipsis-breadcrumb';
import { ComponentProps } from 'react';
import { Space } from 'antd';
import { getCurrentEnvironment } from '@/components/auth';
import { notFound } from 'next/navigation';
import { getConfigurations } from '@/lib/data/legacy/machine-config';
import { ParentConfigMetadata } from '@/lib/data/machine-config-schema';
import ParentConfigList from './parent-config-list';
export type ListItem = ParentConfigMetadata;

const MachineConfigPage = async ({
  params,
}: {
  params: { environmentId: string; folderId?: string };
}) => {
  if (!process.env.ENABLE_MACHINE_CONFIG) {
    return notFound();
  }

  const { ability, activeEnvironment } = await getCurrentEnvironment(params.environmentId);
  const folderContents = (await getConfigurations(
    activeEnvironment.spaceId,
    ability,
  )) satisfies ListItem[];
  const pathToFolder: ComponentProps<typeof EllipsisBreadcrumb>['items'] = [];

  return (
    <>
      <Content title={<Space></Space>}>
        <Space direction="vertical" size="large" style={{ display: 'flex', height: '100%' }}>
          <ParentConfigList
            params={{
              environmentId: params.environmentId,
            }}
            data={folderContents}
          />
        </Space>
      </Content>
    </>
  );
};

export default MachineConfigPage;
