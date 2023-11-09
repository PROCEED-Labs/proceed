'use client';

import { FC, useMemo, useState } from 'react';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import {
  ApiData,
  useDeleteAsset,
  useGetAsset,
  useInvalidateAsset,
  usePostAsset,
} from '@/lib/fetch-data';
import UserList, { UserListProps } from '@/components/user-list';
import { Button, Modal, Popconfirm, Tooltip } from 'antd';

type Role = ApiData<'/roles', 'get'>[number];

const AddUserModal: FC<{ role: Role; open: boolean; close: () => void }> = ({
  role,
  open,
  close,
}) => {
  const { data: users, isLoading: isLoadingUsers } = useGetAsset('/users', {});
  const invalidateRole = useInvalidateAsset('/roles/{id}', { params: { path: { id: role.id } } });
  const { mutateAsync, isLoading: isLoadingMutation } = usePostAsset('/role-mappings', {
    onSuccess: invalidateRole,
  });

  type AddUserParams = Parameters<NonNullable<UserListProps['selectedRowActions']>>;
  const addUsers = async (users: AddUserParams[2], clearIds?: AddUserParams[1]) => {
    if (clearIds) clearIds();
    await mutateAsync({
      body: users.map((user) => ({
        userId: user.id,
        roleId: role.id,
        email: user.email,
        lastName: user.lastName,
        firstName: user.firstName,
        username: user.username,
      })),
      parseAs: 'text',
    });
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
        loading={isLoadingUsers || isLoadingMutation}
        columns={(clearSelected) => [
          {
            dataIndex: 'id',
            render: (_, user) => (
              <Tooltip placement="top" title="Add to role">
                <Button
                  icon={<PlusOutlined />}
                  type="text"
                  onClick={() => addUsers([user], clearSelected)}
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

const RoleMembers: FC<{ role: Role; isLoadingRole?: boolean }> = ({ role, isLoadingRole }) => {
  const [addUserModalOpen, setAddUserModalOpen] = useState(false);

  const refetchRole = useInvalidateAsset('/roles/{id}', { params: { path: { id: role.id } } });
  const { mutateAsync: deleteUser, isLoading: isLoadingDelete } = useDeleteAsset(
    '/role-mappings/users/{userId}/roles/{roleId}',
    { onSuccess: refetchRole },
  );

  async function deleteMembers(userIds: string[], clearIds?: () => void) {
    if (clearIds) clearIds();

    await Promise.allSettled(
      userIds.map((userId) =>
        deleteUser({
          parseAs: 'text',
          params: { path: { roleId: role.id, userId: userId } },
        }),
      ),
    );
  }

  return (
    <>
      <AddUserModal role={role} open={addUserModalOpen} close={() => setAddUserModalOpen(false)} />
      <UserList
        users={role.members.map((member) => ({ ...member, id: member.userId }))}
        loading={isLoadingDelete || isLoadingRole}
        columns={(clearSelected) => [
          {
            dataIndex: 'id',
            key: 'remove',
            title: '',
            width: 100,
            render: (id: string) => (
              <Tooltip placement="top" title="Remove member">
                <Popconfirm
                  title="Remove member"
                  description="Are you sure you want to remove this member?"
                  onConfirm={() => deleteMembers([id], clearSelected)}
                >
                  <Button icon={<DeleteOutlined />} type="text" />
                </Popconfirm>
              </Tooltip>
            ),
          },
        ]}
        selectedRowActions={(ids, clearIds) => (
          <Tooltip placement="top" title="Remove members">
            <Popconfirm
              title="Remove member"
              description="Are you sure you want to remove this member?"
              onConfirm={() => deleteMembers(ids, clearIds)}
            >
              <Button icon={<DeleteOutlined />} type="text" />
            </Popconfirm>
          </Tooltip>
        )}
        searchBarRightNode={
          <Button type="primary" onClick={() => setAddUserModalOpen(true)}>
            Add member
          </Button>
        }
      />
    </>
  );
};

export default RoleMembers;
