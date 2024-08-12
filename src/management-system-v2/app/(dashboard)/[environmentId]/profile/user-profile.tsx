'use client';

import { FC, ReactNode, useState } from 'react';
import { Space, Card, Typography, App, Table, Alert, Modal, Form, Input } from 'antd';
import styles from './user-profile.module.scss';
import { RightOutlined } from '@ant-design/icons';
import { signOut } from 'next-auth/react';
import ConfirmationButton from '@/components/confirmation-button';
import UserDataModal from './user-data-modal';
import { User } from '@/lib/data/user-schema';
import { deleteUser as deleteUserServerAction } from '@/lib/data/users';
import UserAvatar from '@/components/user-avatar';
import { CloseOutlined } from '@ant-design/icons';
import useParseZodErrors, { antDesignInputProps } from '@/lib/useParseZodErrors';
import { z } from 'zod';
import { requestEmailChange as serverRequestEmailChange } from '@/lib/change-email/server-actions';
import Link from 'next/link';

const UserProfile: FC<{ userData: User }> = ({ userData }) => {
  const [changeNameModalOpen, setChangeNameModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<ReactNode | undefined>(undefined);

  const [changeEmailModalOpen, setChangeEmailModalOpen] = useState(false);
  const [errors, parseEmail] = useParseZodErrors(z.object({ email: z.string().email() }));
  const [changeEmailForm] = Form.useForm();

  const { message: messageApi, notification } = App.useApp();

  async function deleteUser() {
    try {
      const response = await deleteUserServerAction();
      if (response && 'error' in response) throw response;

      messageApi.success({ content: 'Your account was deleted' });
      signOut();
    } catch (e: unknown) {
      //@ts-ignore
      if (e?.error?.message as ReactNode) setErrorMessage(e.error.message);
      else messageApi.error({ content: 'An error ocurred' });
    }
  }

  async function requestEmailChange(values: unknown) {
    try {
      const data = parseEmail(values);
      if (!data) return;

      const response = await serverRequestEmailChange(data.email);
      if (response && 'error' in response) throw response;

      setChangeEmailModalOpen(false);
      notification.success({
        message: 'Email change request successful',
        description: 'Check your Email for the verification link',
      });
    } catch (e: unknown) {
      //@ts-ignore
      const content = (e?.error?.message as ReactNode) ? e.error.message : 'An error ocurred';
      messageApi.error({ content });
    }
  }

  const firstName = userData.guest ? 'Guest' : userData.firstName || '';
  const lastName = userData.guest ? '' : userData.lastName || '';

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

      <Modal
        title="Change your email address"
        open={changeEmailModalOpen}
        closeIcon={null}
        onCancel={() => setChangeEmailModalOpen(false)}
        onOk={changeEmailForm.submit}
        destroyOnClose
      >
        <Alert
          type="info"
          message="We'll send you a verification link to your new email address."
          style={{ marginBottom: '1rem' }}
        />
        <Form
          initialValues={userData}
          form={changeEmailForm}
          layout="vertical"
          onFinish={requestEmailChange}
        >
          <Form.Item label="Email" name="email" required {...antDesignInputProps(errors, 'email')}>
            <Input type="email" />
          </Form.Item>
        </Form>
      </Modal>

      <Space direction="vertical" className={styles.Container}>
        <Card className={styles.Card} style={{ margin: 'auto' }}>
          {errorMessage && (
            <Alert
              style={{ marginBottom: '1rem', paddingRight: '20px' }}
              message={errorMessage}
              type="error"
              closable={{
                closeIcon: (
                  <CloseOutlined style={{ position: 'absolute', top: '10px', right: '10px' }} />
                ),
              }}
              afterClose={() => setErrorMessage(null)}
            />
          )}
          <Typography.Title level={3}>Profile data</Typography.Title>

          <UserAvatar
            user={userData}
            avatarProps={{
              size: 90,
              style: { marginBottom: '1rem' },
            }}
          />

          <div
            style={{
              //blur
              position: 'relative',
            }}
          >
            {userData.guest && (
              <div
                style={{
                  zIndex: 100,
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: 0,
                  right: 0,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Alert
                  message={
                    <>
                      To change your profile data <Link href="/signin">Sign in</Link>
                    </>
                  }
                  type="info"
                />
              </div>
            )}
            <Table
              dataSource={[
                {
                  key: 'name',
                  title: 'Name',
                  value: `${firstName} ${lastName}`,
                  action: () => setChangeNameModalOpen(true),
                },
                {
                  key: 'username',
                  title: 'Username',
                  value: !userData.guest ? userData.username : 'Guest',
                  action: () => setChangeNameModalOpen(true),
                },
                {
                  key: 'email',
                  title: 'Email',
                  value: !userData.guest ? userData.email : 'Guest',
                  action: () => setChangeEmailModalOpen(true),
                },
              ]}
              columns={[
                { dataIndex: 'title' },
                { dataIndex: 'value' },
                {
                  key: 'action',
                  render: () => <RightOutlined />,
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
              style={{
                marginBottom: 16,
                ...(userData.guest && { filter: 'blur(7px)', pointerEvents: 'none' }),
              }}
            />
          </div>

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
              {userData.guest ? 'Delete Data' : 'Delete Account'}
            </ConfirmationButton>
          </Space>
        </Card>
      </Space>
    </>
  );
};

export default UserProfile;
