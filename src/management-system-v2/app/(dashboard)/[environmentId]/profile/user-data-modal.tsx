'use client';

import { FC, useTransition } from 'react';
import { Button, Form, Input, Modal, App, ModalProps } from 'antd';
import { updateUser } from '@/lib/data/users';
import { User, AuthenticatedUserData, AuthenticatedUserDataSchema } from '@/lib/data/user-schema';
import useParseZodErrors from '@/lib/useParseZodErrors';
import { wrapServerCall } from '@/lib/wrap-server-call';
import { useSession } from '@/components/auth-can';

type modalInputField = {
  userDataField: keyof AuthenticatedUserData;
  submitField: keyof AuthenticatedUserData;
  label: string;
  password?: boolean;
};

type modalInput = {
  password: false;
  inputFields: modalInputField[];
  title: string;
};

const AuthenticatedUserDataModal: FC<{
  userData: User;
  structure: modalInput;
  modalOpen: boolean;
  close: () => void;
  modalProps?: ModalProps;
}> = ({ structure, modalOpen, close: propClose, userData, modalProps }) => {
  const session = useSession();
  const [form] = Form.useForm();
  const [loading, startTransition] = useTransition();
  const app = App.useApp();

  const [formatErrors, parseInput, resetErrors] = useParseZodErrors(
    AuthenticatedUserDataSchema.partial(),
  );

  function close() {
    resetErrors();
    propClose();
    form.setFieldsValue(userData);
  }

  const submitData = async (values: any) => {
    startTransition(async () => {
      const data = parseInput(values);
      if (!data) return;

      await wrapServerCall({
        fn: () => updateUser(values as AuthenticatedUserData),
        onSuccess: () => {
          app.message.success({ content: 'Profile updated' });
          session.update(null);
          close();
        },
        app,
      });
    });
  };

  return (
    <Modal open={modalOpen} onCancel={close} footer={null} title={structure.title} {...modalProps}>
      <Form form={form} layout="vertical" onFinish={submitData} initialValues={userData}>
        {structure.inputFields.map((input) => (
          <Form.Item
            key={input.submitField}
            label={input.label}
            name={input.submitField}
            validateStatus={input.submitField in formatErrors ? 'error' : ''}
            help={input.submitField in formatErrors ? formatErrors[input.submitField] : ''}
            required
          >
            <Input />
          </Form.Item>
        ))}

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>
            Submit
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AuthenticatedUserDataModal;
