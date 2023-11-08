'use client';
import { FC, useEffect, useState } from 'react';
import Content from './content';
import {
  Space,
  Card,
  Avatar,
  Divider,
  Row,
  Col,
  Button,
  Skeleton,
  Form,
  Input,
  Typography,
  Popconfirm,
  Result,
  Modal,
  App,
} from 'antd';
import styles from './userProfile.module.scss';
import { useAbilityStore } from '@/lib/abilityStore';
import {
  ApiData,
  ApiRequestBody,
  useGetAsset,
  usePutAsset,
  useDeleteAsset,
} from '@/lib/fetch-data';
import { RightOutlined } from '@ant-design/icons';
import { signOut, useSession } from 'next-auth/react';

type modalInputField = {
  userDataField: keyof ApiData<'/users/{id}', 'get'>;
  submitField: keyof ApiRequestBody<'/users/{id}', 'put'>;
  label: string;
  password?: boolean;
};

type modalInput = ({ password: true } | { password: false; inputFields: modalInputField[] }) & {
  title: string;
};

const UserDataModal: FC<{
  structure: modalInput;
  modalOpen: boolean;
  close: () => void;
  messageApi: ReturnType<typeof App.useApp>['message'];
}> = ({ structure, modalOpen, close, messageApi }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const { data } = useSession();
  const user = data!.user;

  const { data: userData, isLoading } = useGetAsset('/users/{id}', {
    params: {
      path: { id: user.id },
    },
  });
  const defaultValues: Record<string, any> = {};

  if (!structure.password && userData)
    for (const input of structure.inputFields)
      defaultValues[input.submitField] = userData[input.userDataField];

  const { mutateAsync: changeUserData } = usePutAsset('/users/{id}');
  const { mutateAsync: changePassword } = usePutAsset('/users/{id}/update-password');

  useEffect(() => {
    return form.resetFields();
  }, [form, modalOpen]);

  const submitData = async (values: Record<string, any>) => {
    if (!userData) return;

    setLoading(true);

    try {
      if (structure.password) {
        await changePassword({
          params: { path: { id: user.id } },
          body: { password: form.getFieldValue('password') },
        });
      } else {
        const body = {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          username: userData.username,
          ...values,
        };

        await changeUserData({
          params: { path: { id: user.id } },
          body,
        });
      }

      messageApi.success({ content: 'Profile updated' });
      close();
    } catch (e) {
      messageApi.error({ content: 'An error ocurred' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={modalOpen} onCancel={close} footer={null} title={structure.title}>
      <Skeleton loading={isLoading}>
        <br />
        <Form form={form} layout="vertical" onFinish={submitData} initialValues={defaultValues}>
          {structure.password ? (
            <>
              <Form.Item
                name="password"
                label="Password"
                rules={[
                  {
                    required: true,
                    message: 'Please input your password!',
                  },
                ]}
                hasFeedback
              >
                <Input.Password />
              </Form.Item>

              <Form.Item
                name="confirm_password"
                label="Confirm Password"
                dependencies={['password']}
                hasFeedback
                rules={[
                  {
                    required: true,
                    message: 'Please confirm your password!',
                  },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('password') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(
                        new Error('The new password that you entered do not match!'),
                      );
                    },
                  }),
                ]}
              >
                <Input.Password />
              </Form.Item>
              <br />
            </>
          ) : (
            structure.inputFields.map((input) => (
              <Form.Item
                key={input.submitField}
                label={input.label}
                name={input.submitField}
                required
              >
                <Input />
              </Form.Item>
            ))
          )}

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>
              Submit
            </Button>
          </Form.Item>
        </Form>
      </Skeleton>
    </Modal>
  );
};

const UserDataRow: FC<{ title: string; data?: string; onClick: () => void }> = ({
  title,
  data,
  onClick,
}) => {
  return (
    <Button
      type="text"
      block={true}
      onClick={onClick}
      style={{
        borderRadius: '0',
        height: '100%',
        padding: '14px',
      }}
    >
      <Row>
        <Col lg={6} md={5} sm={7} xs={8} style={{ textAlign: 'left' }}>
          <Typography.Text>{title}</Typography.Text>
        </Col>
        <Col lg={16} md={15} sm={13} xs={12} style={{ textAlign: 'left' }}>
          <Typography.Text ellipsis={true}>{data || ''}</Typography.Text>
        </Col>
        <Col lg={2} md={2} sm={2} xs={1}>
          <RightOutlined />
        </Col>
      </Row>
    </Button>
  );
};

const UserProfile: FC = () => {
  const { data } = useSession();
  const user = data!.user;

  const [changeNameModalOpen, setChangeNameModalOpen] = useState(false);
  const [changeEmailModalOpen, setChangeEmailModalOpen] = useState(false);
  const [changePasswordOpen, setPasswordOpen] = useState(false);
  const [deleteUserPopup, setDeleteUserPopup] = useState(false);

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

      <Content title="User Profile">
        <Space direction="vertical" size="large" style={{ display: 'flex' }}>
          <Card className={styles.Card} /* style={{ width: 300 }} */>
            <Skeleton loading={isLoading}>
              <Avatar size={64} src={userData && userData.picture} />
              <Divider style={{ marginBottom: '0' }} />
              <UserDataRow
                title="Name"
                data={`${(userData && userData.firstName) || ''} ${
                  (userData && userData.lastName) || ''
                }`}
                onClick={() => setChangeNameModalOpen(true)}
              />
              <Divider style={{ margin: '0' }} />
              <UserDataRow
                title="Username"
                data={userData && userData.username}
                onClick={() => setChangeNameModalOpen(true)}
              />
              <Divider style={{ margin: '0' }} />
              <UserDataRow
                title="Email"
                data={userData && userData.email}
                onClick={() => setChangeEmailModalOpen(true)}
              />
              <Divider style={{ marginTop: '0' }} />
              <Space direction="vertical">
                <Button type="primary" onClick={() => setPasswordOpen(true)}>
                  Change Password
                </Button>
                <Popconfirm
                  title="Delete account"
                  description="Are you sure you want to delete your account?"
                  open={deleteUserPopup}
                  onOpenChange={setDeleteUserPopup}
                  onConfirm={deleteUser}
                  okText="Yes"
                  cancelText="No"
                >
                  <Button danger>Delete account</Button>
                </Popconfirm>
              </Space>
            </Skeleton>
          </Card>
        </Space>
      </Content>
    </>
  );
};

export default UserProfile;
