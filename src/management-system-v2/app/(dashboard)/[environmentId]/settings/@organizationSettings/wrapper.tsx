'use client';

import React, { useEffect, useRef, useTransition } from 'react';

import { useState } from 'react';
import { SettingGroup } from '../type-util';
import { SettingsGroup } from '../components';
import { useEnvironment } from '@/components/auth-can';
import { Alert } from 'antd';
import { App, Button, Form, Input, Image, theme, Space, Modal } from 'antd';
import PhoneInput from '@/components/phone-input';
import { useFileManager } from '@/lib/useFileManager';
import { EntityType } from '@/lib/helpers/fileManagerHelpers';
import { fallbackImage } from '../../processes/[processId]/image-selection-section';
import ImageUpload from '@/components/image-upload';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import DeleteOrganizationButton from './delete-organization-button';
import { updateOrganization as serverUpdateOrganization } from '@/lib/data/environments';
import useParseZodErrors, { antDesignInputProps } from '@/lib/useParseZodErrors';
import { UserOrganizationEnvironmentInputSchema } from '@/lib/data/environment-schema';

const UPDATE_DEBOUNCE_TIME = 1000;

type WrapperProps = {
  group: SettingGroup;
};

const Wrapper: React.FC<WrapperProps> = ({ group }) => {
  const router = useRouter();
  const { message } = App.useApp();
  const [upToDateGroup, setUpToDateGroup] = useState(group);
  const { spaceId } = useEnvironment();
  const { download: getLogoUrl } = useFileManager({
    entityType: EntityType.ORGANIZATION,
  });
  const { colorWarning } = theme.useToken().token;
  const [organizationLogo, setOrganizationLogo] = useState<undefined | string>();
  useEffect(() => {
    getLogoUrl(spaceId, '', undefined, {
      onSuccess(data) {
        setOrganizationLogo(data.fileUrl);
      },
    });
  }, []);

  const updateTimeout = useRef<ReturnType<typeof setTimeout> | undefined>();
  const changes = useRef<Record<string, string>>({});

  const [errors, parseInput] = useParseZodErrors(UserOrganizationEnvironmentInputSchema.partial());

  const [updating, startUpdating] = useTransition();
  function updateOrganization() {
    if (Object.keys(errors).length > 0) return;

    if (updateTimeout.current) {
      clearTimeout(updateTimeout.current);
    }

    updateTimeout.current = setTimeout(() => {
      startUpdating(async () => {
        try {
          const result = await serverUpdateOrganization(spaceId, changes.current);

          if ('error' in result) throw result.error.message;

          message.open({
            content: 'Organization updated',
            type: 'success',
          });
          router.refresh();
          changes.current = {};
        } catch (e) {
          let content = typeof e === 'string' ? e : 'Something went wrong';

          message.open({ content, type: 'error' });
        }
      });
    }, UPDATE_DEBOUNCE_TIME);
  }

  return (
    <SettingsGroup
      group={upToDateGroup}
      onUpdate={setUpToDateGroup}
      onNestedSettingUpdate={(key, value) => {
        const configKey = key.split('.').at(-1)!;
        changes.current[configKey] = value;
        if (parseInput(changes.current) !== null) updateOrganization();
      }}
      renderNestedSettingInput={(id, setting, _key, onUpdate) => {
        let inputElement;

        if (setting.key === 'contactPhoneNumber') {
          inputElement = (
            <PhoneInput
              id={id}
              value={setting.value as any}
              {...antDesignInputProps(errors, 'contactPhoneNumber')}
              onChange={(e) => onUpdate(e.target.value)}
            />
          );
        }

        if (setting.key === 'organizationLogo') {
          inputElement = (
            <Space id={id}>
              <Image
                src={organizationLogo || fallbackImage}
                fallback={fallbackImage}
                style={{
                  width: '100%',
                  maxHeight: '7.5rem',
                  borderRadius: '6px',
                  border: '1px solid #d9d9d9',
                }}
                preview={{
                  visible: false,
                  mask: (
                    <ImageUpload
                      imageExists={!!organizationLogo}
                      onImageUpdate={(name) => {
                        const deleted = typeof name === 'undefined';
                        setOrganizationLogo((prev) =>
                          deleted ? undefined : `${prev}?${Date.now}`,
                        );
                        if (deleted) message.success('Logo deleted');
                        else message.success('Logo uploaded');

                        router.refresh(); // To refresh other places in the page
                      }}
                      onUploadFail={() => message.error('Error uploading image')}
                      endpoints={{
                        postEndpoint: '',
                        deleteEndpoint: 'dummy',
                        putEndpoint: '',
                      }}
                      config={{
                        entityType: EntityType.ORGANIZATION,
                        entityId: spaceId,
                        useDefaultRemoveFunction: true,
                        fileName: '',
                      }}
                    />
                  ),
                }}
                role="group"
                aria-label="image-section"
              />

              <Button
                onClick={() =>
                  Modal.confirm({
                    content:
                      'Logo changes may take some time to appear everywhere. This is normal and should resolve itself shortly.',
                    footer: (_, { OkBtn }) => <OkBtn />,
                    maskClosable: true,
                  })
                }
                style={{
                  color: colorWarning,
                }}
                type="text"
              >
                <ExclamationCircleOutlined />
              </Button>
            </Space>
          );
        }

        if (setting.key === 'deleteOrganization') {
          inputElement = (
            <Space direction="vertical" id={id}>
              <Alert
                message="All processes inside this organization will be lost. This action cannot be undone."
                type="error"
                showIcon
              />
              <DeleteOrganizationButton />
            </Space>
          );
        }

        if (!inputElement) {
          inputElement = (
            <Input value={setting.value} onChange={(e) => onUpdate(e.target.value)} id={id} />
          );
        }

        return {
          input: (
            <Form.Item
              {...antDesignInputProps(errors, setting.key as any)}
              style={{ marginBottom: 0 }}
            >
              {inputElement}
            </Form.Item>
          ),
        };
      }}
    />
  );
};

export default Wrapper;
