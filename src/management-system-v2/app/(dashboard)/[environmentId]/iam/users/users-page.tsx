'use client';

import { FC, useState, useTransition } from 'react';
import { DeleteOutlined } from '@ant-design/icons';
import { Tooltip, App, Grid } from 'antd';
import HeaderActions from './header-actions';
import UserList, { ListUser } from '@/components/user-list';
import ConfirmationButton from '@/components/confirmation-button';
import UserSidePanel from './user-side-panel';
import { useRouter } from 'next/navigation';
import { User } from '@/lib/data/user-schema';
import { removeUsersFromEnvironment } from '@/lib/data/environment-memberships';
import { useEnvironment } from '@/components/auth-can';

const UsersPage: FC<{ users: User[] }> = ({ users }) => {
  const { message: messageApi } = App.useApp();
  const [selectedUser, setSelectedUser] = useState<ListUser | null>(null);
  const [deletingUser, startTransition] = useTransition();
  const [showMobileUserSider, setShowMobileUserSider] = useState(false);

  // const closeMobileUserSider = () => {
  //   setShowMobileUserSider(false);
  // };

  const router = useRouter();
  const environmentId = useEnvironment();

  async function removeUsers(ids: string[], unsetIds: () => void) {
    startTransition(async () => {
      unsetIds();

      const result = await removeUsersFromEnvironment(environmentId, ids);

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
            <Tooltip placement="top" title="Remove From Environment">
              <ConfirmationButton
                title="Remove User"
                description="Are you sure you want to remove this user?"
                onConfirm={() => removeUsers([id], clearSelected)}
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
          title="Remove Users"
          description="Are you sure you want to Remove the selected users?"
          onConfirm={() => removeUsers(ids, clearIds)}
          buttonProps={{
            type: 'text',
            icon: <DeleteOutlined />,
          }}
        />
      )}
      selectedUser={selectedUser}
      createUserNode={<HeaderActions />}
      onSelectedRows={(users) => {
        setSelectedUser(users.length > 0 ? users[users.length - 1] : null);
      }}
      setShowMobileUserSider={setShowMobileUserSider}
      showMobileUserSider={showMobileUserSider}
      sidePanel={
        <UserSidePanel
          user={selectedUser}
          showMobileUserSider={showMobileUserSider}
          setShowMobileUserSider={setShowMobileUserSider}
        />
      }
    />
  );
};

export default UsersPage;
