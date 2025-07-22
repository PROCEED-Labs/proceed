import { useEnvironment } from '@/components/auth-can';
import { createUserAndAddToOrganization } from '@/lib/data/environment-memberships';
import { wrapServerCall } from '@/lib/wrap-server-call';
import { App, Button, Form, Input, Modal, ModalProps, Space } from 'antd';
import { useRouter } from 'next/navigation';

// TODO: check permissions

export function CreateUsersModal({
  open,
  close: _close,
  modalProps,
}: {
  open: boolean;
  close: () => void;
  modalProps?: ModalProps;
}) {
  const app = App.useApp();
  const [form] = Form.useForm();
  const { spaceId } = useEnvironment();
  const router = useRouter();

  function close() {
    _close();
    form.resetFields();
  }

  function submitUser(values: any) {
    wrapServerCall({
      fn: () =>
        createUserAndAddToOrganization(spaceId, {
          firstName: values.firstName,
          lastName: values.lastName,
          username: values.username,
          password: values.password,
        }),
      onSuccess: () => {
        router.refresh();
        app.message.success('User created successfully');
        close();
      },
      app,
    });
  }

  return (
    <Modal open={open} onClose={close} footer={null} title="Create User" {...modalProps}>
      <Form form={form} onFinish={submitUser} layout="vertical">
        <Form.Item name="firstName" label="First Name" rules={[{ required: true }]} required>
          <Input />
        </Form.Item>

        <Form.Item name="lastName" label="Last Name" rules={[{ required: true }]} required>
          <Input />
        </Form.Item>

        <Form.Item name="username" label="Username" rules={[{ required: true }]} required>
          <Input />
        </Form.Item>

        <Form.Item name="password" label="Initial Password" rules={[{ required: true }]} required>
          <Input.Password />
        </Form.Item>

        <Form.Item
          name="Confirm Initial Password"
          label="confirm-password"
          rules={[{ required: true }]}
          required
        >
          <Input.Password />
        </Form.Item>

        <Space style={{ justifyContent: 'end', width: '100%' }}>
          <Button onClick={close}>Cancel</Button>
          <Button type="primary" htmlType="submit">
            Submit
          </Button>
        </Space>
      </Form>
    </Modal>
  );
}
