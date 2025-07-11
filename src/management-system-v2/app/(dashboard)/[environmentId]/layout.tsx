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
  SolutionOutlined,
  HomeOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import { TbUser, TbUserEdit } from 'react-icons/tb';

import Link from 'next/link';
import { getEnvironmentById, getSpaceLogo, spaceHasLogo } from '@/lib/data/db/iam/environments';
import { getSpaceFolderTree, getUserRules } from '@/lib/authorization/authorization';
import { Environment } from '@/lib/data/environment-schema';
import { spaceURL } from '@/lib/utils';
import { RemoveReadOnly, truthyFilter } from '@/lib/typescript-utils';
import { asyncMap } from '@/lib/helpers/javascriptHelpers';
import { adminRules } from '@/lib/authorization/globalRules';
import { getSpaceSettingsValues } from '@/lib/data/db/space-settings';
import { getMSConfig } from '@/lib/ms-config/ms-config';
import GuestWarningButton from '@/components/guest-warning-button';
import SpaceLink from '@/components/space-link';
import { GoOrganization } from 'react-icons/go';

const DashboardLayout = async ({
  children,
  params,
}: PropsWithChildren<{ params: { environmentId: string } }>) => {
  const { userId, systemAdmin, user } = await getCurrentUser();

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
    const documentationSettings = await getSpaceSettingsValues(
      activeEnvironment.spaceId,
      'process-documentation',
    );

    if (documentationSettings.active !== false) {
      let children: MenuProps['items'] = [
        documentationSettings.list?.active !== false && {
          key: 'processes-list',
          label: <Link href={spaceURL(activeEnvironment, `/processes`)}>List</Link>,
          icon: <CopyOutlined />,
        },
        documentationSettings.editor?.active !== false && {
          key: 'processes-editor',
          label: <Link href={spaceURL(activeEnvironment, `/processes`)}>Editor</Link>,
          icon: <EditOutlined />,
        },
      ].filter(truthyFilter);

      if (children.length)
        layoutMenuItems.push({
          key: 'processes-group',
          label: 'Processes',
          icon: <PartitionOutlined />,
          children,
        });
    }
  }

  if (msConfig.PROCEED_PUBLIC_ENABLE_EXECUTION) {
    const automationSettings = await getSpaceSettingsValues(
      activeEnvironment.spaceId,
      'process-automation',
    );

    if (automationSettings.active !== false) {
      let children: MenuProps['items'] = [
        automationSettings.dashboard?.active !== false && {
          key: 'dashboard',
          label: <Link href={spaceURL(activeEnvironment, `/executions-dashboard`)}>Dashboard</Link>,
          icon: <BarChartOutlined />,
        },
        automationSettings.executions?.active !== false && {
          key: 'executions',
          label: <Link href={spaceURL(activeEnvironment, `/executions`)}>Executions</Link>,
          icon: <NodeExpandOutlined />,
        },
        automationSettings.machines?.active !== false && {
          key: 'machines',
          label: <Link href={spaceURL(activeEnvironment, `/engines`)}>Process Engines</Link>,
          icon: <LaptopOutlined />,
        },
      ].filter(truthyFilter);

      if (children.length)
        layoutMenuItems.push({
          key: 'automations-group',
          label: 'Automations',
          icon: <PlaySquareOutlined />,
          children,
        });

      if (automationSettings.tasklist?.active !== false) {
        layoutMenuItems = [
          {
            key: 'tasklist',
            label: <Link href={spaceURL(activeEnvironment, `/tasklist`)}>My Tasks</Link>,
            icon: <CheckSquareOutlined />,
          },
          ...layoutMenuItems,
        ];
      }
    }
  }

  if (
    can('manage', 'User') ||
    can('manage', 'RoleMapping') ||
    can('manage', 'Role') ||
    can('update', 'Environment') ||
    can('delete', 'Environment')
  ) {
    const children: MenuProps['items'] = [];

    if (can('update', 'Environment') || can('delete', 'Environment'))
      children.push({
        key: 'organization-settings',
        label: <Link href={spaceURL(activeEnvironment, `/settings`)}>Settings</Link>,
        icon: <SettingOutlined />,
      });

    if (
      activeEnvironment.isOrganization &&
      (can('update', 'Environment') || can('delete', 'Environment'))
    )
      children.push({
        key: 'organization-management',
        label: <Link href={spaceURL(activeEnvironment, `/management`)}>Management</Link>,
        icon: <GoOrganization />,
      });

    if (can('manage', 'User'))
      children.push({
        key: 'users',
        label: <Link href={spaceURL(activeEnvironment, `/iam/users`)}>Users</Link>,
        icon: <UserOutlined />,
      });

    if (can('manage', 'RoleMapping') || can('manage', 'Role'))
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

  if (msConfig.PROCEED_PUBLIC_IAM_ACTIVE) {
    layoutMenuItems.push({
      key: 'iam-personal',
      label: 'Personal',
      icon: <TbUser />,
      children: [
        {
          key: 'personal-profile',
          label: user?.isGuest ? (
            <GuestWarningButton>My Profile</GuestWarningButton>
          ) : (
            <SpaceLink href="/profile">My Profile</SpaceLink>
          ),
          icon: <TbUserEdit />,
        },
        {
          key: 'personal-spaces',
          label: user?.isGuest ? (
            <GuestWarningButton>My Spaces</GuestWarningButton>
          ) : (
            <SpaceLink href="/spaces">My Spaces</SpaceLink>
          ),
          icon: <AppstoreOutlined />,
        },
      ],
    });
  }

  if (!activeEnvironment.isOrganization) {
    layoutMenuItems.push({
      key: 'personal-space-home',
      label: 'Home',
      icon: <HomeOutlined />,
      children: [
        {
          key: 'personal-space-settings',
          label: user?.isGuest ? (
            <GuestWarningButton>Settings</GuestWarningButton>
          ) : (
            <SpaceLink href="/settings">Settings</SpaceLink>
          ),
          icon: <SettingOutlined />,
        },
      ],
    });
  }

  if (systemAdmin && msConfig.PROCEED_PUBLIC_IAM_ACTIVE) {
    layoutMenuItems.push({
      key: 'ms-admin',
      label: <Link href="/admin">MS Administration</Link>,
      icon: <SolutionOutlined />,
    });
  }

  const logo = (await getSpaceLogo(activeEnvironment.spaceId))?.spaceLogo ?? undefined;

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
