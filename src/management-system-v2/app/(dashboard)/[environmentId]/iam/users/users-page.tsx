'use client';

import { FC, useState, useTransition } from 'react';
import { DeleteOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { Tooltip, App, Grid, Button, Space, Popover } from 'antd';
import InviteUserButton, { FloatButtonActions } from './invite-users';
import UserList, { ListUser } from '@/components/user-list';
import ConfirmationButton from '@/components/confirmation-button';
import UserSidePanel from './user-side-panel';
import { useRouter } from 'next/navigation';
import { User } from '@prisma/client';
import { removeUsersFromEnvironment } from '@/lib/data/environment-memberships';
import { useEnvironment } from '@/components/auth-can';
import { wrapServerCall } from '@/lib/wrap-server-call';
import type { Role } from '@prisma/client';

import { CreateUsersModal } from './create-users';
import ResetUserPasswordButton from '@/components/reset-user-password-button';
import { AuthenticatedUser } from '@/lib/data/user-schema';
import { userRepresentation } from '@/lib/utils';
import SpaceLink from '@/components/space-link';

const UsersPage: FC<{ users: (User & { roles?: Role[] })[] }> = ({ users }) => {
  const app = App.useApp();
  const breakpoint = Grid.useBreakpoint();
  const [selectedUser, setSelectedUser] = useState<ListUser | null>(null);
  const [deletingUser, startTransition] = useTransition();
  const [showMobileUserSider, setShowMobileUserSider] = useState(false);

  const [createUserModalOpen, setCreateUserModalOpen] = useState(false);

  const router = useRouter();
  const environment = useEnvironment();

  async function removeUsers(ids: string[], unsetIds: () => void) {
    startTransition(() =>
      wrapServerCall({
        fn: () => removeUsersFromEnvironment(environment.spaceId, ids),
        onSuccess: () => {
          router.refresh();
          unsetIds();
        },
        app,
      }),
    );
  }

  return (
    <>
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
            users={users as AuthenticatedUser[]}
            columns={(clearSelected, hoveredId, selectedRowKeys) => [
              {
                dataIndex: 'roles',
                key: 'roles',
                title: 'Roles',
                render: (_, _user) => {
                  const user = _user as typeof _user & { roles: Role[] };
                  if (!user.roles) return;
                  return (
                    <Popover
                      title={`${userRepresentation({
                        firstName: user.firstName.value,
                        lastName: user.lastName.value,
                        username: user.username.value,
                      })}'s roles`}
                      content={
                        <div>
                          <ul style={{ padding: 0, listStylePosition: 'inside' }}>
                            {user.roles.map((role) => (
                              <li key={role.id}>
                                <SpaceLink href={`/iam/roles/${role.id}`}>{role.name}</SpaceLink>
                              </li>
                            ))}
                          </ul>
                        </div>
                      }
                      trigger="hover"
                    >
                      {user.roles.length}
                    </Popover>
                  );
                },
              },
              {
                dataIndex: 'id',
                key: 'tooltip',
                title: '',
                width: 100,
                render: (id: string, user) => (
                  <Space>
                    <Tooltip placement="top" title="Remove From Environment">
                      <ConfirmationButton
                        title="Remove User"
                        description="Are you sure you want to remove this user?"
                        onConfirm={() => removeUsers([id], clearSelected)}
                        buttonProps={{
                          icon: <DeleteOutlined />,
                          type: 'text',
                          style: {
                            opacity: hoveredId === id && selectedRowKeys.length === 0 ? 1 : 0,
                          },
                        }}
                      />
                    </Tooltip>
                    <ResetUserPasswordButton
                      user={{ id: user.id, username: user.username.value }}
                      style={{
                        opacity: hoveredId === id && selectedRowKeys.length === 0 ? 1 : 0,
                      }}
                      type="default"
                    >
                      Reset Password
                    </ResetUserPasswordButton>
                  </Space>
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
            createUserNode={
              <Space>
                <InviteUserButton />
                <Button type="primary" onClick={() => setCreateUserModalOpen(true)}>
                  Create User
                </Button>
              </Space>
            }
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

      <CreateUsersModal open={createUserModalOpen} close={() => setCreateUserModalOpen(false)} />
    </>
  );
};

export default UsersPage;
