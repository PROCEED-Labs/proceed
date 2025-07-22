import { useTransition } from 'react';
import { Button, Form, Input, Modal, App, ModalProps } from 'antd';
import { setUserPassword } from '@/lib/data/users';
import { wrapServerCall } from '@/lib/wrap-server-call';
import { useSession } from '@/components/auth-can';

export default function ChangeUserPasswordModal({
  open,
  close: _close,
  title,
  modalProps,
}: {
  open: boolean;
  close: (passwordChanged?: true) => void;
  title?: string;
  modalProps?: ModalProps;
}) {
  const session = useSession();
  const [form] = Form.useForm();
  const [loading, startTransition] = useTransition();
  const app = App.useApp();

  function close(passwordChanged?: true) {
    _close(passwordChanged);
    form.resetFields();
  }

  // This should not be possible
  if (!session || session.status !== 'authenticated') {
    return null;
  }

  function submitData(values: any) {
    startTransition(() => {
      wrapServerCall({
        fn: () => setUserPassword(values.password),
        onSuccess: () => {
          app.message.success('Password updated');
          // true -> password was changed
          close(true);
        },
        app,
      });
    });
  }

  return (
    <Modal
      open={open}
      onCancel={() => close()}
      onOk={() => form.submit()}
      footer={null}
      title={title}
      {...modalProps}
    >
      <Form form={form} layout="vertical" onFinish={submitData}>
        <Form.Item
          name="password"
          label="Password"
          rules={[{ required: true, message: 'Please input your password' }]}
          required
        >
          <Input.Password />
        </Form.Item>
        <Form.Item
          name="confirm-password"
          label="Confirm Password"
          rules={[
            { required: true, message: 'Please input your password' },
            ({ getFieldValue }) => ({
              validator() {
                const password = getFieldValue('password');
                const confirmPassword = getFieldValue('confirm-password');
                if (password && confirmPassword && password !== confirmPassword) {
                  return Promise.reject(new Error("Doesn't match password"));
                }

                return Promise.resolve();
              },
            }),
          ]}
          required
        >
          <Input.Password />
        </Form.Item>

        <Button type="primary" htmlType="submit" loading={loading}>
          Submit
        </Button>
      </Form>
    </Modal>
  );
}
