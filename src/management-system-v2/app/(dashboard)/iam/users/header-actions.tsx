'use client';

import { AuthCan } from '@/lib/clientAuthComponents';
import { ApiRequestBody, usePostAsset } from '@/lib/fetch-data';
import { PlusOutlined } from '@ant-design/icons';
import { Button, Form, App, Input, Modal } from 'antd';
import { FC, ReactNode, useEffect, useState } from 'react';

type PostUserField = keyof ApiRequestBody<'/users', 'post'>;

const modalStructureWithoutPassword: {
  dataKey: PostUserField;
  label: string;
  type: string;
}[] = [
  {
    dataKey: 'firstName',
    label: 'First Name',
    type: 'text',
  },
  {
    dataKey: 'lastName',
    label: 'Last Name',
    type: 'text',
  },
  {
    dataKey: 'username',
    label: 'Username Name',
    type: 'text',
  },
  {
    dataKey: 'email',
    label: 'Email',
    type: 'email',
  },
];

const fieldNameToLabel: Record<PostUserField, string> = modalStructureWithoutPassword.reduce(
  (acc, curr) => {
    acc[curr.dataKey] = curr.label;
    return acc;
  },
  {} as Record<PostUserField, string>,
);

const CreateUserModal: FC<{
  modalOpen: boolean;
  close: () => void;
}> = ({ modalOpen, close }) => {
  const [form] = Form.useForm();
  const { message: messageApi } = App.useApp();
  type ErrorsObject = { [field in PostUserField]?: ReactNode[] };
  const [formatError, setFormatError] = useState<ErrorsObject>({});

  const { mutateAsync: postUser, isLoading } = usePostAsset('/users', {
    onError(e) {
      if (!(typeof e === 'object' && e !== null && 'errors' in e)) {
        return;
      }

      const errors: { [key in PostUserField]?: ReactNode[] } = {};

      function appendError(key: PostUserField, error: string) {
        error = error.replace(key, fieldNameToLabel[key]);

        if (key in errors) {
          errors[key]!.push(<p key={errors[key]?.length}>{error}</p>);
        } else {
          errors[key] = [<p key={0}>{error}</p>];
        }
      }

      for (const error of e.errors as string[]) {
        if (error.includes('username')) appendError('username', error);
        else if (error.includes('email')) appendError('email', error);
        else if (error.includes('firstName')) appendError('firstName', error);
        else if (error.includes('lastName')) appendError('lastName', error);
        else if (error.includes('password')) appendError('password', error);
      }

      setFormatError(errors);
    },
  });

  useEffect(() => {
    form.resetFields();
    setFormatError({});
  }, [form, modalOpen]);

  const submitData = async (
    values: Record<keyof ApiRequestBody<'/users', 'post'> | 'confirm_password', string>,
  ) => {
    try {
      await postUser({
        body: {
          email: values.email,
          firstName: values.firstName,
          lastName: values.lastName,
          username: values.username,
          password: values.password,
        },
      });
      messageApi.success({ content: 'Account created' });
      close();
    } catch (e) {
      messageApi.error({ content: 'An error ocurred' });
    }
  };

  return (
    <Modal open={modalOpen} onCancel={close} footer={null}>
      <Form form={form} layout="vertical" onFinish={submitData}>
        {modalStructureWithoutPassword.map((formField) => (
          <Form.Item
            key={formField.dataKey}
            label={formField.label}
            name={formField.dataKey}
            validateStatus={formField.dataKey in formatError ? 'error' : ''}
            help={formField.dataKey in formatError ? formatError[formField.dataKey] : ''}
            hasFeedback
            required
          >
            <Input type={formField.type} />
          </Form.Item>
        ))}

        <Form.Item
          name="password"
          label="Password"
          rules={[
            {
              required: true,
              message: 'Please input your password!',
            },
          ]}
          validateStatus={'password' in formatError ? 'error' : ''}
          help={'password' in formatError ? formatError.password : ''}
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
                return Promise.reject(new Error('The new password that you entered do not match!'));
              },
            }),
          ]}
        >
          <Input.Password />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={isLoading}>
            Submit
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
};

const HeaderActions: FC = () => {
  const [createUserModalOpen, setCreateUserModalOpen] = useState(false);

  return (
    <>
      <CreateUserModal
        modalOpen={createUserModalOpen}
        close={() => setCreateUserModalOpen(false)}
      />

      <AuthCan action="create" resource="User">
        <Button type="primary" onClick={() => setCreateUserModalOpen(true)}>
          <PlusOutlined /> Create
        </Button>
      </AuthCan>
    </>
  );
};

export default HeaderActions;
