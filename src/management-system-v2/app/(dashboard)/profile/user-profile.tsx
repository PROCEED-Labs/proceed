'use client';

import { FC, useState } from 'react';
import { Space, Card, Avatar, Button, Skeleton, Typography, Result, App, Table } from 'antd';
import styles from './user-profile.module.scss';
import { useGetAsset, useDeleteAsset } from '@/lib/fetch-data';
import { RightOutlined } from '@ant-design/icons';
import { signOut, useSession } from 'next-auth/react';
import ConfirmationButton from '@/components/confirmation-button';
import UserDataModal from './user-data-modal';

const UserProfile: FC = () => {
  const { data } = useSession();
  const user = data!.user;

  const [changeNameModalOpen, setChangeNameModalOpen] = useState(false);
  const [changeEmailModalOpen, setChangeEmailModalOpen] = useState(false);
  const [changePasswordOpen, setPasswordOpen] = useState(false);

  const { message: messageApi } = App.useApp();
  const { mutateAsync: deleteUserMutation } = useDeleteAsset('/users/{id}');

  const {
    error,
    data: userData,
    isLoading,
  } = useGetAsset('/users/{id}', { params: { path: { id: (user && user.id) || '' } } });

  async function deleteUser() {
    try {
      // Since this should only be callable once the user was loaded, we can assume that the user is not false.
      // Check is only for typescript.
      if (user && user.id) {
        await deleteUserMutation({
          params: { path: { id: user.id } },
        });
        messageApi.success({ content: 'Your account was deleted' });
        signOut();
      }
    } catch (e) {
      messageApi.error({ content: 'An error ocurred' });
    }
  }

  if (error)
    return (
      <Result
        status="error"
        title="Failed to fetch your profile"
        subTitle="An error ocurred while fetching your profile, please try again."
      />
    );

  return (
    <>
      <UserDataModal
        modalOpen={changePasswordOpen}
        close={() => setPasswordOpen((open) => !open)}
        structure={{
          title: 'Change your password',
          password: true,
        }}
        messageApi={messageApi}
      />
      <UserDataModal
        modalOpen={changeEmailModalOpen}
        close={() => setChangeEmailModalOpen((open) => !open)}
        structure={{
          title: 'Change your email',
          password: false,
          inputFields: [
            {
              label: 'Email',
              submitField: 'email',
              userDataField: 'email',
            },
          ],
        }}
        messageApi={messageApi}
      />
      <UserDataModal
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
        messageApi={messageApi}
      />

      <Space direction="vertical" className={styles.Container}>
        <Card className={styles.Card} style={{ margin: 'auto' }}>
          <Typography.Title level={3}>Account Information</Typography.Title>
          <Skeleton loading={isLoading}>
            <Avatar size={64} src={userData && userData.picture} style={{ marginBottom: 16 }} />
            <Table
              dataSource={[
                {
                  title: 'Name',
                  value: `${(userData && userData.firstName) || ''} ${
                    (userData && userData.lastName) || ''
                  }`,
                  action: () => setChangeNameModalOpen(true),
                },
                {
                  title: 'Username',
                  value: userData && userData.username,
                  action: () => setChangeNameModalOpen(true),
                },
                {
                  title: 'Email',
                  value: userData && userData.email,
                  action: () => setChangeEmailModalOpen(true),
                },
              ]}
              columns={[
                { dataIndex: 'title' },
                { dataIndex: 'value' },
                {
                  render: () => <RightOutlined />,
                },
              ]}
              onRow={(row) => ({
                onClick: row.action,
              })}
              showHeader={false}
              pagination={false}
              className={styles.Table}
              style={{ marginBottom: 16 }}
            />
            <Space direction="vertical">
              <Button type="primary" onClick={() => setPasswordOpen(true)}>
                Change Password
              </Button>
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
          </Skeleton>
        </Card>
      </Space>
    </>
  );
};

export default UserProfile;
