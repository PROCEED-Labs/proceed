'use client';

import React, { forwardRef, useState } from 'react';

import { Button, Modal, Form, Input } from 'antd';
import type { ButtonProps } from 'antd';
import FormSubmitButton from './form-submit-button';

type VersionModalProps = {
  show: boolean;
  close: (values?: { versionName: string; versionDescription: string }) => void;
};
const VersionModal: React.FC<VersionModalProps> = ({ show, close }) => {
  const [form] = Form.useForm();

  return (
    <Modal
      title="Create New Version"
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
        <FormSubmitButton
          key="submit"
          form={form}
          onSubmit={close}
          submitText="Create Version"
        ></FormSubmitButton>,
      ]}
    >
      <Form form={form} name="versioning" wrapperCol={{ span: 24 }} autoComplete="off">
        <Form.Item
          name="versionName"
          rules={[{ required: true, message: 'Please input the Version Name!' }]}
        >
          <Input placeholder="Version Name" />
        </Form.Item>
        <Form.Item
          name="versionDescription"
          rules={[{ required: true, message: 'Please input the Version Description!' }]}
        >
          <Input.TextArea
            showCount
            maxLength={150}
            style={{ height: 100 }}
            placeholder="Version Description"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

type VersionCreationButtonProps = ButtonProps & {
  createVersion: (values: { versionName: string; versionDescription: string }) => any;
};
const VersionCreationButton = forwardRef<HTMLAnchorElement, VersionCreationButtonProps>(
  ({ createVersion, ...props }, ref) => {
    const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);

    return (
      <>
        <Button
          ref={ref}
          {...props}
          onClick={() => {
            setIsVersionModalOpen(true);
          }}
        ></Button>
        <VersionModal
          close={(values) => {
            setIsVersionModalOpen(false);

            if (values) {
              createVersion(values);
            }
          }}
          show={isVersionModalOpen}
        ></VersionModal>
      </>
    );
  },
);

VersionCreationButton.displayName = 'VersionCreationButton';

export default VersionCreationButton;
