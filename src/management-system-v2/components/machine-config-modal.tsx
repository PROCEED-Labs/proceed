//TODO

'use client';

import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, App, Collapse, CollapseProps, Typography } from 'antd';
import { UserError } from '@/lib/user-error';
import { useAddControlCallback } from '@/lib/controls-store';

type MachineConfigModalProps<T extends { name: string; description: string }> = {
  open: boolean;
  title: string;
  okText?: string;
  onCancel: () => void;
  onSubmit: (values: T[]) => Promise<{ error?: UserError } | void>;
  initialData?: T[];
};

const MachineConfigModal = <T extends { name: string; description: string }>({
  open,
  title,
  okText,
  onCancel,
  onSubmit,
  initialData,
}: MachineConfigModalProps<T>) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const { message } = App.useApp();

  useEffect(() => {
    if (initialData) {
      // form.resetFields is not working, because initialData has not been
      // updated in the internal form store, eventhough the prop has.
      form.setFieldsValue(initialData);
    }
  }, [form, initialData]);

  const items: CollapseProps['items'] =
    (initialData?.length ?? 0) > 1
      ? initialData?.map((data, index) => ({
          label: data.name,
          children: <MachineConfigInputs index={index} />,
        }))
      : undefined;

  const onOk = async () => {
    try {
      // form.validateFields() only contains field values (that have been
      // rendered), so we have to merge with initalData. If you only open
      // the third accordion item, the object would look like this:
      // { 2: { definitionName: 'test', description: 'test' } }
      const values = Object.entries(await form.validateFields()) as any[];
      const mergedValues = (initialData ?? [{}]).map((value, index) => ({
        ...value,
        ...values.find(([key]) => key === index.toString())?.[1],
      }));

      // Let the parent of this modal handle the submission.
      setSubmitting(true);
      try {
        const res = await onSubmit(mergedValues);
        if (res?.error) {
          // UserError was thrown by the server
          message.open({ type: 'error', content: res.error.message });
        }
      } catch (e) {
        // Unkown server error or was not sent from server (e.g. network error)
        message.open({
          type: 'error',
          content: 'Someting went wrong while submitting the data',
        });
      }
      setSubmitting(false);
    } catch (info) {
      // Validate Failed
    }
  };

  return (
    <Modal
      title={title}
      open={open}
      width={600}
      centered
      onCancel={() => {
        onCancel();
      }}
      // IMPORTANT: This prevents a modal being stored for every row in the
      // table.
      destroyOnClose
      okButtonProps={{ loading: submitting }}
      okText={okText}
      wrapProps={{ onDoubleClick: (e: MouseEvent) => e.stopPropagation() }}
      onOk={onOk}
    >
      <Form
        form={form}
        layout="vertical"
        name="machine_config_form"
        initialValues={initialData}
        autoComplete="off"
        // This resets the fields when the modal is opened again. (apparently
        // doesn't work in production, that's why we use the useEffect above)
        preserve={false}
      >
        {!initialData || initialData.length === 1 ? (
          <MachineConfigInputs index={0} />
        ) : (
          <Collapse style={{ maxHeight: '60vh', overflowY: 'scroll' }} accordion items={items} />
        )}
      </Form>
    </Modal>
  );
};

type MachineConfigInputsProps = {
  index: number;
};

const MachineConfigInputs = ({ index }: MachineConfigInputsProps) => {
  return (
    <>
      <Form.Item
        name={[index, 'name']}
        label="Machine Configuration Name"
        rules={[{ required: true, message: 'Please fill out the Machine Configuration Name' }]}
      >
        <Input />
      </Form.Item>
      <Form.Item
        name={[index, 'description']}
        label="Machine Configuration Description"
        rules={[
          { required: false, message: 'Please fill out the Machine Configuration Description' },
        ]}
      >
        <Input.TextArea showCount rows={4} maxLength={150} />
      </Form.Item>
    </>
  );
};

export default MachineConfigModal;
