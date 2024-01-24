'use client';

import { FC, useMemo, useState } from 'react';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { ApiData, useGetAsset } from '@/lib/fetch-data';
import UserList, { UserListProps } from '@/components/user-list';
import { Button, Modal, Tooltip } from 'antd';
import ConfirmationButton from '@/components/confirmation-button';
import { addRoleMappings, deleteRoleMappings } from '@/lib/data/role-mappings';
import { useRouter } from 'next/navigation';

type Role = ApiData<'/roles', 'get'>[number];
type Users = ApiData<'/users', 'get'>;

const AddUserModal: FC<{ role: Role; open: boolean; close: () => void }> = ({
  role,
  open,
  close,
}) => {
  const [loading, setLoading] = useState(false);
  const { data: users, refetch: refetchUsers, isLoading: usersLoading } = useGetAsset('/users', {});
  const router = useRouter();

  type AddUserParams = Parameters<NonNullable<UserListProps['selectedRowActions']>>;
  const addUsers = async (users: AddUserParams[2], clearIds?: AddUserParams[1]) => {
    if (clearIds) clearIds();
    setLoading(true);
    await addRoleMappings(
      users.map((user) => ({
        userId: user.id,
        roleId: role.id,
        email: user.email.value,
        lastName: user.lastName.value,
        firstName: user.firstName.value,
        username: user.username.value,
      })),
    );
    setLoading(false);
    refetchUsers();
    router.refresh();
  };

  const usersNotInRole = useMemo(() => {
    if (!users) return [];

    const usersInRole = new Set(role.members.map((member) => member.userId));

    return users.filter((user) => !usersInRole.has(user.id));
  }, [users, role.members]);

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
        loading={loading || usersLoading}
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

const RoleMembers: FC<{ role: Role }> = ({ role }) => {
  const [addUserModalOpen, setAddUserModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function deleteMembers(userIds: string[], clearIds: () => void) {
    clearIds();
    setLoading(true);

    await deleteRoleMappings(
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
      <AddUserModal role={role} open={addUserModalOpen} close={() => setAddUserModalOpen(false)} />

      <UserList
        users={role.members.map((member) => ({ ...member, id: member.userId }))}
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
