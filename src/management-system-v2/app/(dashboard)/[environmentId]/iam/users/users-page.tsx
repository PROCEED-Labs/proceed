'use client';

import { FC, useState, useTransition } from 'react';
import { DeleteOutlined, InfoCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { Tooltip, App, Grid, Button, FloatButton } from 'antd';
import HeaderActions, { FloatButtonActions } from './header-actions';
import UserList, { ListUser } from '@/components/user-list';
import ConfirmationButton from '@/components/confirmation-button';
import UserSidePanel from './user-side-panel';
import { useRouter } from 'next/navigation';
import { AuthenticatedUser } from '@/lib/data/user-schema';
import { removeUsersFromEnvironment } from '@/lib/data/environment-memberships';
import { useEnvironment } from '@/components/auth-can';
import { wrapServerCall } from '@/lib/user-error';

const UsersPage: FC<{ users: AuthenticatedUser[] }> = ({ users }) => {
  const { message: messageApi } = App.useApp();
  const breakpoint = Grid.useBreakpoint();
  const [selectedUser, setSelectedUser] = useState<ListUser | null>(null);
  const [deletingUser, startTransition] = useTransition();
  const [showMobileUserSider, setShowMobileUserSider] = useState(false);

  const router = useRouter();
  const environment = useEnvironment();

  async function removeUsers(ids: string[], unsetIds: () => void) {
    startTransition(async () => {
      unsetIds();

      await wrapServerCall({
        fn: () => removeUsersFromEnvironment(environment.spaceId, ids),
        onSuccess: router.refresh,
      });
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
        {breakpoint.xl ? undefined : (
          <FloatButton.Group
            trigger="click"
            type="primary"
            style={{ marginBottom: '60px', zIndex: '101' }}
            icon={<PlusOutlined />}
          >
            <Tooltip trigger="hover" placement="left" title="Create an user">
              <FloatButton icon={<FloatButtonActions />} />
            </Tooltip>
          </FloatButton.Group>
        )}

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
