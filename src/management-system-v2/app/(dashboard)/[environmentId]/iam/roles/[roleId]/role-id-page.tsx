import Content from '@/components/content';
import { Button, Card, Space, Tabs } from 'antd';
import { LeftOutlined } from '@ant-design/icons';
import RoleGeneralData from './roleGeneralData';
import RolePermissions from './rolePermissions';
import RoleMembers from './role-members';
import { FC } from 'react';
import { Role } from '@/lib/data/role-schema';
import { AuthenticatedUser } from '@/lib/data/user-schema';
import SpaceLink from '@/components/space-link';

const RoleId: FC<{
  role: Role;
  usersInRole: AuthenticatedUser[];
  usersNotInRole: AuthenticatedUser[];
}> = ({ role, usersInRole, usersNotInRole }) => {
  return (
    <Content
      title={
        <Space>
          <SpaceLink href={`/iam/roles`}>
            <Button icon={<LeftOutlined />} type="text">
              Roles
            </Button>
          </SpaceLink>
          {role?.name}
        </Space>
      }
    >
      <div style={{ maxWidth: '800px', margin: 'auto' }}>
        <Card>
          <Tabs
            items={[
              {
                key: 'generalData',
                label: 'General Data',
                children: <RoleGeneralData role={role} />,
              },
              {
                key: 'permissions',
                label: 'Permissions',
                children: <RolePermissions role={role} />,
              },
              {
                key: 'members',
                label: 'Manage Members',
                children: (
                  <RoleMembers
                    role={role}
                    usersNotInRole={usersNotInRole}
                    usersInRole={usersInRole}
                  />
                ),
              },
            ]}
          />
        </Card>
      </div>
    </Content>
  );
};

export default RoleId;
