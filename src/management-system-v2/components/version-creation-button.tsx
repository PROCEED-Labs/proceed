'use client';

import React, { forwardRef, useEffect, useState } from 'react';

import { Button, Modal, Form, Input } from 'antd';
import type { ButtonProps } from 'antd';
import FormSubmitButton from './form-submit-button';

type VersionModalProps = {
  show: boolean;
  close: (values?: { versionName: string; versionDescription: string }, deploy?: boolean) => void;
  loading?: boolean;
  isExecutable?: boolean;
};
export const VersionModal: React.FC<VersionModalProps> = ({
  show,
  close,
  loading,
  isExecutable,
}) => {
  const [form] = Form.useForm();
  const [canSubmit, setCanSubmit] = useState(false);

  const values = Form.useWatch([], form);

  useEffect(() => {
    form
      .validateFields({ validateOnly: true })
      .then((value) => {
        setCanSubmit(true);
      })
      .catch((err) => {
        setCanSubmit(false);
      });
  }, [values]);

  const handleSubmit = async (deploy: boolean) => {
    const values = (await form.validateFields()) as Parameters<typeof close>[0];
    form.resetFields();
    close(values, deploy);
  };

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
        <Button
          key="submit"
          type="primary"
          htmlType="submit"
          loading={loading}
          disabled={!canSubmit}
          onClick={() => handleSubmit(false)}
        >
          Create Version
        </Button>,
        isExecutable && (
          <Button
            key="version_and_deploy"
            type="primary"
            htmlType="submit"
            loading={loading}
            disabled={!canSubmit}
            onClick={() => handleSubmit(true)}
          >
            Create Version
          </Button>
        ),
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
  createVersion: (
    values: { versionName: string; versionDescription: string },
    deploy?: boolean,
  ) => any;
  isExecutable?: boolean;
};
const VersionCreationButton = forwardRef<HTMLAnchorElement, VersionCreationButtonProps>(
  ({ createVersion, isExecutable, ...props }, ref) => {
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
          close={async (values, deploy) => {
            if (values) {
              const createResult = createVersion(values, deploy);
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
          isExecutable={isExecutable}
        ></VersionModal>
      </>
    );
  },
);

VersionCreationButton.displayName = 'VersionCreationButton';

export default VersionCreationButton;
