'use client';

import React, { useState } from 'react';

import { Button, Modal, Form, Input } from 'antd';

const ModalSubmitButton = ({
  submittable,
  onSubmit,
  submitText,
}: {
  submittable: boolean;
  onSubmit: Function;
  submitText: string;
}) => {
  return (
    <Button
      type="primary"
      htmlType="submit"
      disabled={!submittable}
      onClick={() => {
        onSubmit();
      }}
    >
      {submitText}
    </Button>
  );
};

type ProcessModalProps = {
  show: boolean;
  close: (values?: { name: string; description?: string }) => void;
  initialProcessData?: { name?: string; description?: string };
};
const ProcessModal: React.FC<ProcessModalProps> = ({ show, close, initialProcessData }) => {
  const [submittable, setSubmittable] = useState(false);
  const [form] = Form.useForm();

  // Watch all values
  const values = Form.useWatch([], form);

  React.useEffect(() => {
    form.setFieldsValue(initialProcessData);
  }, [form, initialProcessData]);

  React.useEffect(() => {
    // Only allow to submit in modal if any of the values was changed
    const initialFieldValuesModified =
      form.isFieldsTouched() &&
      (form.getFieldValue('name') !== initialProcessData?.name ||
        form.getFieldValue('description') !== initialProcessData?.description);

    if (initialFieldValuesModified) {
      form.validateFields({ validateOnly: true }).then(
        () => {
          setSubmittable(true);
        },
        () => {
          setSubmittable(false);
        },
      );
    } else {
      setSubmittable(false);
    }
  }, [form, initialProcessData, values]);

  return (
    <Modal
      title={initialProcessData ? 'Edit Process' : 'Create new Process'}
      open={show}
      onCancel={() => {
        close();
        form.resetFields();
      }}
      footer={[
        <Button
          key="cancel"
          onClick={() => {
            close();
            form.resetFields();
          }}
        >
          Cancel
        </Button>,
        <ModalSubmitButton
          key="submit"
          submittable={submittable}
          onSubmit={() => {
            close(values);
            form.resetFields();
          }}
          submitText={initialProcessData ? 'Edit Process' : 'Create Process'}
        ></ModalSubmitButton>,
      ]}
    >
      <Form form={form} name="name" wrapperCol={{ span: 24 }} autoComplete="off">
        <Form.Item
          name="name"
          initialValue={initialProcessData?.name}
          rules={[{ required: true, message: 'Please input the Process Name!' }]}
        >
          <Input placeholder="Process Name" />
        </Form.Item>
        <Form.Item name="description" initialValue={initialProcessData?.description}>
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
