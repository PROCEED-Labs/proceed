'use client';

import { DetailedHTMLProps, FC, HTMLAttributes, ReactNode, use, useEffect, useState } from 'react';
import { Space, Card, Typography, App, Table, Alert, Modal, Form, Input, theme, Image } from 'antd';
import styles from './user-profile.module.scss';
import { RightOutlined } from '@ant-design/icons';
import { signOut, useSession } from 'next-auth/react';
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
import { EnvVarsContext } from '@/components/env-vars-context';
import ImageUpload from '@/components/image-upload';
import { EntityType } from '@/lib/helpers/fileManagerHelpers';
import { useFileManager } from '@/lib/useFileManager';

const UserProfile: FC<{ userData: User }> = ({ userData }) => {
  const env = use(EnvVarsContext);

  const { message: messageApi, notification } = App.useApp();
  const {
    token: { colorTextDisabled, colorBgContainerDisabled },
  } = theme.useToken();
  const { download: getProfileUrl } = useFileManager({ entityType: EntityType.PROFILE_PICTURE });
  const [avatarUrl, setAvatarURl] = useState<string | undefined>();
  const session = useSession();

  useEffect(() => {
    if (!userData.isGuest && userData.profileImage) {
      getProfileUrl(userData.id, '', undefined, {
        onSuccess: (url) => {
          if (url?.fileUrl) setAvatarURl(`${url.fileUrl}?${Date.now()}`);
        },
      });
    }
  }, [userData]);

  const [changeNameModalOpen, setChangeNameModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<ReactNode | undefined>(undefined);

  const [changeEmailModalOpen, setChangeEmailModalOpen] = useState(false);
  const [errors, parseEmail] = useParseZodErrors(z.object({ email: z.string().email() }));
  const [changeEmailForm] = Form.useForm();

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

  const firstName = userData.isGuest ? 'Guest' : userData.firstName || '';
  const lastName = userData.isGuest ? '' : userData.lastName || '';

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

          <div
            style={{
              height: '120px',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Image
              alt="Profile picture"
              src={avatarUrl}
              style={{
                maxHeight: '120px',
                maxWidth: '120px',
              }}
              preview={{
                visible: false,
                mask: (
                  <ImageUpload
                    config={{
                      entityType: EntityType.PROFILE_PICTURE,
                      entityId: userData.id,
                      useDefaultRemoveFunction: true,
                      fileName: '',
                    }}
                    imageExists={!!avatarUrl}
                    onImageUpdate={() => {
                      session.update(null);
                      messageApi.success({ content: 'Profile picture updated successfully' });
                      getProfileUrl(userData.id, '', undefined, {
                        onSuccess: (url) => {
                          if (url?.fileUrl) setAvatarURl(`${url.fileUrl}?${Date.now()}`);
                        },
                      });
                    }}
                    onUploadFail={() => messageApi.error('Error uploading image')}
                    endpoints={{
                      postEndpoint: '',
                      deleteEndpoint: 'fake',
                      putEndpoint: '',
                    }}
                  />
                ),
              }}
            >
              <UserAvatar user={userData} size={90} style={{ marginBottom: '1rem' }} />
            </Image>
          </div>

          <div
            style={{
              //blur
              position: 'relative',
            }}
          >
            {userData.isGuest && (
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
                  value: !userData.isGuest ? userData.username : 'Guest',
                  action: () => setChangeNameModalOpen(true),
                },
                {
                  key: 'email',
                  title: 'Email',
                  value: !userData.isGuest ? userData.email : 'Guest',
                  action: () => setChangeEmailModalOpen(true),
                  disabled: !env.PROCEED_PUBLIC_IAM_SIGNIN_MAIL_ACTIVE,
                },
              ]}
              columns={[
                { dataIndex: 'title' },
                { dataIndex: 'value' },
                {
                  key: 'action',
                  render: (_, row) => <RightOutlined />,
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
              components={{
                body: {
                  row(props: any) {
                    let buttonProps: DetailedHTMLProps<
                      HTMLAttributes<HTMLTableRowElement>,
                      HTMLTableRowElement
                    >;

                    if (
                      props['data-row-key'] === 'email' &&
                      !env.PROCEED_PUBLIC_MAILSERVER_ACTIVE
                    ) {
                      buttonProps = {
                        style: {
                          color: colorTextDisabled,
                          backgroundColor: colorBgContainerDisabled,
                          pointerEvents: 'none',
                        },
                      };
                    } else {
                      buttonProps = {
                        style: {
                          cursor: 'pointer',
                        },
                        role: 'button',
                      };
                    }

                    return <tr {...props} {...buttonProps} />;
                  },
                },
              }}
              style={{
                marginBottom: 16,
                ...(userData.isGuest && { filter: 'blur(7px)', pointerEvents: 'none' }),
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
              {userData.isGuest ? 'Delete Data' : 'Delete Account'}
            </ConfirmationButton>
          </Space>
        </Card>
      </Space>
    </>
  );
};

export default UserProfile;
