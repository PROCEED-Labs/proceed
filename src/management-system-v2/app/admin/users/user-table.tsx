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
import Link from 'next/link';

export default function UserTable({
  users,
  deleteUsers: serverDeleteUsers,
}: {
  users: {
    isGuest: false;
    id: string;
    email?: string | null;
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
      selectedRowActions={(selection, clearSelection) => (
        <ConfirmationButton
          title="Remove users"
          tooltip="Remove users"
          description="Are you sure you want to remove these users?"
          onConfirm={() => {
            clearSelection();
            removeUsers(selection);
          }}
          buttonProps={{
            type: 'text',
            icon: <DeleteOutlined />,
          }}
        />
      )}
      columns={[
        {
          title: 'Organizations',
          dataIndex: 'orgs',
          render: (orgs: number, user) => (
            <Tooltip
              title={`This user is a member of ${orgs} organization${orgs === 1 ? '' : 's'}`}
            >
              <Link href={`/admin/spaces/${user.id}`}>
                <GoOrganization /> {orgs}
              </Link>
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
