'use client';

import Content from '@/components/content';
import { Button, Card, Space, Tabs } from 'antd';
import { LeftOutlined } from '@ant-design/icons';
import Link from 'next/link';
import RoleGeneralData from './roleGeneralData';
import RolePermissions from './rolePermissions';
import RoleMembers from './role-members';
import { FC } from 'react';
import { Role } from '@/lib/data/role-schema';
import { useEnvironment } from '@/components/auth-can';
import { User } from '@/lib/data/user-schema';

const RoleId: FC<{ role: Role; usersInRole: User[]; usersNotInRole: User[] }> = ({
  role,
  usersInRole,
  usersNotInRole,
}) => {
  const environmentId = useEnvironment();

  return (
    <Content
      title={
        <Space>
          <Link href={`/${environmentId}/iam/roles`}>
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
