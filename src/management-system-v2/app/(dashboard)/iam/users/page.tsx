'use client';

import { FC } from 'react';
import { DeleteOutlined } from '@ant-design/icons';
import { Tooltip, Button, Popconfirm, App } from 'antd';
import { useGetAsset, useDeleteAsset } from '@/lib/fetch-data';
import Auth from '@/lib/AuthCanWrapper';
import Content from '@/components/content';
import HeaderActions from './header-actions';
import UserList from '@/components/user-list';
import { useQueryClient } from '@tanstack/react-query';

const UsersPage: FC = () => {
  const { message: messageApi } = App.useApp();
  const queryClient = useQueryClient();

  const { error, data, isLoading } = useGetAsset('/users', {});
  const { mutateAsync: deleteUser, isLoading: deletingUser } = useDeleteAsset('/users/{id}', {
    onError: () => messageApi.open({ type: 'error', content: 'Something went wrong' }),
    onSuccess: async () => await queryClient.invalidateQueries(['/users']),
  });

  async function deleteUsers(ids: string[], unsetIds?: () => void) {
    if (unsetIds) unsetIds();
    const promises = ids.map((id) => deleteUser({ params: { path: { id } } }));
    await Promise.allSettled(promises);
  }

  const columns = [
    {
      dataIndex: 'id',
      key: 'tooltip',
      title: '',
      width: 100,
      render: (id: string) => (
        <Tooltip placement="top" title="Delete">
          <Popconfirm
            title="Delete User"
            description="Are you sure you want to delete this user?"
            onConfirm={() => deleteUsers([id])}
          >
            <Button icon={<DeleteOutlined />} type="text" />
          </Popconfirm>
        </Tooltip>
      ),
    },
  ];

  return (
    <Content title="Identity and Access Management">
      <UserList
        users={data || []}
        error={!!error}
        columns={columns}
        loading={deletingUser || isLoading}
        selectedRowActions={(ids, clearIds) => (
          <Popconfirm
            title="Delete Users"
            description="Are you sure you want to delete the selected users?"
            onConfirm={() => deleteUsers(ids, clearIds)}
          >
            <Button type="text" icon={<DeleteOutlined />} />
          </Popconfirm>
        )}
        searchBarRightNode={<HeaderActions />}
      />
    </Content>
  );
};

export default Auth(
  {
    action: 'manage',
    resource: 'User',
    fallbackRedirect: '/',
  },
  UsersPage,
);
