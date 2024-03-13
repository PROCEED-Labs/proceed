'use client';

import React, { useState } from 'react';
import { Form, Input, Modal } from 'antd';
import type { ModalProps } from 'antd';
import useParseZodErrors, { antDesignInputProps } from '@/lib/useParseZodErrors';
import { FolderUserInput, FolderUserInputSchema } from '@/lib/data/folder-schema';
import TextArea from 'antd/es/input/TextArea';

type FolderModalProps = {
  spaceId: string;
  parentId: string;
  onSubmit: (values: FolderUserInput) => void;
  modalProps?: ModalProps;
};

const useFolderModal = ({ spaceId, parentId, onSubmit, modalProps }: FolderModalProps) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [errors, parseInput] = useParseZodErrors(FolderUserInputSchema);

  function checkInput(formInput: any) {
    const values = parseInput({ ...formInput, environmentId: spaceId, parentId });
    if (!values) return;

    onSubmit(values);
  }

  const modal = (
    <Modal
      title="Folder"
      closeIcon={null}
      destroyOnClose
      {...modalProps}
      open={modalOpen}
      onOk={form.submit}
      onCancel={() => setModalOpen(false)}
    >
      <Form onFinish={checkInput} form={form} layout="vertical">
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

  return {
    modal,
    open: () => setModalOpen(true),
    close: () => setModalOpen(false),
    errors,
  };
};

export default useFolderModal;
