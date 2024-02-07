'use client';

import { UserOrganizationEnvironmentInputSchema } from '@/lib/data/environment-schema';
import { addOrganizationEnvironment } from '@/lib/data/environments';
import useParseZodErrors, { antDesignInputProps } from '@/lib/useParseZodErrors';
import { App, Button, Form, Input, Modal } from 'antd';
import { useRouter } from 'next/navigation';
import { FC, useState, useTransition } from 'react';

type CreateEnvironmentModalProps = {
  text?: string;
};

const CreateEnvironmentButton: FC<CreateEnvironmentModalProps> = ({ text }) => {
  const [form] = Form.useForm();
  const router = useRouter();
  const { message } = App.useApp();

  const [modalOpen, setModalOpen] = useState(false);
  const [loading, startTransition] = useTransition();
  const [formErrors, parseInput, resetFormErrors] = useParseZodErrors(
    UserOrganizationEnvironmentInputSchema,
  );

  function close() {
    setModalOpen(false);
    form.resetFields();
    resetFormErrors();
  }

  function createEnvironment(values: any) {
    values.logoUrl = undefined;
    startTransition(async () => {
      try {
        const userInput = parseInput(values);
        if (!userInput) return;

        const result = await addOrganizationEnvironment(userInput);
        if ('error' in result) throw new Error();

        message.open({ type: 'success', content: 'Environment created' });
        close();

        router.refresh();
      } catch (e) {
        message.open({ type: 'error', content: 'Failed to create environment' });
      }
    });
  }

  return (
    <>
      <Modal
        open={modalOpen}
        onCancel={close}
        onOk={() => form.submit()}
        closeIcon={null}
        title="Create Environment"
        okButtonProps={{ htmlType: 'submit' }}
      >
        <Form form={form} name="Create Environment" autoComplete="off" onFinish={createEnvironment}>
          <Form.Item name="name" {...antDesignInputProps(formErrors, 'name')} required>
            <Input placeholder="Environment Name" />
          </Form.Item>

          <Form.Item name="description" {...antDesignInputProps(formErrors, 'description')}>
            <Input.TextArea
              showCount
              maxLength={150}
              style={{ height: 100 }}
              placeholder="Environment Description"
            />
          </Form.Item>

          <Form.Item name="logoUrl" {...antDesignInputProps(formErrors, 'logoUrl')}>
            <Input placeholder="Environment Logo Url" />
          </Form.Item>
        </Form>
      </Modal>
      <Button type="primary" onClick={() => setModalOpen(true)}>
        {text ?? 'New Organization'}
      </Button>
    </>
  );
};

export default CreateEnvironmentButton;
