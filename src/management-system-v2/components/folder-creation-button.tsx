'use client';

import React, { ReactNode, useState, useTransition } from 'react';
import { App, Button, Form, Input, Modal } from 'antd';
import type { ButtonProps } from 'antd';
import ProcessModal from './process-modal';
import { addProcesses } from '@/lib/data/processes';
import { useParams, useRouter, useSelectedLayoutSegments } from 'next/navigation';
import { useEnvironment } from './auth-can';
import useParseZodErrors, { antDesignInputProps } from '@/lib/useParseZodErrors';
import { FolderUserInputSchema } from '@/lib/data/folder-schema';
import { createFolder as serverCreateFolder } from '@/lib/data/folders';
import TextArea from 'antd/es/input/TextArea';

type ProcessCreationButtonProps = ButtonProps & {
  wrapperElement?: ReactNode;
};

/**
 *
 * Button to create Processes including a Modal for inserting needed values. Alternatively, a custom wrapper element can be used instead of a button.
 */
const FolderCreationButton: React.FC<ProcessCreationButtonProps> = ({
  wrapperElement,
  ...props
}) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
  const router = useRouter();
  const environmentId = useEnvironment();
  const folderId = useParams<{ folderId: string }>().folderId ?? '';
  const [isLoading, startTransition] = useTransition();
  const [errors, parseInput] = useParseZodErrors(FolderUserInputSchema);

  const createFolder = (values: Record<string, any>) => {
    startTransition(async () => {
      try {
        const folderInput = parseInput({ ...values, parentId: folderId, environmentId });
        if (!folderInput) throw new Error();

        const response = await serverCreateFolder(folderInput);
        if (response && 'error' in response) throw new Error();

        router.refresh();
        message.open({ type: 'success', content: 'Folder Created' });
        setModalOpen(false);
      } catch (e) {
        message.open({ type: 'error', content: 'Something went wrong' });
      }
    });
  };

  return (
    <>
      {wrapperElement ? (
        <div onClick={() => setModalOpen(true)}>{wrapperElement}</div>
      ) : (
        <Button {...props} onClick={() => setModalOpen(true)}>
          Create Folder
        </Button>
      )}
      <Modal
        title="Create Folder"
        closeIcon={null}
        open={modalOpen}
        destroyOnClose
        onOk={form.submit}
        onCancel={() => setModalOpen(false)}
      >
        <Form onFinish={createFolder} form={form} layout="vertical">
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
    </>
  );
};

export default FolderCreationButton;
