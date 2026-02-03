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
import ActiveTasksBadge from '@/components/active-tasks-badge';

const DashboardLayout = async (
  props: PropsWithChildren<{ params: Promise<{ environmentId: string }> }>,
) => {
  const params = await props.params;

  const { children } = props;

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
        key: `top-${idx}`,
        label: <CustomLink link={link} />,
        icon: customLinkIcons.find((icon) => icon.value === link.icon)?.icon || <LinkOutlined />,
      })),
    );

    layoutMenuItems.push({
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
          key: 'processes-list',
          label: <Link href={spaceURL(activeEnvironment, `/processes/list`)}>List</Link>,
          icon: <CopyOutlined />,
          selectedRegex: '/processes/list($|/)',
        },
        documentationSettings.editor?.active !== false && {
          key: 'processes-editor',
          label: <Link href={spaceURL(activeEnvironment, `/processes/editor`)}>Editor</Link>,
          icon: <EditOutlined />,
          selectedRegex: '/processes/editor($|/)',
        },
      ].filter(truthyFilter);

      if (children.length)
        layoutMenuItems.push({
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

  if (msConfig.PROCEED_PUBLIC_PROCESS_AUTOMATION_ACTIVE && automationSettings.active !== false) {
    let childRegex = '';
    let children: ExtendedMenuItems = [];

    if (
      msConfig.PROCEED_PUBLIC_PROCESS_AUTOMATION_TASK_EDITOR_ACTIVE &&
      automationSettings.task_editor?.active !== false
    ) {
      childRegex = '/tasks($|/)';
      children.push({
        key: 'task-editor',
        label: <Link href={spaceURL(activeEnvironment, `/tasks`)}>Editor</Link>,
        icon: <EditOutlined />,
        selectedRegex: childRegex,
      });
    }

    let pollingInterval = 10000;

    if (Number.isInteger(automationSettings.taskPollingInterval)) {
      pollingInterval = automationSettings.taskPollingInterval;
    }

    layoutMenuItems.push({
      key: 'tasklist',
      label: (
        <Link style={{ color: 'inherit' }} href={spaceURL(activeEnvironment, `/tasklist`)}>
          My Tasks
          <ActiveTasksBadge activeSpace={activeEnvironment} pollingInterval={pollingInterval} />
        </Link>
      ),
      icon: (
        <Link href={spaceURL(activeEnvironment, `/tasklist`)}>
          <CheckSquareOutlined />
          <ActiveTasksBadge
            activeSpace={activeEnvironment}
            onIcon
            pollingInterval={pollingInterval}
          />
        </Link>
      ),
      selectedRegex: '/tasklist($|/)',
      openRegex: childRegex,
      children: children.length ? children : undefined,
    });
  }

  if (msConfig.PROCEED_PUBLIC_PROCESS_AUTOMATION_ACTIVE) {
    if (automationSettings.active !== false) {
      let childRegex = '';
      let children: ExtendedMenuItems = [];

      if (automationSettings.dashboard?.active !== false) {
        const dashboardRegex = '/executions-dashboard($|/)';
        childRegex = !childRegex ? dashboardRegex : `(${childRegex})|(${dashboardRegex})`;
        children.push({
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
          key: 'machines',
          label: <Link href={spaceURL(activeEnvironment, `/engines`)}>Process Engines</Link>,
          icon: <LaptopOutlined />,
          selectedRegex: machinesRegex,
        });
      }

      if (children.length) {
        layoutMenuItems.push({
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
        key: 'roles',
        label: <Link href={spaceURL(activeEnvironment, `/iam/roles`)}>Roles</Link>,
        icon: <TeamOutlined />,
        selectedRegex: rolesRegex,
      });
    }

    layoutMenuItems.push({
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
      key: 'iam-personal',
      label: 'Personal',
      icon: <TbUser />,
      selectedRegex: regex,
      openRegex: regex,
      children: [
        {
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
      key: 'personal-space-home',
      label: 'Home',
      icon: <HomeOutlined />,
      openRegex: regex,
      selectedRegex: regex,
      children: [
        {
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
      key: 'ms-admin',
      label: <Link href="/admin">MS Administration</Link>,
      icon: <SolutionOutlined />,
    });
  }

  if (middleCustomNavLinks.length > 0) {
    layoutMenuItems.push(
      {
        key: 'middle-custom-links-divider',
        type: 'divider',
      },
      {
        key: 'middle-custom-links',
        type: 'group',
        label: externalServicesLabel,
        children: middleCustomNavLinks.map((link, idx) => ({
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
        >
          {children}
        </Layout>
      </CustomLinkStateProvider>
    </>
  );
};

export default DashboardLayout;
