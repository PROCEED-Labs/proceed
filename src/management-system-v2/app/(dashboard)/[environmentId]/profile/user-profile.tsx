'use client';

import { FC, useState } from 'react';
import { Space, Card, Avatar, Typography, App, Table } from 'antd';
import styles from './user-profile.module.scss';
import { RightOutlined } from '@ant-design/icons';
import { signOut } from 'next-auth/react';
import ConfirmationButton from '@/components/confirmation-button';
import UserDataModal from './user-data-modal';
import { User } from '@/lib/data/user-schema';
import { deleteUser as deleteUserServerAction } from '@/lib/data/users';
import UserAvatar from '@/components/user-avatar';

const UserProfile: FC<{ userData: User }> = ({ userData }) => {
  const [changeNameModalOpen, setChangeNameModalOpen] = useState(false);

  const { message: messageApi } = App.useApp();

  async function deleteUser() {
    try {
      await deleteUserServerAction();

      messageApi.success({ content: 'Your account was deleted' });
      signOut();
    } catch (e) {
      messageApi.error({ content: 'An error ocurred' });
    }
  }

  return (
    <>
      <UserDataModal
        userData={userData}
        modalOpen={changeNameModalOpen}
        close={() => setChangeNameModalOpen((open) => !open)}
        structure={{
          title: 'Change your name',
          password: false,
          inputFields: [
            {
              label: 'First Name',
              submitField: 'firstName',
              userDataField: 'firstName',
            },
            {
              label: 'Last Name',
              submitField: 'lastName',
              userDataField: 'lastName',
            },
            {
              label: 'Username',
              submitField: 'username',
              userDataField: 'username',
            },
          ],
        }}
      />

      <Space direction="vertical" className={styles.Container}>
        <Card className={styles.Card} style={{ margin: 'auto' }}>
          <Typography.Title level={3}>Account Information</Typography.Title>

          <UserAvatar
            user={userData}
            avatarProps={{
              size: 120,
              style: { marginBottom: 120 },
            }}
          />

          <Table
            dataSource={[
              {
                title: 'Name',
                value: `${!userData.guest ? userData.firstName : 'Guest'} ${
                  !userData.guest ? userData.lastName : ''
                }`,
                action: () => setChangeNameModalOpen(true),
              },
              {
                title: 'Username',
                value: !userData.guest ? userData.username : 'Guest',
                action: () => setChangeNameModalOpen(true),
              },
              {
                title: 'Email',
                value: !userData.guest ? userData.email : 'Guest',
              },
            ]}
            columns={[
              { dataIndex: 'title' },
              { dataIndex: 'value' },
              {
                render: (_, row) => row.action && <RightOutlined />,
              },
            ]}
            onRow={(row) =>
              row.action
                ? {
                    onClick: row.action,
                  }
                : {}
            }
            showHeader={false}
            pagination={false}
            className={styles.Table}
            style={{ marginBottom: 16 }}
          />
          <Space direction="vertical">
            <ConfirmationButton
              title="Delete Account"
              description="Are you sure you want to delete your account?"
              onConfirm={deleteUser}
              modalProps={{
                okText: 'Delete Account',
              }}
              buttonProps={{ danger: true }}
            >
              Delete Account
            </ConfirmationButton>
          </Space>
        </Card>
      </Space>
    </>
  );
};

export default UserProfile;
