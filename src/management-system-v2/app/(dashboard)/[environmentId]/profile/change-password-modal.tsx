import { ReactNode, useTransition } from 'react';
import PasswordInputFields from '@/components/password-input-fields';
import { Button, Form, Input, Modal, App, ModalProps, Space } from 'antd';
import { setUserPassword } from '@/lib/data/users';
import { wrapServerCall } from '@/lib/wrap-server-call';
import { useSession } from '@/components/auth-can';

export default function ChangeUserPasswordModal({
  open,
  close: _close,
  title,
  hint,
  modalProps,
}: {
  open: boolean;
  close?: (passwordChanged?: true) => void;
  title?: ReactNode;
  hint?: ReactNode;
  modalProps?: ModalProps;
}) {
  const session = useSession();
  const [form] = Form.useForm();
  const [loading, startTransition] = useTransition();
  const app = App.useApp();

  function close(passwordChanged?: true) {
    _close?.(passwordChanged);
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {hint}
        <Form form={form} layout="vertical" onFinish={submitData}>
          <PasswordInputFields />
          <Button type="primary" htmlType="submit" loading={loading}>
            Submit
          </Button>
        </Form>
      </div>
    </Modal>
  );
}
