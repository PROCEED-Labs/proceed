'use client';

import { FC, useTransition } from 'react';
import { Button, Form, Input, Modal, App } from 'antd';
import { updateUser } from '@/lib/data/users';
import { User, AuthenticatedUserData, AuthenticatedUserDataSchema } from '@/lib/data/user-schema';
import { useRouter } from 'next/navigation';
import useParseZodErrors from '@/lib/useParseZodErrors';

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
  AuthenticateduserData: User;
  structure: modalInput;
  modalOpen: boolean;
  close: () => void;
}> = ({ structure, modalOpen, close: propClose, AuthenticateduserData }) => {
  const [form] = Form.useForm();
  const [loading, startTransition] = useTransition();
  const { message } = App.useApp();
  const router = useRouter();

  const [formatErrors, parseInput, resetErrors] = useParseZodErrors(
    AuthenticatedUserDataSchema.partial(),
  );

  function close() {
    resetErrors();
    propClose();
    form.setFieldsValue(AuthenticateduserData);
  }

  const submitData = async (values: any) => {
    startTransition(async () => {
      try {
        const data = parseInput(values);
        if (!data) return;

        const result = await updateUser(values as AuthenticatedUserData);
        if (result && 'error' in result) throw new Error();

        message.success({ content: 'Profile updated' });
        router.refresh();
        close();
      } catch (e) {
        message.error({ content: 'An error ocurred' });
      }
    });
  };

  return (
    <Modal open={modalOpen} onCancel={close} footer={null} title={structure.title}>
      <Form
        form={form}
        layout="vertical"
        onFinish={submitData}
        initialValues={AuthenticateduserData}
      >
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
