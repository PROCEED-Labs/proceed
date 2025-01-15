//TODO

'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  Form,
  Input,
  App,
  Collapse,
  CollapseProps,
  Typography,
  Checkbox,
  Select,
  SelectProps,
} from 'antd';
import { UserError } from '@/lib/user-error';
import { useAddControlCallback } from '@/lib/controls-store';
import { CategoriesZod } from '@/lib/data/machine-config-schema';

type MachineConfigModalProps<T extends { name: string; description: string }> = {
  open: boolean;
  title: string;
  okText?: string;
  onCancel: () => void;
  onSubmit: (values: T[]) => Promise<{ error?: UserError } | void>;
  initialData?: T[];
  configType?: string;
  targetConfigExists?: boolean;
};

const MachineConfigModal = <T extends { name: string; description: string }>({
  open,
  title,
  okText,
  onCancel,
  onSubmit,
  initialData,
  configType,
  targetConfigExists,
}: MachineConfigModalProps<T>) => {
  const [form] = Form.useForm();
  const formRef = useRef(null);
  const [submitting, setSubmitting] = useState(false);
  const { message } = App.useApp();

  useEffect(() => {
    if (initialData && formRef.current) {
      // form.resetFields is not working, because initialData has not been
      // updated in the internal form store, eventhough the prop has.
      form.setFieldsValue(initialData);
    }
  }, [form, initialData]);

  const items: CollapseProps['items'] = initialData?.length
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
          content: 'Something went wrong while submitting the data',
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
        ref={formRef}
        layout="vertical"
        name="machine_config_form"
        initialValues={
          initialData ?? (configType === 'machine' && targetConfigExists)
            ? [{ copyTarget: true }]
            : undefined
        }
        autoComplete="off"
        // This resets the fields when the modal is opened again. (apparently
        // doesn't work in production, that's why we use the useEffect above)
        preserve={false}
      >
        {!initialData || initialData.length === 1 ? (
          <MachineConfigInputs
            index={0}
            configType={configType}
            targetConfigExists={targetConfigExists}
          />
        ) : (
          <Collapse style={{ maxHeight: '60vh', overflowY: 'scroll' }} accordion items={items} />
        )}
      </Form>
    </Modal>
  );
};

type MachineConfigInputsProps = {
  index: number;
  configType?: string;
  targetConfigExists?: boolean;
};

const MachineConfigInputs = ({
  index,
  configType,
  targetConfigExists,
}: MachineConfigInputsProps) => {
  const options: SelectProps['options'] = [];
  CategoriesZod.options.forEach((v) => {
    options.push({
      label: v,
      value: v,
    });
  });

  return (
    <>
      <Form.Item
        name={[index, 'name']}
        label="Configuration Name"
        rules={[{ required: true, message: 'Please fill out the Configuration Name' }]}
      >
        <Input />
      </Form.Item>
      <Form.Item
        name={[index, 'shortname']}
        label="ID"
        rules={[{ required: true, message: 'Please fill out the ID' }]}
      >
        <Input />
      </Form.Item>
      <Form.Item
        name={[index, 'categories']}
        label="Categories"
        rules={[{ required: true, message: 'Please select a Category' }]}
      >
        <Select
          mode="multiple"
          allowClear
          style={{ width: '100%' }}
          placeholder="Please select"
          defaultValue={[]}
          options={options}
        />
      </Form.Item>
      <Form.Item
        name={[index, 'description']}
        label="Configuration Description"
        rules={[
          {
            required: false,
            message: 'Please fill out the Configuration Description',
          },
        ]}
      >
        <Input.TextArea showCount rows={4} maxLength={150} />
      </Form.Item>
      {configType === 'machine' && (
        <Form.Item name={[index, 'copyTarget']} valuePropName="checked">
          <Checkbox defaultChecked disabled={!targetConfigExists}>
            Copy Target Tech Data
          </Checkbox>
        </Form.Item>
      )}
    </>
  );
};

export default MachineConfigModal;
