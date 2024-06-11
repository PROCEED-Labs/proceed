'use client';

import UserList from '@/components/user-list';
import { GoOrganization } from 'react-icons/go';
import { deleteUsers } from './page';
import styles from '@/components/item-list-view.module.scss';
import ConfirmationButton from '@/components/confirmation-button';
import React from 'react';
import { App, Tooltip } from 'antd';
import { useRouter } from 'next/navigation';
import { DeleteOutlined } from '@ant-design/icons';

export default function UserTable({
  users,
  deleteUsers: serverDeleteUsers,
}: {
  users: {
    guest: false;
    id: string;
    email: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    orgs: number;
  }[];
  deleteUsers: deleteUsers;
}) {
  const { message, notification } = App.useApp();
  const router = useRouter();

  async function removeUsers(userIds: string[]) {
    try {
      const response = await serverDeleteUsers(userIds);
      if (response && 'error' in response) throw response.error.message;

      router.refresh();
      message.open({ type: 'success', content: `User${userIds.length > 1 ? 's' : ''} removed` });
    } catch (error) {
      if (typeof error === 'string' || React.isValidElement(error))
        return notification.open({
          type: 'error',
          message: error,
        });

      message.open({ type: 'error', content: 'Something went wrong' });
    }
  }

  return (
    <UserList
      users={users}
      columns={[
        {
          title: 'Organizations',
          dataIndex: 'orgs',
          render: (orgs: number) => (
            <Tooltip
              title={`This user is a member of ${orgs} organization${orgs === 1 ? '' : 's'}`}
            >
              <GoOrganization /> {orgs}
            </Tooltip>
          ),
        },
        {
          title: '',
          render: (_, user) => (
            <ConfirmationButton
              title="Remove user"
              tooltip="Remove user"
              description="Are you sure you want to remove this user?"
              onConfirm={() => removeUsers([user.id])}
              buttonProps={{
                type: 'text',
                icon: <DeleteOutlined />,
                className: styles.HoverableTableCell,
              }}
            />
          ),
        },
      ]}
    />
  );
}
