import { FC, PropsWithChildren } from 'react';
import { getCurrentEnvironment, getCurrentUser } from '@/components/auth';
import { SetAbility } from '@/lib/abilityStore';
import Layout from './layout-client';
import { getUserOrganizationEnviroments, isMember } from '@/lib/data/legacy/iam/memberships';
import { redirect } from 'next/navigation';
import { MenuProps } from 'antd';
import {
  FileOutlined,
  ProfileOutlined,
  UnlockOutlined,
  UserOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import { getUserRules } from '@/lib/authorization/authorization';

const DashboardLayout: FC<PropsWithChildren<{ params: { environmentId: string } }>> = async ({
  children,
  params,
}) => {
  const { userId } = await getCurrentUser();
  const { activeEnvironment, ability } = await getCurrentEnvironment(params.environmentId);
  const can = ability.can.bind(ability);

  if (activeEnvironment !== userId && !isMember(activeEnvironment, userId))
    redirect(`/${userId}/processes`);

  const userRules = await getUserRules(userId, activeEnvironment);

  const layoutMenuItems: MenuProps['items'] = [];

  if (can('view', 'Process') || can('view', 'Template')) {
    const children: MenuProps['items'] = [];

    if (can('view', 'Process'))
      children.push({
        key: 'processes',
        label: <Link href={`/${activeEnvironment}/processes`}>Process List</Link>,
        icon: <FileOutlined />,
      });

    if (can('view', 'Template'))
      children.push({
        key: 'templates',
        label: <Link href={`/${activeEnvironment}/templates`}>Templates</Link>,
        icon: <ProfileOutlined />,
      });

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

  if (
    ability.can('manage', 'User') ||
    ability.can('manage', 'RoleMapping') ||
    ability.can('manage', 'Role')
  ) {
    const children: MenuProps['items'] = [];

    if (can('manage', 'User'))
      children.push({
        key: 'users',
        label: <Link href={`/${activeEnvironment}/iam/users`}>Users</Link>,
        icon: <UserOutlined />,
      });

    if (ability.can('manage', 'RoleMapping') || ability.can('manage', 'Role'))
      children.push({
        key: 'roles',
        label: <Link href={`/${activeEnvironment}/iam/roles`}>Roles</Link>,
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

  if (ability.can('view', 'Setting')) {
    layoutMenuItems.push({
      key: 'settings-group',
      label: 'Settings',
      type: 'group',
      children: [
        {
          key: 'general-settings',
          label: <Link href={`/${activeEnvironment}/general-settings`}>General Settings</Link>,
          icon: <SettingOutlined />,
        },
      ],
    });
  }

  return (
    <>
      <SetAbility rules={userRules} environmentId={activeEnvironment} />
      <Layout loggedIn={!!userId} layoutMenuItems={layoutMenuItems}>
        {children}
      </Layout>
    </>
  );
};

export default DashboardLayout;
