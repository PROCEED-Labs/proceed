'use client';

import React, { useState } from 'react';

import { Button, Modal, Form, Input } from 'antd';

import { FormInstance } from 'antd/es/form';

const ModalSubmitButton = ({ form, onSubmit }: { form: FormInstance; onSubmit: Function }) => {
  const [submittable, setSubmittable] = useState(false);

  // Watch all values
  const values = Form.useWatch([], form);

  React.useEffect(() => {
    form.validateFields({ validateOnly: true }).then(
      () => {
        setSubmittable(true);
      },
      () => {
        setSubmittable(false);
      },
    );
  }, [form, values]);

  return (
    <Button
      type="primary"
      htmlType="submit"
      disabled={!submittable}
      onClick={() => {
        onSubmit(values);
        form.resetFields();
      }}
    >
      Create Process
    </Button>
  );
};

type ProcessModalProps = {
  show: boolean;
  close: (values?: { name: string; description: string }) => void;
};
const ProcessModal: React.FC<ProcessModalProps> = ({ show, close }) => {
  const [form] = Form.useForm();

  return (
    <Modal
      title="Create new Process"
      open={show}
      onCancel={() => {
        close();
      }}
      footer={[
        <Button
          key="cancel"
          onClick={() => {
            close();
          }}
        >
          Cancel
        </Button>,
        <ModalSubmitButton key="submit" form={form} onSubmit={close}></ModalSubmitButton>,
      ]}
    >
      <Form form={form} name="name" wrapperCol={{ span: 24 }} autoComplete="off">
        <Form.Item
          name="name"
          rules={[{ required: true, message: 'Please input the Process Name!' }]}
        >
          <Input placeholder="Process Name" />
        </Form.Item>
        <Form.Item
          name="description"
          rules={[{ required: true, message: 'Please input the Process Description!' }]}
        >
          <Input.TextArea
            showCount
            maxLength={150}
            style={{ height: 100 }}
            placeholder="Process Description"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ProcessModal;
