import Auth, { getCurrentUser } from '@/components/auth';
import Content from '@/components/content';
import { getRoleById } from '@/lib/data/legacy/iam/roles';
import { Button, Card, Result, Space, Tabs } from 'antd';
import { LeftOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { ComponentProps } from 'react';
import RoleGeneralData from './roleGeneralData';
import RolePermissions from './rolePermissions';
import RoleMembers from './role-members';

type Items = ComponentProps<typeof Tabs>['items'];

const Page = async ({ params: { roleId } }: { params: { roleId: string } }) => {
  const { ability } = await getCurrentUser();
  const role = getRoleById(roleId, ability);

  const items: Items = role
    ? [
        {
          key: 'generalData',
          label: 'General Data',
          children: <RoleGeneralData role={role} />,
        },
        { key: 'permissions', label: 'Permissions', children: <RolePermissions role={role} /> },
        {
          key: 'members',
          label: 'Manage Members',
          children: <RoleMembers role={role} />,
        },
      ]
    : [];

  if (!role)
    return (
      <Content>
        <Result status="404" title="Role not found" />
      </Content>
    );

  return (
    <Content
      title={
        <Space>
          <Link href="/iam/roles">
            <Button icon={<LeftOutlined />} type="text">
              Roles
            </Button>
          </Link>
          {role?.name}
        </Space>
      }
    >
      <div style={{ maxWidth: '800px', margin: 'auto' }}>
        <Card>
          <Tabs items={items} />
        </Card>
      </div>
    </Content>
  );
};

export default Auth(
  {
    action: ['view', 'manage'],
    resource: 'Role',
    fallbackRedirect: '/',
  },
  Page,
);
