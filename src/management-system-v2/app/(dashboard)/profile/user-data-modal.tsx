'use client';

import { FC, useEffect, useState } from 'react';
import { Button, Skeleton, Form, Input, Modal, App } from 'antd';
import { ApiData, ApiRequestBody, useGetAsset, usePutAsset } from '@/lib/fetch-data';
import { useSession } from 'next-auth/react';

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
}> = ({ structure, modalOpen, close }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { message } = App.useApp();

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

      message.success({ content: 'Profile updated' });
      close();
    } catch (e) {
      message.error({ content: 'An error ocurred' });
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

export default UserDataModal;
