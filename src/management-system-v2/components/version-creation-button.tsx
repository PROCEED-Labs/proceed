'use client';

import React, { forwardRef, use, useEffect, useState } from 'react';

import { Button, Modal, Form, Input, Alert } from 'antd';
import type { ButtonProps } from 'antd';
import {
  getProcess,
  getProcessBPMN,
  processHasChangesSinceLastVersion,
} from '@/lib/data/processes';
import { useEnvironment } from './auth-can';
import { getDefinitionsVersionInformation } from '@proceed/bpmn-helper';
import { EnvVarsContext } from './env-vars-context';

type VersionModalProps = {
  processId: string;
  show: boolean;
  close: (
    values?: { versionName: string; versionDescription: string },
    deploy?: boolean | string,
  ) => void;
  loading?: boolean;
  isExecutable?: boolean;
};
export const VersionModal: React.FC<VersionModalProps> = ({
  processId,
  show,
  close,
  loading,
  isExecutable,
}) => {
  const [form] = Form.useForm();
  const [canSubmit, setCanSubmit] = useState(false);

  const [unchangedVersion, setUnchangedVersion] = useState('');
  const [unchangedVersionName, setUnchangedVersionName] = useState('');
  const [unchangedVersionDescription, setUnchangedVersionDescription] = useState('');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const env = use(EnvVarsContext);

  const values = Form.useWatch([], form);

  useEffect(() => {
    form
      .validateFields({ validateOnly: true })
      .then(() => {
        setCanSubmit(true);
      })
      .catch(() => {
        setCanSubmit(false);
      });
  }, [values]);

  const { spaceId } = useEnvironment();

  useEffect(() => {
    if (show) {
      async function checkForChanges() {
        const hasChanges = await processHasChangesSinceLastVersion(processId as string, spaceId);

        if (!hasChanges) {
          const bpmn = await getProcessBPMN(processId, spaceId);

          const { versionBasedOn } = await getDefinitionsVersionInformation(bpmn);

          if (versionBasedOn) {
            const processInfo = await getProcess(processId, spaceId);

            if (processInfo && !('error' in processInfo)) {
              const version = processInfo.versions.find((v) => v.id === versionBasedOn);

              if (version) {
                setUnchangedVersion(version.id);
                setUnchangedVersionName(version.name);
                form.setFieldValue('versionName', version.name);
                setName(version.name);
                setUnchangedVersionDescription(version.description);
                form.setFieldValue('versionDescription', version.description);
                setDescription(version.description);
              }
            }
          }
        }

        return () => {
          setUnchangedVersion('');
          setUnchangedVersionName('');
          setUnchangedVersionDescription('');
        };
      }

      checkForChanges();
    }
  }, [show]);

  const completelyUnchanged =
    !!unchangedVersion &&
    name === unchangedVersionName &&
    description === unchangedVersionDescription;

  const handleSubmit = async (deploy: boolean) => {
    if (completelyUnchanged) {
      close(undefined, unchangedVersion);
    } else {
      const values = (await form.validateFields()) as Parameters<typeof close>[0];
      close(values, deploy);
    }
    form.resetFields();
  };

  const handleClose = async () => {
    if (!loading) {
      close();
      form.resetFields();
      setName('');
      setDescription('');
    }
  };

  return (
    <Modal
      title="Create New Version"
      open={show}
      onCancel={handleClose}
      footer={[
        <Button key="cancel" disabled={loading} onClick={handleClose}>
          Cancel
        </Button>,
        <Button
          key="submit"
          type="primary"
          htmlType="submit"
          loading={loading}
          disabled={!canSubmit || completelyUnchanged}
          onClick={() => handleSubmit(false)}
        >
          Create Version
        </Button>,
        env.PROCEED_PUBLIC_PROCESS_AUTOMATION_ACTIVE && isExecutable && (
          <Button
            key="version_and_deploy"
            type="primary"
            htmlType="submit"
            loading={loading}
            disabled={!canSubmit}
            onClick={() => handleSubmit(true)}
          >
            {completelyUnchanged ? 'Deploy' : 'Version and Deploy'}
          </Button>
        ),
      ]}
    >
      {!!unchangedVersion && (
        <Alert
          style={{ marginBottom: '10px' }}
          type="warning"
          message="This process has not been changed since the last version."
        />
      )}
      <Form form={form} name="versioning" wrapperCol={{ span: 24 }} autoComplete="off">
        <Form.Item
          name="versionName"
          rules={[{ required: true, message: 'Please input the Version Name!' }]}
        >
          <Input
            placeholder="Version Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
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
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Form.Item>
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
  isExecutable?: boolean;
};
const VersionCreationButton = forwardRef<HTMLAnchorElement, VersionCreationButtonProps>(
  ({ processId, createVersion, isExecutable, ...props }, ref) => {
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
          processId={processId}
          close={async (values, deploy) => {
            if (values || deploy) {
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
