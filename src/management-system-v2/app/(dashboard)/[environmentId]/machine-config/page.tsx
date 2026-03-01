import Content from '@/components/content';
import EllipsisBreadcrumb from '@/components/ellipsis-breadcrumb';
import { ComponentProps } from 'react';
import { Space } from 'antd';
import { getCurrentEnvironment } from '@/components/auth';
import { notFound } from 'next/navigation';
import {
  getAasConfigurations,
  getParentConfigurations,
  syncOrganizationUsers,
  syncPersonalSpaceUser,
  syncSpaceConfigs,
} from '@/lib/data/db/machine-config';
import ParentConfigList from './parent-config-list';
import { Config } from '@/lib/data/machine-config-schema';
import { env } from '@/lib/ms-config/env-vars';
import UnauthorizedFallback from '@/components/unauthorized-fallback';
export type ListItem = Config;

const MachineConfigPage = async ({
  params,
}: {
  params: Promise<{ environmentId: string; folderId?: string }>;
}) => {
  if (!env.PROCEED_PUBLIC_CONFIG_SERVER_ACTIVE) {
    return notFound();
  }
  const { environmentId } = await params;

  const { ability, activeEnvironment } = await getCurrentEnvironment(environmentId);

  if (!ability.can('view', 'MachineConfig')) return <UnauthorizedFallback />;

  let folderContents;
  let AasContent = await getAasConfigurations(activeEnvironment.spaceId, ability);
  await syncSpaceConfigs();
  if (activeEnvironment.isOrganization) await syncOrganizationUsers(activeEnvironment.spaceId);
  else syncPersonalSpaceUser(activeEnvironment.spaceId);

  try {
    folderContents = (await getParentConfigurations(
      activeEnvironment.spaceId,
      ability,
    )) satisfies ListItem[];
  } catch (error: any) {
    console.log(error?.message);
    folderContents = [] satisfies ListItem[];
  }

  const pathToFolder: ComponentProps<typeof EllipsisBreadcrumb>['items'] = [];

  return (
    <>
      <Content title={<Space>Configurations</Space>}>
        <Space direction="vertical" size="large" style={{ display: 'flex', height: '100%' }}>
          <ParentConfigList data={folderContents} />
        </Space>
      </Content>
    </>
  );
};

export default MachineConfigPage;
