'use client';

import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, App, Typography, ModalProps, Carousel, Card, Flex } from 'antd';
import { MdArrowBackIos, MdArrowForwardIos } from 'react-icons/md';
import { UserError } from '@/lib/user-error';
import { useAddControlCallback } from '@/lib/controls-store';
import './process-modal-carousel.css';
import Title from 'antd/es/typography/Title';

type ProcessModalProps<T extends { name: string; description: string }> = {
  open: boolean;
  title: string;
  okText?: string;
  onCancel: NonNullable<ModalProps['onCancel']>;
  onSubmit: (values: T[]) => Promise<{ error?: UserError } | void>;
  initialData?: T[];
  modalProps?: ModalProps;
};

const ProcessModal = <
  T extends {
    name: string;
    description: string;
    userDefinedId?: string;
    creator?: string;
    creatorUsername?: string;
    createdOn?: string;
  },
>({
  open,
  title,
  okText,
  onCancel,
  onSubmit,
  initialData,
  modalProps,
}: ProcessModalProps<T>) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const { message } = App.useApp();
  const [carouselIndex, setCarouselIndex] = useState(1);

  useEffect(() => {
    if (initialData) {
      // form.resetFields is not working, because initialData has not been
      // updated in the internal form store, eventhough the prop has.
      form.setFieldsValue(initialData);
    }
  }, [form, initialData]);

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

  useAddControlCallback(
    'process-list',
    [
      'selectall',
      'esc',
      'del',
      'copy',
      'paste',
      'enter',
      'cut',
      'export',
      'import',
      'shift+enter',
      'new',
    ],
    (e) => {
      // e.preventDefault();
    },
    { level: 2, blocking: open },
  );
  useAddControlCallback(
    'process-list',
    'control+enter',
    () => {
      if (open) onOk();
    },
    { level: 2, blocking: open, dependencies: [open] },
  );

  return (
    <Modal
      title={
        <Flex justify="space-between" style={{ width: '100%', paddingRight: '25px' }}>
          <Title level={4} style={{ margin: 0 }}>
            {title}
          </Title>
          {initialData && initialData.length >= 1 && (
            <Typography.Text type="secondary">{`Process ${carouselIndex} of ${initialData.length}`}</Typography.Text>
          )}
        </Flex>
      }
      open={open}
      width={600}
      centered
      // IMPORTANT: This prevents a modal being stored for every row in the
      // table.
      destroyOnClose
      okButtonProps={{ loading: submitting }}
      okText={okText}
      wrapProps={{ onDoubleClick: (e: MouseEvent) => e.stopPropagation() }}
      {...modalProps}
      onCancel={(e) => {
        modalProps?.onCancel?.(e);
        onCancel(e);
      }}
      onOk={(e) => {
        modalProps?.onOk?.(e);
        onOk();
      }}
    >
      <Form
        form={form}
        layout="vertical"
        name="process_form"
        initialValues={initialData}
        autoComplete="off"
        // This resets the fields when the modal is opened again. (apparently
        // doesn't work in production, that's why we use the useEffect above)
        preserve={false}
      >
        {!initialData ? (
          <ProcessInputs index={0} />
        ) : (
          // <Collapse style={{ maxHeight: '60vh', overflowY: 'scroll' }} accordion items={items} />
          <Carousel
            arrows
            infinite={false}
            style={{ padding: '0px 25px 0px 25px' }}
            afterChange={(current) => setCarouselIndex(current + 1)}
            prevArrow={<MdArrowBackIos color="#000" />}
            nextArrow={<MdArrowForwardIos color="#000" />}
          >
            {initialData &&
              initialData.map((process, index) => (
                <Card key={index}>
                  <ProcessInputs key={index} index={index} isImport={true} />
                </Card>
              ))}
          </Carousel>
        )}
      </Form>
    </Modal>
  );
};

type ProcessInputsProps = {
  index: number;
  isImport?: boolean;
};

const ProcessInputs = ({ index, isImport }: ProcessInputsProps) => {
  return (
    <>
      <Form.Item
        name={[index, 'name']}
        label="Process Name"
        rules={[{ required: true, message: 'Please fill out the Process name' }]}
      >
        <Input />
      </Form.Item>
      <Form.Item
        name={[index, 'userDefinedId']}
        label="ID"
        rules={[{ required: false, message: 'Please enter a unique ID for the process.' }]}
      >
        <Input />
      </Form.Item>
      <Form.Item
        name={[index, 'description']}
        label="Process Description"
        rules={[{ required: false, message: 'Please fill out the Process description' }]}
      >
        <Input.TextArea showCount rows={4} maxLength={150} />
      </Form.Item>
      {isImport && (
        <>
          <Form.Item
            name={[index, 'creator']}
            label="Original Creator"
            rules={[{ required: false }]}
          >
            <Input disabled />
          </Form.Item>
          <Form.Item
            name={[index, 'creatorUsername']}
            label="Original Creator Username"
            rules={[{ required: false }]}
          >
            <Input disabled />
          </Form.Item>
          <Form.Item
            name={[index, 'createdOn']}
            label="Original Creation Date"
            rules={[{ required: false }]}
          >
            <Input disabled />
          </Form.Item>
        </>
      )}
    </>
  );
};

export default ProcessModal;
