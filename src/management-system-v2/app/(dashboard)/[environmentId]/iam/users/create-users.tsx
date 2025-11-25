import { useEnvironment } from '@/components/auth-can';
import { createUserAndAddToOrganization } from '@/lib/data/environment-memberships';
import { wrapServerCall } from '@/lib/wrap-server-call';
import {
  App,
  Button,
  Divider,
  Form,
  Input,
  Modal,
  ModalProps,
  Select,
  Space,
  Typography,
} from 'antd';
import { useRouter } from 'next/navigation';
import useOrganizationRoles from './use-org-roles';

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
  const { roles } = useOrganizationRoles(spaceId);

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
          roles: values.roles || [],
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
    <Modal open={open} onCancel={close} title="Create User" footer={null} {...modalProps}>
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

        {roles && roles.length > 0 && (
          <>
            <Divider />

            <Typography.Title style={{ marginBottom: 0 }}>Roles</Typography.Title>
            <Typography.Text style={{ display: 'block', marginBottom: '0.5rem' }}>
              You can select roles for this user.
            </Typography.Text>

            <Form.Item name="roles">
              <Select
                mode="multiple"
                allowClear
                style={{ width: '100%' }}
                placeholder="Select roles"
                options={roles.map((role) => ({ label: role.name, value: role.id }))}
              />
            </Form.Item>
          </>
        )}

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
