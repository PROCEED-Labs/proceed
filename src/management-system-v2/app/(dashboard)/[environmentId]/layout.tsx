import { PropsWithChildren } from 'react';
import { getCurrentEnvironment, getCurrentUser, getSystemAdminRules } from '@/components/auth';
import { SetAbility } from '@/lib/abilityStore';
import Layout, { ExtendedMenuItems } from './layout-client';
import { getUserOrganizationEnvironments } from '@/lib/data/db/iam/memberships';
import { MenuProps } from 'antd';

import {
  PartitionOutlined,
  TeamOutlined,
  UserOutlined,
  BarChartOutlined,
  EditOutlined,
  CopyOutlined,
  CheckSquareOutlined,
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
import { getEnvironmentById, getSpaceLogo } from '@/lib/data/db/iam/environments';
import { getSpaceFolderTree, getUserRules } from '@/lib/authorization/authorization';
import { Environment } from '@/lib/data/environment-schema';
import { spaceURL } from '@/lib/utils';
import { truthyFilter } from '@/lib/typescript-utils';
import { asyncMap } from '@/lib/helpers/javascriptHelpers';
import { getSpaceSettingsValues } from '@/lib/data/db/space-settings';
import { getMSConfig } from '@/lib/ms-config/ms-config';
import GuestWarningButton from '@/components/guest-warning-button';
import SpaceLink from '@/components/space-link';
import { GoOrganization } from 'react-icons/go';
import { LinkOutlined } from '@ant-design/icons';
import { CustomLinkStateProvider } from '@/lib/custom-links/client-state';
import { CustomLink } from '@/lib/custom-links/state';
import { customLinkIcons } from '@/lib/custom-links/icons';
import { CustomNavigationLink } from '@/lib/custom-links/custom-link';
import { env } from '@/lib/ms-config/env-vars';
import { getUserPassword } from '@/lib/data/db/iam/users';

const DashboardLayout = async ({
  children,
  params,
}: PropsWithChildren<{ params: { environmentId: string } }>) => {
  const { userId, systemAdmin, user } = await getCurrentUser();

  const { activeEnvironment, ability } = await getCurrentEnvironment(params.environmentId);
  const can = ability.can.bind(ability);

  const userEnvironments: Environment[] = [];
  if (env.PROCEED_PUBLIC_IAM_PERSONAL_SPACES_ACTIVE)
    userEnvironments.push(await getEnvironmentById(userId))!;

  const userOrgEnvs = await getUserOrganizationEnvironments(userId);
  const orgEnvironments = await asyncMap(
    userOrgEnvs,
    async (envId) => (await getEnvironmentById(envId))!,
  );
  const msConfig = await getMSConfig();

  userEnvironments.push(...orgEnvironments);

  const userRules = systemAdmin
    ? getSystemAdminRules(activeEnvironment.isOrganization)
    : await getUserRules(userId, activeEnvironment.spaceId);

  const generalSettings = await getSpaceSettingsValues(
    activeEnvironment.spaceId,
    'general-settings',
  );
  const customNavLinks: CustomNavigationLink[] = generalSettings.customNavigationLinks?.links || [];
  const topCustomNavLinks = customNavLinks.filter((link) => link.position === 'top');
  const middleCustomNavLinks = customNavLinks.filter((link) => link.position === 'middle');
  const bottomCustomNavLinks = customNavLinks.filter((link) => link.position === 'bottom');
  const externalServicesLabel = (
    <span style={{ display: 'block', width: '100%', textAlign: 'center', fontSize: '.75rem' }}>
      External Services
    </span>
  );
  let bottomNavLinks: MenuProps['items'] = [];
  if (bottomCustomNavLinks.length > 0) {
    const bottomCustomNavLinksMenuItems: MenuProps['items'] = bottomCustomNavLinks.map(
      (link, idx) => ({
        key: idx,
        label: <CustomLink link={link} />,
        icon: customLinkIcons.find((icon) => icon.value === link.icon)?.icon || <LinkOutlined />,
      }),
    );
    if (middleCustomNavLinks.length > 0) {
      // If we already show a external services label for the middle links, don't show one again for
      // the bottom links
      bottomNavLinks.push(...bottomCustomNavLinksMenuItems);
    } else {
      bottomNavLinks.push(
        {
          key: 'bottom-custom-links-divider',
          type: 'divider',
        },
        {
          key: 'bottom-custom-links',
          type: 'group',
          label: externalServicesLabel,
          children: bottomCustomNavLinksMenuItems,
        },
      );
    }
  }

  const userPassword = await getUserPassword(user!.id);
  const userNeedsToChangePassword = userPassword ? userPassword.isTemporaryPassword : false;

  let layoutMenuItems: ExtendedMenuItems = [];

  if (topCustomNavLinks.length > 0) {
    layoutMenuItems.push(
      ...topCustomNavLinks.map((link, idx) => ({
        priority: idx * 100,
        key: `top-${idx}`,
        label: <CustomLink link={link} />,
        icon: customLinkIcons.find((icon) => icon.value === link.icon)?.icon || <LinkOutlined />,
      })),
    );

    layoutMenuItems.push({
      priority: 50,
      key: 'top-custom-links-divider',
      type: 'divider',
    });
  }

  if (msConfig.PROCEED_PUBLIC_PROCESS_DOCUMENTATION_ACTIVE && can('view', 'Process')) {
    const documentationSettings = await getSpaceSettingsValues(
      activeEnvironment.spaceId,
      'process-documentation',
    );

    if (documentationSettings.active !== false) {
      const processRegex = '/processes($|/)';
      let children: ExtendedMenuItems = [
        documentationSettings.list?.active !== false && {
          priority: 0,
          key: 'processes-list',
          label: <Link href={spaceURL(activeEnvironment, `/processes/list`)}>List</Link>,
          icon: <CopyOutlined />,
          selectedRegex: '/processes/list($|/)',
        },
        documentationSettings.editor?.active !== false && {
          priority: 100,
          key: 'processes-editor',
          label: <Link href={spaceURL(activeEnvironment, `/processes/editor`)}>Editor</Link>,
          icon: <EditOutlined />,
          selectedRegex: '/processes/editor($|/)',
        },
      ].filter(truthyFilter);

      if (children.length)
        layoutMenuItems.push({
          priority: 100,
          key: 'processes-group',
          label: 'Processes',
          icon: <PartitionOutlined />,
          selectedRegex: processRegex,
          openRegex: processRegex,
          children,
        });
    }
  }

  const automationSettings = await getSpaceSettingsValues(
    activeEnvironment.spaceId,
    'process-automation',
  );

  if (msConfig.PROCEED_PUBLIC_PROCESS_AUTOMATION_ACTIVE) {
    if (automationSettings.active !== false) {
      let childRegex = '';
      let children: ExtendedMenuItems = [];

      if (automationSettings.dashboard?.active !== false) {
        const dashboardRegex = '/executions-dashboard($|/)';
        childRegex = !childRegex ? dashboardRegex : `(${childRegex})|(${dashboardRegex})`;
        children.push({
          priority: 0,
          key: 'dashboard',
          label: <Link href={spaceURL(activeEnvironment, `/executions-dashboard`)}>Dashboard</Link>,
          icon: <BarChartOutlined />,
          selectedRegex: dashboardRegex,
        });
      }
      if (automationSettings.executions?.active !== false) {
        const executionsRegex = '/executions($|/)';
        childRegex = !childRegex ? executionsRegex : `(${childRegex})|(${executionsRegex})`;
        children.push({
          priority: 100,
          key: 'executions',
          label: <Link href={spaceURL(activeEnvironment, `/executions`)}>Executions</Link>,
          icon: <NodeExpandOutlined />,
          selectedRegex: executionsRegex,
        });
      }
      if (automationSettings.machines?.active !== false) {
        const machinesRegex = '/engines($|/)';
        childRegex = !childRegex ? machinesRegex : `(${childRegex})|(${machinesRegex})`;
        children.push({
          priority: 200,
          key: 'machines',
          label: <Link href={spaceURL(activeEnvironment, `/engines`)}>Process Engines</Link>,
          icon: <LaptopOutlined />,
          selectedRegex: machinesRegex,
        });
      }

      if (children.length) {
        layoutMenuItems.push({
          priority: 200,
          key: 'automations-group',
          label: 'Automations',
          icon: <PlaySquareOutlined />,
          selectedRegex: childRegex,
          openRegex: childRegex,
          children,
        });
      }
    }
  }

  if (
    activeEnvironment.isOrganization &&
    (can('manage', 'User') ||
      can('manage', 'RoleMapping') ||
      can('manage', 'Role') ||
      can('update', 'Environment') ||
      can('delete', 'Environment'))
  ) {
    const children: ExtendedMenuItems = [];

    let childRegex = '';
    if (can('update', 'Environment') || can('delete', 'Environment')) {
      const settingsRegex = '/settings($|/)';
      childRegex = !childRegex ? settingsRegex : `(${childRegex})|(${settingsRegex})`;
      children.push({
        priority: 0,
        key: 'organization-settings',
        label: <Link href={spaceURL(activeEnvironment, `/settings`)}>Settings</Link>,
        icon: <SettingOutlined />,
        selectedRegex: settingsRegex,
      });
    }

    if (
      activeEnvironment.isOrganization &&
      (can('update', 'Environment') || can('delete', 'Environment'))
    ) {
      const managementRegex = '/management($|/)';
      childRegex = !childRegex ? managementRegex : `(${childRegex})|(${managementRegex})`;
      children.push({
        priority: 100,
        key: 'organization-management',
        label: <Link href={spaceURL(activeEnvironment, `/management`)}>Management</Link>,
        icon: <GoOrganization />,
        selectedRegex: managementRegex,
      });
    }

    if (can('manage', 'User')) {
      const userRegex = '/iam/users($|/)';
      childRegex = !childRegex ? userRegex : `(${childRegex})|(${userRegex})`;
      children.push({
        priority: 200,
        key: 'users',
        label: <Link href={spaceURL(activeEnvironment, `/iam/users`)}>Users</Link>,
        icon: <UserOutlined />,
        selectedRegex: userRegex,
      });
    }

    if (can('admin', 'All')) {
      const rolesRegex = '/iam/roles($|/)';
      childRegex = !childRegex ? rolesRegex : `(${childRegex})|(${rolesRegex})`;
      children.push({
        priority: 300,
        key: 'roles',
        label: <Link href={spaceURL(activeEnvironment, `/iam/roles`)}>Roles</Link>,
        icon: <TeamOutlined />,
        selectedRegex: rolesRegex,
      });
    }

    layoutMenuItems.push({
      priority: 300,
      key: 'iam-group',
      label: 'Organization',
      icon: <HomeOutlined />,
      selectedRegex: childRegex,
      openRegex: childRegex,
      children,
    });
  }

  if (msConfig.PROCEED_PUBLIC_IAM_ACTIVE) {
    const profileRegex = '/profile($|/)';
    const spacesRegex = '/spaces($|/)';
    const regex = `(${profileRegex})|(${spacesRegex})`;
    layoutMenuItems.push({
      priority: 400,
      key: 'iam-personal',
      label: 'Personal',
      icon: <TbUser />,
      selectedRegex: regex,
      openRegex: regex,
      children: [
        {
          priority: 0,
          key: 'personal-profile',
          label: user?.isGuest ? (
            <GuestWarningButton>My Profile</GuestWarningButton>
          ) : (
            <SpaceLink href="/profile">My Profile</SpaceLink>
          ),
          icon: <TbUserEdit />,
          selectedRegex: profileRegex,
        },
        {
          priority: 100,
          key: 'personal-spaces',
          label: user?.isGuest ? (
            <GuestWarningButton>My Spaces</GuestWarningButton>
          ) : (
            <SpaceLink href="/spaces">My Spaces</SpaceLink>
          ),
          icon: <AppstoreOutlined />,
          selectedRegex: spacesRegex,
        },
      ],
    });
  }

  if (!activeEnvironment.isOrganization) {
    const regex = '/settings($|/)';
    layoutMenuItems.push({
      priority: 400,
      key: 'personal-space-home',
      label: 'Home',
      icon: <HomeOutlined />,
      openRegex: regex,
      selectedRegex: regex,
      children: [
        {
          priority: 0,
          key: 'personal-space-settings',
          label: user?.isGuest ? (
            <GuestWarningButton>Settings</GuestWarningButton>
          ) : (
            <SpaceLink href="/settings">Settings</SpaceLink>
          ),
          icon: <SettingOutlined />,
          selectedRegex: regex,
        },
      ],
    });
  }

  if (
    systemAdmin &&
    msConfig.PROCEED_PUBLIC_IAM_ACTIVE &&
    !(
      msConfig.PROCEED_PUBLIC_IAM_ONLY_ONE_ORGANIZATIONAL_SPACE &&
      !msConfig.PROCEED_PUBLIC_IAM_PERSONAL_SPACES_ACTIVE
    )
  ) {
    layoutMenuItems.push({
      priority: 500,
      key: 'ms-admin',
      label: <Link href="/admin">MS Administration</Link>,
      icon: <SolutionOutlined />,
    });
  }

  if (middleCustomNavLinks.length > 0) {
    layoutMenuItems.push(
      {
        priority: 600,
        key: 'middle-custom-links-divider',
        type: 'divider',
      },
      {
        priority: 700,
        key: 'middle-custom-links',
        type: 'group',
        label: externalServicesLabel,
        children: middleCustomNavLinks.map((link, idx) => ({
          priority: idx * 100,
          key: idx,
          label: <CustomLink link={link} />,
          icon: customLinkIcons.find((icon) => icon.value === link.icon)?.icon || <LinkOutlined />,
        })),
      },
    );
  }

  const logo = (await getSpaceLogo(activeEnvironment.spaceId))?.spaceLogo ?? undefined;

  return (
    <>
      <SetAbility
        rules={userRules}
        environmentId={activeEnvironment.spaceId}
        treeMap={await getSpaceFolderTree(activeEnvironment.spaceId)}
      />
      <CustomLinkStateProvider spaceId={activeEnvironment.spaceId}>
        <Layout
          loggedIn={!!userId}
          userEnvironments={userEnvironments}
          layoutMenuItems={layoutMenuItems}
          activeSpace={activeEnvironment}
          customLogo={logo}
          userNeedsToChangePassword={userNeedsToChangePassword}
          bottomMenuItems={bottomNavLinks}
          showTasklistSidebarEntry={
            msConfig.PROCEED_PUBLIC_PROCESS_AUTOMATION_ACTIVE &&
            automationSettings &&
            automationSettings.active !== false &&
            automationSettings.tasklist?.active !== false
          }
          showTaskEditorSidebarEntry={
            msConfig.PROCEED_PUBLIC_PROCESS_AUTOMATION_ACTIVE &&
            automationSettings &&
            automationSettings.active !== false &&
            automationSettings.task_editor?.active !== false
          }
        >
          {children}
        </Layout>
      </CustomLinkStateProvider>
    </>
  );
};

export default DashboardLayout;
