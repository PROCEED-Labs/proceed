'use client';

import { FC, useState, useTransition } from 'react';
import { DeleteOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { Tooltip, App, Grid, Button } from 'antd';
import HeaderActions, { FloatButtonActions } from './header-actions';
import UserList, { ListUser } from '@/components/user-list';
import ConfirmationButton from '@/components/confirmation-button';
import UserSidePanel from './user-side-panel';
import { useRouter } from 'next/navigation';
import { AuthenticatedUser } from '@/lib/data/user-schema';
import { removeUsersFromEnvironment } from '@/lib/data/environment-memberships';
import { useEnvironment } from '@/components/auth-can';
import { Role } from '@/lib/data/role-schema';

const UsersPage: FC<{ users: (AuthenticatedUser & { roles?: Role[] })[] }> = ({ users }) => {
  const { message: messageApi } = App.useApp();
  const breakpoint = Grid.useBreakpoint();
  const [selectedUser, setSelectedUser] = useState<ListUser | null>(null);
  const [deletingUser, startTransition] = useTransition();
  const [showMobileUserSider, setShowMobileUserSider] = useState(false);

  const router = useRouter();
  const environment = useEnvironment();

  async function removeUsers(ids: string[], unsetIds: () => void) {
    startTransition(async () => {
      const result = await removeUsersFromEnvironment(environment.spaceId, ids);

      if (result && 'error' in result)
        messageApi.open({ type: 'error', content: 'Something went wrong' });

      unsetIds();
      router.refresh();
    });
  }

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        height: '100%',
        width: breakpoint.xs ? '100dvw' : '',
      }}
    >
      <div style={{ flex: '1' }}>
        {/* <!-- FloatButtonGroup needs a z-index of 101
            since BPMN Logo of the viewer has an z-index of 100 --> */}
        {!breakpoint.md && <FloatButtonActions />}

        <UserList
          users={users}
          columns={(clearSelected, hoveredId, selectedRowKeys) => [
            {
              dataIndex: 'roles',
              key: 'roles',
              title: 'Roles',
              render: (_, user: any) =>
                user.roles && (
                  <Tooltip title={user.roles.map((r: Role) => r.name).join(', ')}>
                    {user.roles.length}
                  </Tooltip>
                ),
            },
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
            {
              dataIndex: 'info',
              key: '',
              title: '',
              render: () => (
                <Button
                  style={{ float: 'right' }}
                  type="text"
                  onClick={() => setShowMobileUserSider(true)}
                >
                  <InfoCircleOutlined />
                </Button>
              ),
              responsive: breakpoint.xl ? ['xs'] : ['xs', 'sm'],
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
          createUserNode={<HeaderActions />}
          onSelectedRows={(users) => {
            setSelectedUser(users.length > 0 ? users[users.length - 1] : null);
          }}
        />
      </div>

      <UserSidePanel
        user={selectedUser}
        showMobileUserSider={showMobileUserSider}
        setShowMobileUserSider={setShowMobileUserSider}
      />
    </div>
  );
};

export default UsersPage;
