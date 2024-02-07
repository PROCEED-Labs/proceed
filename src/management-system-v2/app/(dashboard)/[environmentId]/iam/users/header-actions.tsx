'use client';

import { AuthCan, useEnvironment } from '@/components/auth-can';
import { inviteUsersToEnvironment } from '@/lib/data/environment-memberships';
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { Button, Form, App, Input, Modal, Space, Grid } from 'antd';
import { useRouter } from 'next/navigation';
import { FC, useEffect, useState, useTransition } from 'react';

const AddUsersModal: FC<{
  modalOpen: boolean;
  close: () => void;
}> = ({ modalOpen, close }) => {
  const { message: messageApi } = App.useApp();
  const router = useRouter();
  const environmentId = useEnvironment();

  const [form] = Form.useForm();
  const breakpoint = Grid.useBreakpoint();

  const [submittable, setSubmittable] = useState(false);
  const values = Form.useWatch([], form);

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

        const result = inviteUsersToEnvironment(environmentId, values.users);

        if (result && 'error' in result) throw new Error();

        messageApi.success({ content: 'User Added' });
        router.refresh();
        close();
      } catch (e) {
        messageApi.error({ content: 'An error ocurred' });
      }
    });
  };

  return (
    <Modal open={modalOpen} onCancel={close} footer={null} title="Add New User">
      <Form form={form} layout="vertical" onFinish={submitData}>
        <Form.List name="users">
          {(fields, { add, remove }, { errors }) => (
            <>
              {fields.map((field, index) => (
                <Space key={field.key} align="start" style={{ width: '100%' }}>
                  <Form.Item
                    {...field}
                    rules={[
                      { required: true, message: 'User Email is required' },
                      { type: 'email' },
                    ]}
                    style={{ width: '100%' }}
                  >
                    <Input placeholder="User Email" />
                  </Form.Item>
                  <Button
                    icon={<MinusCircleOutlined className="dynamic-delete-button" />}
                    type="text"
                    onClick={() => remove(field.name)}
                  />
                </Space>
              ))}

              <Form.Item>
                <Button
                  type="dashed"
                  onClick={() => add()}
                  style={{ width: '60%' }}
                  icon={<PlusOutlined />}
                >
                  Add User
                </Button>
              </Form.Item>
            </>
          )}
        </Form.List>

        <Form.Item>
          {breakpoint.xl ? (
            <Button type="primary" htmlType="submit" loading={isLoading} disabled={!submittable}>
              Add User
            </Button>
          ) : (
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
      <AddUsersModal modalOpen={createUserModalOpen} close={() => setCreateUserModalOpen(false)} />
      <AuthCan action="create" resource="User">
        {/* TODO: fix icon for float button in button group */}
        <Button type="primary" onClick={() => setCreateUserModalOpen(true)} icon={<PlusOutlined />}>
          {breakpoint.xl ? (
            <>
              <PlusOutlined /> Add User
            </>
          ) : (
            <PlusOutlined />
          )}
        </Button>
      </AuthCan>
    </>
  );
};

export default HeaderActions;
