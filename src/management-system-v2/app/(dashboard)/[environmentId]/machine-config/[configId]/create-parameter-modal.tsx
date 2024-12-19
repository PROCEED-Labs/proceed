'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Modal, Form, Input, App, Collapse, CollapseProps, Select, Card, Typography } from 'antd';
import { UserError } from '@/lib/user-error';
import { Localization, languageItemsSelect } from '@/lib/data/locale';

export type CreateParameterModalReturnType = {
  key?: string;
  displayName: string;
  language: Localization;
  unit: string;
  value: string;
};

type CreateParameterModalProps<T extends CreateParameterModalReturnType> = {
  open: boolean;
  title: string;
  okText?: string;
  onCancel: () => void;
  onSubmit: (values: T[]) => Promise<{ error?: UserError } | void>;
  initialData?: T[];
  showKey?: boolean;
};

const CreateParameterModal = <T extends CreateParameterModalReturnType>({
  open,
  title,
  okText,
  onCancel,
  onSubmit,
  initialData,
  showKey,
}: CreateParameterModalProps<T>) => {
  const formRef = useRef(null);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const { message } = App.useApp();

  useEffect(() => {
    if (initialData && formRef.current) {
      // form.resetFields is not working, because initialData has not been
      // updated in the internal form store, eventhough the prop has.
      form.setFieldsValue(initialData);
    }
  }, [form, initialData]);

  const items: CollapseProps['items'] =
    (initialData?.length ?? 0) > 1
      ? initialData?.map((data, index) => ({
          label: data.displayName,
          children: <ParameterInputs index={index} showKey={showKey} />,
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
      destroyOnClose
      okButtonProps={{ loading: submitting }}
      okText={okText}
      wrapProps={{ onDoubleClick: (e: MouseEvent) => e.stopPropagation() }}
      onOk={onOk}
    >
      <Form
        ref={formRef}
        form={form}
        layout="vertical"
        name="create_parameter_form"
        initialValues={initialData}
        autoComplete="off"
        // This resets the fields when the modal is opened again. (apparently
        // doesn't work in production, that's why we use the useEffect above)
        preserve={false}
      >
        {!initialData || initialData.length === 1 ? (
          <ParameterInputs index={0} showKey={showKey} />
        ) : (
          <Collapse style={{ maxHeight: '60vh', overflowY: 'scroll' }} accordion items={items} />
        )}
      </Form>
    </Modal>
  );
};

type CreateParameterInputsProps = {
  index: number;
  showKey?: boolean;
};

const ParameterInputs = ({ index, showKey }: CreateParameterInputsProps) => {
  return (
    <>
      {showKey && (
        <Form.Item
          name={[index, 'key']}
          label="Key"
          rules={[{ required: true, message: 'Please fill out the Key' }]}
        >
          <Input />
        </Form.Item>
      )}
      <Card size="small" style={{ background: 'rgba(0,0,0,0.02)' }}>
        <Typography.Paragraph strong>Entry Data</Typography.Paragraph>
        <Form.Item
          name={[index, 'displayName']}
          label="Display Name"
          rules={[{ required: false, message: 'Please fill out the Display Name' }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name={[index, 'value']}
          label="Value"
          rules={[{ required: false, message: 'Please fill out the Value' }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name={[index, 'unit']}
          label="Unit"
          rules={[{ required: false, message: 'Please fill out the Unit' }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name={[index, 'language']}
          label="Language"
          rules={[{ required: false, message: 'Please fill out the Language' }]}
        >
          <Select
            showSearch
            placeholder="Search to Select"
            optionFilterProp="label"
            filterSort={(optionA, optionB) =>
              (optionA?.label ?? '')
                .toLowerCase()
                .localeCompare((optionB?.label ?? '').toLowerCase())
            }
            options={languageItemsSelect}
          />
        </Form.Item>
      </Card>
    </>
  );
};

export default CreateParameterModal;
