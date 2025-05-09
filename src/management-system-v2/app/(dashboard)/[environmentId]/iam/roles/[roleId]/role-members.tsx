'use client';

import { FC, useState, useTransition } from 'react';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import UserList, { UserListProps } from '@/components/user-list';
import { App, Button, Modal, Tooltip } from 'antd';
import ConfirmationButton from '@/components/confirmation-button';
import { addRoleMappings, deleteRoleMappings } from '@/lib/data/role-mappings';
import { useRouter } from 'next/navigation';
import { Role, RoleWithMembers } from '@/lib/data/role-schema';
import { AuthenticatedUser } from '@/lib/data/user-schema';
import { useEnvironment } from '@/components/auth-can';
import { wrapServerCall } from '@/lib/wrap-server-call';

const AddUserModal: FC<{
  role: Role;
  usersNotInRole: AuthenticatedUser[];
  open: boolean;
  close: () => void;
}> = ({ role, usersNotInRole, open, close }) => {
  const [loading, startTransition] = useTransition();
  const router = useRouter();
  const environment = useEnvironment();
  const app = App.useApp();

  type AddUserParams = Parameters<NonNullable<UserListProps['selectedRowActions']>>;

  const addUsers = (users: AddUserParams[2], clearIds?: AddUserParams[1]) => {
    startTransition(async () => {
      await wrapServerCall({
        fn: () =>
          addRoleMappings(
            environment.spaceId,
            users.map((user) => ({
              userId: user.id,
              roleId: role.id,
            })),
          ),
        onSuccess: () => {
          if (clearIds) clearIds();
          router.refresh();
        },
        app,
      });
    });
  };

  return (
    <Modal
      open={open}
      onCancel={close}
      footer={null}
      width={800}
      title={`Add members to ${role.name}`}
    >
      <UserList
        /* ---- */
        /* TODO: unify role-members and users-page in terms of side panel
        Pretty sure that many states and prop drilling are not needed that way
      */
        /* ---- */
        users={usersNotInRole}
        loading={loading}
        columns={(clearSelected, _, selectedRowKeys) => [
          {
            dataIndex: 'id',
            render: (id, user) => (
              <Tooltip placement="top" title="Add to role">
                <Button
                  icon={<PlusOutlined />}
                  type="primary"
                  onClick={() => addUsers([user], clearSelected)}
                >
                  Add to role
                </Button>
              </Tooltip>
            ),
          },
        ]}
        selectedRowActions={(_, clearIds, users) => (
          <Tooltip placement="top" title="Add to role">
            <Button icon={<PlusOutlined />} type="text" onClick={() => addUsers(users, clearIds)} />
          </Tooltip>
        )}
      />
    </Modal>
  );
};

const RoleMembers: FC<{
  role: Role;
  usersInRole: RoleWithMembers['members'];
  usersNotInRole: AuthenticatedUser[];
}> = ({ role, usersInRole, usersNotInRole }) => {
  const [addUserModalOpen, setAddUserModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const environment = useEnvironment();
  const app = App.useApp();

  async function deleteMembers(userIds: string[], clearIds: () => void) {
    setLoading(true);

    await wrapServerCall({
      fn: () =>
        deleteRoleMappings(
          environment.spaceId,
          userIds.map((userId) => ({
            roleId: role.id,
            userId: userId,
          })),
        ),
      onSuccess: () => {
        router.refresh();
        clearIds();
      },
      app,
    });

    setLoading(false);
  }

  return (
    <>
      <AddUserModal
        role={role}
        usersNotInRole={usersNotInRole}
        open={addUserModalOpen}
        close={() => setAddUserModalOpen(false)}
      />

      <UserList
        /* ---- */
        /* TODO: unify role-members and users-page in terms of side panel
        Pretty sure that many states and prop drilling are not needed that way
      */
        /* ---- */
        users={usersInRole}
        loading={loading}
        columns={(clearSelected, hoveredId, selectedRowKeys) => [
          {
            dataIndex: 'id',
            key: 'remove',
            title: '',
            width: 100,
            render: (id: string) => (
              <Tooltip placement="top" title="Remove Member">
                <ConfirmationButton
                  title="Remove Member"
                  description="Are you sure you want to remove this member?"
                  onConfirm={() => deleteMembers([id], clearSelected)}
                  buttonProps={{
                    style: { opacity: hoveredId == id && selectedRowKeys.length === 0 ? 1 : 0 },
                    icon: <DeleteOutlined />,
                    type: 'text',
                  }}
                />
              </Tooltip>
            ),
          },
        ]}
        selectedRowActions={(ids, clearIds) => (
          <Tooltip placement="top" title="Remove Members">
            <ConfirmationButton
              title="Remove Members"
              description="Are you sure you want to remove the selected members?"
              onConfirm={() => deleteMembers(ids, clearIds)}
              buttonProps={{
                icon: <DeleteOutlined />,
                type: 'text',
              }}
            />
          </Tooltip>
        )}
        createUserNode={
          <Button type="primary" onClick={() => setAddUserModalOpen(true)}>
            Add Member
          </Button>
        }
      />
    </>
  );
};

export default RoleMembers;
