'use client';

import React, { useState } from 'react';

import { Button, Modal, Form, Input } from 'antd';
import type { FormInstance, ButtonProps } from 'antd';

const ModalSubmitButton = ({ form, onSubmit }: { form: FormInstance; onSubmit: Function }) => {
  const [submittable, setSubmittable] = useState(false);

  // Watch all values
  const values = Form.useWatch([], form);

  React.useEffect(() => {
    form.validateFields({ validateOnly: true }).then(
      () => {
        setSubmittable(true);
      },
      () => {
        setSubmittable(false);
      },
    );
  }, [form, values]);

  return (
    <Button
      type="primary"
      htmlType="submit"
      disabled={!submittable}
      onClick={() => {
        onSubmit(values);
        form.resetFields();
      }}
    >
      Create Version
    </Button>
  );
};

type VersionModalProps = {
  show: boolean;
  close: (values?: { versionName: string; versionDescription: string }) => void;
};
const VersionModal: React.FC<VersionModalProps> = ({ show, close }) => {
  const [form] = Form.useForm();

  return (
    <Modal
      title="Create new Version"
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
        <ModalSubmitButton key="submit" form={form} onSubmit={close}></ModalSubmitButton>,
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
const VersionCreationButton: React.FC<VersionCreationButtonProps> = ({
  createVersion,
  ...props
}) => {
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);

  return (
    <>
      <Button
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
};

export default VersionCreationButton;
