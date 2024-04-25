'use client';

import React, { useEffect } from 'react';
import { Form, Input, Modal } from 'antd';
import type { ModalProps } from 'antd';
import useParseZodErrors, { antDesignInputProps } from '@/lib/useParseZodErrors';
import { Folder, FolderUserInput, FolderUserInputSchema } from '@/lib/data/folder-schema';
import TextArea from 'antd/es/input/TextArea';

type FolderModalProps = {
  spaceId: string;
  parentId: string;
  onSubmit: (values: FolderUserInput) => void;
  modalProps?: ModalProps;
  open: boolean;
  close: () => void;
  initialValues?: Partial<Folder>;
};

const FolderModal = ({
  spaceId,
  parentId,
  onSubmit,
  modalProps,
  open,
  close,
  initialValues,
}: FolderModalProps) => {
  const [form] = Form.useForm();
  const [errors, parseInput] = useParseZodErrors(FolderUserInputSchema);

  function checkInput(formInput: any) {
    const values = parseInput({ ...formInput, environmentId: spaceId, parentId });
    if (!values) return;

    onSubmit(values);
  }

  useEffect(() => {
    if (initialValues) form.setFieldsValue(initialValues);
    else form.resetFields();
  }, [open, initialValues]);

  return (
    <Modal
      title="Folder"
      closeIcon={null}
      destroyOnClose
      {...modalProps}
      open={open}
      onCancel={() => close()}
      onOk={form.submit}
    >
      <Form onFinish={checkInput} form={form} layout="vertical" initialValues={initialValues}>
        <Form.Item
          name="name"
          label="Folder name"
          required
          {...antDesignInputProps(errors, 'name')}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="description"
          label="Description"
          {...antDesignInputProps(errors, 'description')}
        >
          <TextArea />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default FolderModal;
