'use client';

import React, { forwardRef, useState } from 'react';

import { Button, Modal, Form, Input } from 'antd';
import type { ButtonProps } from 'antd';
import FormSubmitButton from './form-submit-button';

type VersionModalProps = {
  show: boolean;
  close: (values?: { versionName: string; versionDescription: string }) => void;
  loading?: boolean;
};
const VersionModal: React.FC<VersionModalProps> = ({ show, close, loading }) => {
  const [form] = Form.useForm();

  return (
    <Modal
      title="Create New Version"
      open={show}
      onCancel={() => {
        if (!loading) close();
      }}
      footer={[
        <Button
          key="cancel"
          disabled={loading}
          onClick={() => {
            if (!loading) close();
          }}
        >
          Cancel
        </Button>,
        <FormSubmitButton
          key="submit"
          form={form}
          onSubmit={close}
          submitText="Create Version"
          buttonProps={{
            loading,
          }}
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
    const [loading, setLoading] = useState(false);

    return (
      <>
        <Button
          ref={ref}
          loading={false}
          {...props}
          onClick={() => {
            setIsVersionModalOpen(true);
          }}
        ></Button>
        <VersionModal
          close={async (values) => {
            if (values) {
              const createResult = createVersion(values);
              if (createResult instanceof Promise) {
                setLoading(true);
                await createResult;
                setLoading(false);
              }
            }

            setIsVersionModalOpen(false);
          }}
          show={isVersionModalOpen}
          loading={loading}
        ></VersionModal>
      </>
    );
  },
);

VersionCreationButton.displayName = 'VersionCreationButton';

export default VersionCreationButton;
