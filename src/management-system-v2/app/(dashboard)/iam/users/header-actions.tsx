'use client';

import { AuthCan } from '@/components/auth-can';
import { UserSchema } from '@/lib/data/user-schema';
import { addUser } from '@/lib/data/users';
import useParseZodErrors from '@/lib/useParseZodErrors';
import { PlusOutlined } from '@ant-design/icons';
import { Button, Form, App, Input, Modal, Grid } from 'antd';
import { useRouter } from 'next/navigation';
import { FC, useEffect, useState, useTransition } from 'react';

const modalStructureWithoutPassword = [
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
] as const;

const CreateUserModal: FC<{
  modalOpen: boolean;
  close: () => void;
}> = ({ modalOpen, close }) => {
  const { message: messageApi } = App.useApp();
  const router = useRouter();

  const [form] = Form.useForm();
  const [formErrors, parseInput] = useParseZodErrors(UserSchema);

  const [submittable, setSubmittable] = useState(false);
  const values = Form.useWatch([], form);
  const breakpoint = Grid.useBreakpoint();


  useEffect(() => {
    form.validateFields({ validateOnly: true }).then(
      () => {
        setSubmittable(true);
      },
      () => {
        setSubmittable(false);
      },
    );
  }, [form, values]);

  const [isLoading, startTransition] = useTransition();

  useEffect(() => {
    form.resetFields();
  }, [form, modalOpen]);

  const submitData = (values: any) => {
    startTransition(async () => {
      try {
        form.validateFields();

        const data = parseInput({ ...values, oauthProvider: 'email' });
        if (!data) return;

        const result = await addUser(data);
        if (result && 'error' in result) throw new Error();

        messageApi.success({ content: 'Account created' });
        router.refresh();
        close();
      } catch (e) {
        messageApi.error({ content: 'An error ocurred' });
      }
    });
  };

  return (
    <Modal open={modalOpen} onCancel={close} footer={null} title="Create New User">
      <Form form={form} layout="vertical" onFinish={submitData}>
        {modalStructureWithoutPassword.map((formField) => (
          <Form.Item
            key={formField.dataKey}
            label={formField.label}
            name={formField.dataKey}
            validateStatus={formField.dataKey in formErrors ? 'error' : ''}
            help={formField.dataKey in formErrors ? formErrors[formField.dataKey] : ''}
            hasFeedback
            required
          >
            <Input type={formField.type} />
          </Form.Item>
        ))}

        <Form.Item>
          {breakpoint.xl ? (<Button type="primary" htmlType="submit" loading={isLoading} disabled={!submittable}>
            Create User
          </Button>) : (
            <Button type="text" htmlType="submit" loading={isLoading} disabled={!submittable}>
            <PlusOutlined />
          </Button>
          )}
        </Form.Item>
      </Form>
    </Modal>
  );
};

const HeaderActions: FC = () => {
  const [createUserModalOpen, setCreateUserModalOpen] = useState(false);
  const breakpoint = Grid.useBreakpoint();


  return (
    <>
      <CreateUserModal
        modalOpen={createUserModalOpen}
        close={() => setCreateUserModalOpen(false)}
      />
      <AuthCan action="create" resource="User">
        {/* TODO: fix icon for float button in button group */}
        <Button type="primary" onClick={() => setCreateUserModalOpen(true)}>
          {breakpoint.xl ? (<><PlusOutlined /> Create User</>) : (<PlusOutlined />)}
        </Button>
      </AuthCan>
    </>
  );
};

export default HeaderActions;
