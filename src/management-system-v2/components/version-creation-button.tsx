'use client';

import React, { forwardRef, useCallback, useEffect, useState } from 'react';

import { Button, Modal, Form, Input, Alert, Tooltip } from 'antd';
import type { ButtonProps, FormInstance } from 'antd';
import { useEnvironment } from './auth-can';
import { getUnchangedVersionInfo } from '@/lib/data/processes';
import { isUserErrorResponse } from '@/lib/user-error';
import useCanSubmit, { ValidationError } from '@/lib/use-can-submit-form';

type UnchangedVersion = { id: string; name: string; description: string };

function useVersioningModal(processId: string, show: boolean, form: FormInstance) {
  const { spaceId } = useEnvironment();

  const [unchangedVersion, setUnchangedVersion] = useState<UnchangedVersion>();

  const validator = useCallback(() => {
    const name = form.getFieldValue('versionName');
    const description = form.getFieldValue('versionDescription');

    if (
      unchangedVersion &&
      name === unchangedVersion.name &&
      description === unchangedVersion.description
    ) {
      throw new ValidationError('No changes from previous version');
    }
  }, [form, unchangedVersion]);

  useEffect(() => {
    if (show) {
      async function checkForChanges() {
        const unchangedVersion = await getUnchangedVersionInfo(processId as string, spaceId);
        if (isUserErrorResponse(unchangedVersion)) return;

        if (unchangedVersion) setUnchangedVersion(unchangedVersion);

        return () => {
          setUnchangedVersion(undefined);
        };
      }

      checkForChanges();
    }
  }, [show, processId, spaceId, form]);

  return { ...useCanSubmit(form, validator), unchangedVersion };
}

const VersioningBaseFields: React.FC<{
  unchangedVersion?: UnchangedVersion;
  form: FormInstance;
}> = ({ unchangedVersion, form }) => {
  useEffect(() => {
    form.setFieldValue('versionName', unchangedVersion?.name || '');
    form.setFieldValue('versionDescription', unchangedVersion?.description || '');
  }, [unchangedVersion, form]);

  return (
    <>
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
    </>
  );
};

const unchangedError = 'No changes from previous version';

type VersionAndDeployModalProps = {
  processId: string;
  show: boolean;
  close: (
    values?: { versionName: string; versionDescription: string },
    deploy?: boolean | string,
  ) => void;
  loading?: boolean;
  isDeployable?: boolean;
};
export const VersionAndDeployModal: React.FC<VersionAndDeployModalProps> = ({
  processId,
  show,
  close,
  loading,
  isDeployable,
}) => {
  const [form] = Form.useForm();

  const {
    submittable: versionable,
    values,
    errors,
    unchangedVersion,
  } = useVersioningModal(processId, show, form);

  const completelyUnchanged = errors.some((error) =>
    error.errors.some((message) => message === unchangedError),
  );

  const handleClose = async () => {
    if (!loading) close();
    form.resetFields();
  };

  // we can deploy when the only thing preventing from submitting is that the version information has not changed and when deploying is enabled
  const deployable = (versionable || (completelyUnchanged && errors.length === 1)) && isDeployable;

  const footerButtons = [
    <Button key="cancel" disabled={loading} onClick={handleClose}>
      Cancel
    </Button>,
    <Tooltip key="submit" title={!!errors.length && errors[0] && errors[0].errors[0]}>
      <Button
        type="primary"
        htmlType="submit"
        loading={loading}
        disabled={!versionable}
        onClick={() => close(values, false)}
      >
        Release Version
      </Button>
    </Tooltip>,
  ];

  if (isDeployable) {
    footerButtons.push(
      <Tooltip key="version_and_deploy">
        <Button
          key="version_and_deploy"
          type="primary"
          htmlType="submit"
          loading={loading}
          disabled={!deployable}
          onClick={() =>
            completelyUnchanged ? close(undefined, unchangedVersion!.id) : close(values, true)
          }
        >
          {completelyUnchanged ? 'Deploy' : 'Release and Deploy'}
        </Button>
      </Tooltip>,
    );
  }

  return (
    <Modal
      title="Release a new Process Version"
      open={show}
      onCancel={handleClose}
      footer={footerButtons}
    >
      {!!completelyUnchanged && (
        <Alert
          style={{ marginBottom: '10px' }}
          type="warning"
          title="This process has not been changed since the last version."
        />
      )}
      <Form
        form={form}
        name="versioning"
        wrapperCol={{ span: 24 }}
        autoComplete="off"
        layout="vertical"
      >
        <VersioningBaseFields unchangedVersion={unchangedVersion} form={form} />
      </Form>
    </Modal>
  );
};

type VersionCreationButtonProps = ButtonProps & {
  processId: string;
  createVersion: (
    values?: { versionName: string; versionDescription: string },
    deploy?: boolean | string,
  ) => any;
  isDeployable?: boolean;
};
const VersionAndDeployButton = forwardRef<HTMLAnchorElement, VersionCreationButtonProps>(
  ({ processId, createVersion, isDeployable, ...props }, ref) => {
    const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit: VersionAndDeployModalProps['close'] = async (values, deploy) => {
      if (values || deploy) {
        setLoading(true);
        await createVersion(values, deploy);
        setLoading(false);
      }

      setIsVersionModalOpen(false);
    };

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
        <VersionAndDeployModal
          processId={processId}
          show={isVersionModalOpen}
          loading={loading}
          close={handleSubmit}
          isDeployable={isDeployable}
        />
      </>
    );
  },
);

VersionAndDeployButton.displayName = 'VersionCreationButton';

export default VersionAndDeployButton;
