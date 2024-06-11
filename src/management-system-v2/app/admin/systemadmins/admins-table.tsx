'use client';

import UserList from '@/components/user-list';
import { addAdmin, deleteAdmins } from './page';
import styles from '@/components/item-list-view.module.scss';
import ConfirmationButton from '@/components/confirmation-button';
import React from 'react';
import { App } from 'antd';
import { useRouter } from 'next/navigation';
import { DeleteOutlined } from '@ant-design/icons';
import { AuthenticatedUser } from '@/lib/data/user-schema';
import { SystemAdmin } from '@/lib/data/system-admin-schema';

export default function SystemAdminsTable({
  admins,
  deleteAdmins: serverDeleteAdmins,
}: {
  admins: (AuthenticatedUser & { role: SystemAdmin['role'] })[];
  deleteAdmins: deleteAdmins;
  addAdmin: addAdmin;
}) {
  const { message, notification } = App.useApp();
  const router = useRouter();

  async function deleteAdmins(adminIds: string[]) {
    try {
      const response = await serverDeleteAdmins(adminIds);
      if (response && 'error' in response) throw response.error.message;

      router.refresh();
      message.open({ type: 'success', content: `Admin${adminIds.length > 1 ? 's' : ''} removed` });
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
      users={admins}
      columns={[
        {
          title: 'Role',
          dataIndex: 'role',
        },
        {
          title: '',
          render: (_, admin) => (
            <ConfirmationButton
              title="Remove admin"
              tooltip="Remove admin"
              description="Are you sure you want to remove this admin's role?"
              onConfirm={() => deleteAdmins([admin.id])}
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
