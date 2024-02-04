'use client';

import { FC, useState, useTransition } from 'react';
import { DeleteOutlined } from '@ant-design/icons';
import { Tooltip, App } from 'antd';
import HeaderActions from './header-actions';
import UserList, { ListUser } from '@/components/user-list';
import ConfirmationButton from '@/components/confirmation-button';
import UserSidePanel from './user-side-panel';
import { deleteUsers as serverActionDeleteUsers } from '@/lib/data/users';
import { useRouter } from 'next/navigation';
import { User } from '@/lib/data/user-schema';

const UsersPage: FC<{ users: User[] }> = ({ users }) => {
  const { message: messageApi } = App.useApp();
  const [selectedUser, setSelectedUser] = useState<ListUser | null>(null);
  const [deletingUser, startTransition] = useTransition();
  const [showMobileUserSider, setShowMobileUserSider] = useState(false);

  const closeMobileUserSider = () => {
    setShowMobileUserSider(false);
  };

  const router = useRouter();

  async function deleteUsers(ids: string[], unsetIds: () => void) {
    startTransition(async () => {
      unsetIds();

      const result = await serverActionDeleteUsers(ids);

      if (result && 'error' in result)
        messageApi.open({ type: 'error', content: 'Something went wrong' });

      router.refresh();
    });
  }

  return (
    <UserList
      users={users}
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
      loading={deletingUser}
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
      createUserNode={<HeaderActions />}
      onSelectedRows={(users) => {
        setSelectedUser(users.length > 0 ? users[users.length - 1] : null);
      }}
      setShowMobileUserSider={setShowMobileUserSider}
      sidePanel={<UserSidePanel user={selectedUser}
      showMobileUserSider={showMobileUserSider}
      setShowMobileUserSider={setShowMobileUserSider}
      />}
    />
  );
};

export default UsersPage;
