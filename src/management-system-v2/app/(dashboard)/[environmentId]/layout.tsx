import { PropsWithChildren } from 'react';
import { getCurrentEnvironment, getCurrentUser } from '@/components/auth';
import { SetAbility } from '@/lib/abilityStore';
import Layout from './layout-client';
import { getUserOrganizationEnvironments } from '@/lib/data/db/iam/memberships';
import { MenuProps } from 'antd';

import {
  PartitionOutlined,
  TeamOutlined,
  UserOutlined,
  BarChartOutlined,
  EditOutlined,
  SnippetsOutlined,
  CopyOutlined,
  CheckSquareOutlined,
  HistoryOutlined,
  NodeExpandOutlined,
  PlaySquareOutlined,
  LaptopOutlined,
  SettingOutlined,
  ToolOutlined,
  SolutionOutlined,
  HomeOutlined,
} from '@ant-design/icons';

import Link from 'next/link';
import { getEnvironmentById, organizationHasLogo } from '@/lib/data/db/iam/environments';
import { getSpaceFolderTree, getUserRules } from '@/lib/authorization/authorization';
import { Environment } from '@/lib/data/environment-schema';
import { LuTable2 } from 'react-icons/lu';
import { spaceURL } from '@/lib/utils';
import { RemoveReadOnly } from '@/lib/typescript-utils';
import { asyncMap } from '@/lib/helpers/javascriptHelpers';
import { adminRules } from '@/lib/authorization/globalRules';
import { getMSConfig } from '@/lib/ms-config/ms-config';

const DashboardLayout = async ({
  children,
  params,
}: PropsWithChildren<{ params: { environmentId: string } }>) => {
  const { userId, systemAdmin } = await getCurrentUser();

  const { activeEnvironment, ability } = await getCurrentEnvironment(params.environmentId);
  const can = ability.can.bind(ability);
  const userEnvironments: Environment[] = [(await getEnvironmentById(userId))!];
  const userOrgEnvs = await getUserOrganizationEnvironments(userId);
  const orgEnvironments = await asyncMap(
    userOrgEnvs,
    async (envId) => (await getEnvironmentById(envId))!,
  );
  const msConfig = await getMSConfig();

  userEnvironments.push(...orgEnvironments);

  const userRules = systemAdmin
    ? (adminRules as RemoveReadOnly<typeof adminRules>)
    : await getUserRules(userId, activeEnvironment.spaceId);

  let layoutMenuItems: MenuProps['items'] = [];

  if (can('view', 'Process')) {
    let children: MenuProps['items'] = [];
    children.push({
      key: 'processes-editor',
      label: <Link href={spaceURL(activeEnvironment, `/processes`)}>Editor</Link>,
      icon: <EditOutlined />,
    });

    children = [
      {
        key: 'processes-list',
        label: <Link href={spaceURL(activeEnvironment, `/processes`)}>List</Link>,
        icon: <CopyOutlined />,
      },
      ...children,
      {
        key: 'processes-templates',
        label: <Link href={spaceURL(activeEnvironment, `/processes`)}>Templates</Link>,
        icon: <SnippetsOutlined />,
      },
    ];

    layoutMenuItems.push({
      key: 'processes-group',
      label: 'Processes',
      icon: <PartitionOutlined />,
      children,
    });
  }

  if (msConfig.PROCEED_PUBLIC_ENABLE_EXECUTION) {
    let children: MenuProps['items'] = [];

    children.push({
      key: 'executions',
      label: <Link href={spaceURL(activeEnvironment, `/executions`)}>Executions</Link>,
      icon: <NodeExpandOutlined />,
    });

    children.push({
      key: 'machines',
      label: <Link href={spaceURL(activeEnvironment, `/engines`)}>Machines</Link>,
      icon: <LaptopOutlined />,
    });

    layoutMenuItems = [
      {
        key: 'tasklist',
        label: <Link href={spaceURL(activeEnvironment, `/tasklist`)}>My Tasks</Link>,
        icon: <CheckSquareOutlined />,
      },
      ...layoutMenuItems,
    ];

    children = [
      {
        key: 'dashboard',
        label: <Link href={spaceURL(activeEnvironment, `/executions`)}>Dashboard</Link>,
        icon: <BarChartOutlined />,
      },
      {
        key: 'projects',
        label: <Link href={spaceURL(activeEnvironment, `/executions`)}>Projects</Link>,
        icon: <HistoryOutlined />,
      },
      ...children,
    ];

    layoutMenuItems.push({
      key: 'automations-group',
      label: 'Automations',
      icon: <PlaySquareOutlined />,
      children,
    });
  }

  if (
    ability.can('manage', 'User') ||
    ability.can('manage', 'RoleMapping') ||
    ability.can('manage', 'Role')
  ) {
    const children: MenuProps['items'] = [];

    if (can('update', 'Environment') || can('delete', 'Environment'))
      children.push({
        key: 'organization-settings',
        label: <Link href={spaceURL(activeEnvironment, `/organization-settings`)}>Settings</Link>,
        icon: <SettingOutlined />,
      });

    if (can('manage', 'User'))
      children.push({
        key: 'users',
        label: <Link href={spaceURL(activeEnvironment, `/iam/users`)}>Users</Link>,
        icon: <UserOutlined />,
      });

    if (ability.can('manage', 'RoleMapping') || ability.can('manage', 'Role'))
      children.push({
        key: 'roles',
        label: <Link href={spaceURL(activeEnvironment, `/iam/roles`)}>Roles</Link>,
        icon: <TeamOutlined />,
      });

    layoutMenuItems.push({
      key: 'iam-group',
      label: 'Organization',
      icon: <HomeOutlined />,
      children,
    });
  }

  if (systemAdmin && msConfig.PROCEED_PUBLIC_IAM_ACTIVATE) {
    layoutMenuItems.push({
      key: 'ms-admin',
      label: <Link href="/admin">MS Administration</Link>,
      icon: <SolutionOutlined />,
    });
  }

  let logo;
  if (activeEnvironment.isOrganization && (await organizationHasLogo(activeEnvironment.spaceId)))
    logo = `/api/private/${activeEnvironment.spaceId}/logo`;

  return (
    <>
      <SetAbility
        rules={userRules}
        environmentId={activeEnvironment.spaceId}
        treeMap={await getSpaceFolderTree(activeEnvironment.spaceId)}
      />
      <Layout
        loggedIn={!!userId}
        userEnvironments={userEnvironments}
        layoutMenuItems={layoutMenuItems}
        activeSpace={activeEnvironment}
        customLogo={logo}
      >
        {children}
      </Layout>
    </>
  );
};

export default DashboardLayout;
