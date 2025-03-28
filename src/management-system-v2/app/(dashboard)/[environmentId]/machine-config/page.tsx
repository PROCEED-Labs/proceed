import Content from '@/components/content';
import EllipsisBreadcrumb from '@/components/ellipsis-breadcrumb';
import { ComponentProps } from 'react';
import { Space } from 'antd';
import { getCurrentEnvironment } from '@/components/auth';
import { notFound } from 'next/navigation';
import { getParentConfigurations } from '@/lib/data/db/machine-config';
import ParentConfigList from './parent-config-list';
import { ParentConfig } from '@/lib/data/machine-config-schema';
import { env } from '@/lib/env-vars';
import UnauthorizedFallback from '@/components/unauthorized-fallback';
export type ListItem = ParentConfig;

const MachineConfigPage = async ({
  params,
}: {
  params: { environmentId: string; folderId?: string };
}) => {
  if (!env.ENABLE_MACHINE_CONFIG) {
    return notFound();
  }

  const { ability, activeEnvironment } = await getCurrentEnvironment(params.environmentId);

  if (!ability.can('view', 'MachineConfig')) return <UnauthorizedFallback />;

  const folderContents = (await getParentConfigurations(
    activeEnvironment.spaceId,
    ability,
  )) satisfies ListItem[];
  const pathToFolder: ComponentProps<typeof EllipsisBreadcrumb>['items'] = [];

  return (
    <>
      <Content title={<Space>Tech Data Sets</Space>}>
        <Space direction="vertical" size="large" style={{ display: 'flex', height: '100%' }}>
          <ParentConfigList data={folderContents} />
        </Space>
      </Content>
    </>
  );
};

export default MachineConfigPage;
