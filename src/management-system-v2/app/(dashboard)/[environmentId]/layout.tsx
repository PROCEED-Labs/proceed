import { PropsWithChildren } from 'react';
import { getCurrentEnvironment, getCurrentUser } from '@/components/auth';
import { SetAbility } from '@/lib/abilityStore';
import Layout from './layout-client';
import { getUserOrganizationEnvironments } from '@/lib/data/legacy/iam/memberships';
import { MenuProps } from 'antd';
import {
  FileOutlined,
  UnlockOutlined,
  UserOutlined,
  SettingOutlined,
  ControlOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import { getSpaceFolderTree, getUserRules } from '@/lib/authorization/authorization';
import { getEnvironmentById } from '@/lib/data/legacy/iam/environments';
import { Environment } from '@/lib/data/environment-schema';
import { LuBoxes, LuTable2 } from 'react-icons/lu';
import { MdOutlineComputer } from 'react-icons/md';
import { GoOrganization } from 'react-icons/go';
import { FaList } from 'react-icons/fa';
import { spaceURL } from '@/lib/utils';
import { adminRules } from '@/lib/ability/abilityHelper';
import { RemoveReadOnly } from '@/lib/typescript-utils';
import { env } from '@/lib/env-vars';

const DashboardLayout = async ({
  children,
  params,
}: PropsWithChildren<{ params: { environmentId: string } }>) => {
  const { userId, systemAdmin } = await getCurrentUser();

  const { activeEnvironment, ability } = await getCurrentEnvironment(params.environmentId);
  const can = ability.can.bind(ability);

  const userEnvironments: Environment[] = [getEnvironmentById(userId)];
  userEnvironments.push(
    ...getUserOrganizationEnvironments(userId).map((environmentId) =>
      getEnvironmentById(environmentId),
    ),
  );

  const userRules = systemAdmin
    ? (adminRules as RemoveReadOnly<typeof adminRules>)
    : await getUserRules(userId, activeEnvironment.spaceId);

  const layoutMenuItems: MenuProps['items'] = [];

  if (systemAdmin)
    layoutMenuItems.push({
      key: 'ms-admin',
      label: 'System Admin',
      type: 'group',
      children: [
        {
          key: 'admin-dashboard',
          label: <Link href="/admin">System dashboard</Link>,
          icon: <ControlOutlined />,
        },
      ],
    });

  if (can('view', 'Process') || can('view', 'Template')) {
    const children: MenuProps['items'] = [];

    if (can('view', 'Process'))
      children.push({
        key: 'processes',
        label: <Link href={spaceURL(activeEnvironment, `/processes`)}>Process List</Link>,
        icon: <FileOutlined />,
      });

    // if (can('view', 'Template'))
    //   children.push({
    //     key: 'templates',
    //     label: <Link href={spaceURL(activeEnvironment, `/templates`)}>Templates</Link>,
    //     icon: <ProfileOutlined />,
    //   });

    layoutMenuItems.push({
      key: 'processes-group',
      label: 'Processes',
      type: 'group',
      children,
    });

    layoutMenuItems.push({
      key: 'divider-processes',
      type: 'divider',
    });
  }
  if (env.NEXT_PUBLIC_ENABLE_EXECUTION) {
    const children: MenuProps['items'] = [];

    children.push({
      key: 'executions',
      label: <Link href={spaceURL(activeEnvironment, `/executions`)}>Instances</Link>,
      icon: <LuBoxes />,
    });

    children.push({
      key: 'engines',
      label: <Link href={spaceURL(activeEnvironment, `/engines`)}>Engines</Link>,
      icon: <MdOutlineComputer />,
    });

    children.push({
      key: 'tasklist',
      label: <Link href={spaceURL(activeEnvironment, `/tasklist`)}>Tasklist</Link>,
      icon: <FaList />,
    });

    layoutMenuItems.push({
      key: 'executions-group',
      label: 'Executions',
      type: 'group',
      children,
    });

    layoutMenuItems.push({
      key: 'divider-executions',
      type: 'divider',
    });
  }

  if (env.ENABLE_MACHINE_CONFIG) {
    layoutMenuItems.push({
      key: 'machine-config',
      label: <Link href={spaceURL(activeEnvironment, `/machine-config`)}>Machine Config</Link>,
      icon: <LuTable2 />,
    });

    layoutMenuItems.push({
      key: 'divider-machine-config',
      type: 'divider',
    });
  }

  if (
    ability.can('manage', 'User') ||
    ability.can('manage', 'RoleMapping') ||
    ability.can('manage', 'Role')
  ) {
    const children: MenuProps['items'] = [];

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
        icon: <UnlockOutlined />,
      });

    layoutMenuItems.push({
      key: 'iam-group',
      label: 'IAM',
      type: 'group',
      children,
    });

    layoutMenuItems.push({
      key: 'divider-iam',
      type: 'divider',
    });
  }

  if (can('view', 'Setting') || can('manage', 'Environment')) {
    const children: MenuProps['items'] = [];

    if (can('update', 'Environment') || can('delete', 'Environment'))
      children.push({
        key: 'organization-settings',
        label: (
          <Link href={spaceURL(activeEnvironment, `/organization-settings`)}>
            Organization Settings
          </Link>
        ),
        icon: <GoOrganization />,
      });

    if (can('view', 'Setting'))
      children.push({
        key: 'general-settings',
        label: (
          <Link href={spaceURL(activeEnvironment, `/general-settings`)}>General Settings</Link>
        ),
        icon: <SettingOutlined />,
      });

    layoutMenuItems.push({
      key: 'settings-group',
      label: 'Settings',
      type: 'group',
      children,
    });
  }

  return (
    <>
      <SetAbility
        rules={userRules}
        environmentId={activeEnvironment.spaceId}
        treeMap={getSpaceFolderTree(activeEnvironment.spaceId)}
      />
      <Layout
        loggedIn={!!userId}
        userEnvironments={userEnvironments}
        layoutMenuItems={layoutMenuItems}
        activeSpace={activeEnvironment}
      >
        {children}
      </Layout>
    </>
  );
};

export default DashboardLayout;
