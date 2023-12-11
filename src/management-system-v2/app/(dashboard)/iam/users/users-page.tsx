'use client';

import { FC, useState } from 'react';
import { DeleteOutlined } from '@ant-design/icons';
import { Tooltip, App } from 'antd';
import { useGetAsset, useDeleteAsset } from '@/lib/fetch-data';
import Content from '@/components/content';
import HeaderActions from './header-actions';
import UserList, { ListUser } from '@/components/user-list';
import { useQueryClient } from '@tanstack/react-query';
import ConfirmationButton from '@/components/confirmation-button';
import UserSidePanel from './user-side-panel';

const UsersPage: FC = () => {
  const { message: messageApi } = App.useApp();
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<ListUser | null>(null);

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

  return (
    <Content title="Identity and Access Management">
      <UserList
        users={data || []}
        error={!!error}
        columns={(clearSelected, hoveredId, selectedRowKeys) => [
          {
            dataIndex: 'id',
            key: 'tooltip',
            title: '',
            width: 100,
            render: (id: string) => (
              <Tooltip placement="top" title="Delete">
                <ConfirmationButton
                  title="Delete User"
                  description="Are you sure you want to delete this user?"
                  onConfirm={() => deleteUsers([id], clearSelected)}
                  buttonProps={{
                    icon: <DeleteOutlined />,
                    type: 'text',
                    style: { opacity: hoveredId === id && selectedRowKeys.length === 0 ? 1 : 0 },
                  }}
                />
              </Tooltip>
            ),
          },
        ]}
        loading={deletingUser || isLoading}
        selectedRowActions={(ids, clearIds) => (
          <ConfirmationButton
            title="Delete Users"
            description="Are you sure you want to delete the selected users?"
            onConfirm={() => deleteUsers(ids, clearIds)}
            buttonProps={{
              type: 'text',
              icon: <DeleteOutlined />,
            }}
          />
        )}
        searchBarRightNode={<HeaderActions />}
        onSelectedRows={(users) => {
          console.log(users);
          setSelectedUser(users.length > 0 ? users[users.length - 1] : null);
        }}
        sidePanel={<UserSidePanel user={selectedUser} />}
      />
    </Content>
  );
};

export default UsersPage;
