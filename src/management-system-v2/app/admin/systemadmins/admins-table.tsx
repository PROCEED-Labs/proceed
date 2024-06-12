'use client';

import UserList from '@/components/user-list';
import { addAdmin, deleteAdmins, getNonAdminUsers } from './page';
import styles from '@/components/item-list-view.module.scss';
import ConfirmationButton from '@/components/confirmation-button';
import React, { Suspense, useState } from 'react';
import { App, Button, Modal, Spin } from 'antd';
import { useRouter } from 'next/navigation';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { AuthenticatedUser } from '@/lib/data/user-schema';
import { SystemAdmin } from '@/lib/data/system-admin-schema';
import { SystemAdminCreation } from './system-admin-form';

export default function SystemAdminsTable({
  admins,
  deleteAdmins: serverDeleteAdmins,
  addAdmin,
  getNonAdminUsers,
}: {
  admins: (AuthenticatedUser & { role: SystemAdmin['role'] })[];
  deleteAdmins: deleteAdmins;
  addAdmin: addAdmin;
  getNonAdminUsers: getNonAdminUsers;
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

  const [addUserModal, setAddUserModal] = useState(false);

  return (
    <>
      <Modal
        open={addUserModal}
        onCancel={() => setAddUserModal(false)}
        closeIcon={null}
        title="Add admin"
        destroyOnClose
        okButtonProps={{ style: { display: 'none' } }}
      >
        <Suspense fallback={<Spin />}>
          <SystemAdminCreation
            getNonAdminUsers={getNonAdminUsers}
            addAdmins={addAdmin}
            onFinish={() => {
              router.refresh();
              setAddUserModal(false);
            }}
          />
        </Suspense>
      </Modal>

      <UserList
        users={admins}
        createUserNode={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddUserModal(true)}>
            Add admin
          </Button>
        }
        columns={(clearSelection) => [
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
                onConfirm={async () => {
                  clearSelection();
                  deleteAdmins([admin.id]);
                }}
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
    </>
  );
}
