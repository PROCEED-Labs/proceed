'use client';

import { FC, useMemo, useState, useTransition } from 'react';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { useGetAsset } from '@/lib/fetch-data';
import UserList, { UserListProps } from '@/components/user-list';
import { Button, Modal, Tooltip } from 'antd';
import ConfirmationButton from '@/components/confirmation-button';
import { addRoleMappings, deleteRoleMappings } from '@/lib/data/role-mappings';
import { useRouter } from 'next/navigation';
import { Role } from '@/lib/data/role-schema';
import { User } from '@/lib/data/user-schema';
import { useEnvironment } from '@/components/auth-can';

const AddUserModal: FC<{
  role: Role;
  usersNotInRole: User[];
  open: boolean;
  close: () => void;
}> = ({ role, usersNotInRole, open, close }) => {
  const [loading, startTransition] = useTransition();
  const router = useRouter();
  const environmentId = useEnvironment();

  type AddUserParams = Parameters<NonNullable<UserListProps['selectedRowActions']>>;

  const addUsers = (users: AddUserParams[2], clearIds?: AddUserParams[1]) => {
    startTransition(async () => {
      if (clearIds) clearIds();
      await addRoleMappings(
        environmentId,
        users.map((user) => ({
          userId: user.id,
          roleId: role.id,
        })),
      );
      router.refresh();
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
        users={usersNotInRole}
        loading={loading}
        columns={(clearSelected, hoveredId, selectedRowKeys) => [
          {
            dataIndex: 'id',
            render: (id, user) => (
              <Tooltip placement="top" title="Add to role">
                <Button
                  icon={<PlusOutlined />}
                  type="text"
                  onClick={() => addUsers([user], clearSelected)}
                  style={{
                    opacity: hoveredId === id && selectedRowKeys.length === 0 ? 1 : 0,
                  }}
                />
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

const RoleMembers: FC<{ role: Role; usersInRole: User[]; usersNotInRole: User[] }> = ({
  role,
  usersInRole,
  usersNotInRole,
}) => {
  const [addUserModalOpen, setAddUserModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const environmentId = useEnvironment();

  async function deleteMembers(userIds: string[], clearIds: () => void) {
    clearIds();
    setLoading(true);

    await deleteRoleMappings(
      environmentId,
      userIds.map((userId) => ({
        roleId: role.id,
        userId: userId,
      })),
    );

    setLoading(false);
    router.refresh();
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
        searchBarRightNode={
          <Button type="primary" onClick={() => setAddUserModalOpen(true)}>
            Add Member
          </Button>
        }
      />
    </>
  );
};

export default RoleMembers;
