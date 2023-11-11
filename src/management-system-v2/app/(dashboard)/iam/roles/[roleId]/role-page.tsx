'use client';

import Content from '@/components/content';
import { useGetAsset } from '@/lib/fetch-data';
import { Button, Result, Skeleton, Space, Tabs } from 'antd';
import { LeftOutlined } from '@ant-design/icons';
import { ComponentProps } from 'react';
import RoleGeneralData from './roleGeneralData';
import { useRouter } from 'next/navigation';
import RolePermissions from './rolePermissions';
import RoleMembers from './role-members';

type Items = ComponentProps<typeof Tabs>['items'];

function RolePage({ params: { roleId } }: { params: { roleId: string } }) {
  const router = useRouter();
  const {
    data: role,
    isLoading,
    error,
  } = useGetAsset('/roles/{id}', {
    params: { path: { id: roleId } },
  });

  const items: Items = role
    ? [
        {
          key: 'members',
          label: 'Manage Members',
          children: <RoleMembers role={role} isLoadingRole={isLoading} />,
        },
        { key: 'permissions', label: 'Permissions', children: <RolePermissions role={role} /> },
        {
          key: 'generalData',
          label: 'General Data',
          children: <RoleGeneralData roleId={roleId} />,
        },
      ]
    : [];

  if (error)
    return (
      <Result
        status="error"
        title="Failed to fetch role"
        subTitle="An error ocurred while fetching role, please try again."
      />
    );

  return (
    <Content
      title={
        <Space>
          <Button icon={<LeftOutlined />} onClick={() => router.push('/iam/roles')} type="text">
            Back
          </Button>
          {role?.name}
        </Space>
      }
    >
      <Skeleton loading={isLoading}>
        <Tabs items={items} />
      </Skeleton>
    </Content>
  );
}

export default RolePage;
