'use client';

import React, { useEffect } from 'react';

import { useState } from 'react';
import { Setting, SettingGroup } from '../../settings/type-util';
import { SettingsGroup } from '../../settings/components';
import { useEnvironment } from '@/components/auth-can';
import { App, Button, Image, theme, Space, Modal } from 'antd';
import { useFileManager } from '@/lib/useFileManager';
import { EntityType } from '@/lib/helpers/fileManagerHelpers';
import { fallbackImage } from '../../processes/[processId]/image-selection-section';
import ImageUpload from '@/components/image-upload';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import CustomNavigationLinks from './custom-navigation-links';
import { useDebouncedSettingsUpdate } from '../utils';

type WrapperProps = {
  group: SettingGroup;
};

const Wrapper: React.FC<WrapperProps> = ({ group }) => {
  const router = useRouter();
  const app = App.useApp();
  const [upToDateGroup, setUpToDateGroup] = useState(group);
  const { spaceId } = useEnvironment();

  const debouncedUpdate = useDebouncedSettingsUpdate();

  const { download: getLogoUrl } = useFileManager({
    entityType: EntityType.ORGANIZATION,
  });
  const { colorWarning } = theme.useToken().token;
  const initialLogoFilePath = (
    group.children.find((setting) => setting.key === 'spaceLogo') as Setting
  ).value as string | null;
  const [spaceLogoFilePath, setLogoFilePath] = useState<string | undefined>(
    initialLogoFilePath || undefined,
  );
  const [spaceLogoUrl, setSpaceLogoUrl] = useState<undefined | string>(() => {
    if (initialLogoFilePath && initialLogoFilePath.startsWith('public/')) {
      return initialLogoFilePath.replace('public/', '/');
    }
  });

  useEffect(() => {
    async function getLogo() {
      if (!spaceLogoFilePath || spaceLogoFilePath?.startsWith('public/')) {
        return;
      }

      try {
        const response = await getLogoUrl({ entityId: spaceId, filePath: spaceLogoFilePath });
        if (response.fileUrl) {
          setSpaceLogoUrl(response.fileUrl);
        }
      } catch (e) {}
    }
    getLogo();
  }, [spaceId, spaceLogoFilePath, getLogoUrl]);

  return (
    <SettingsGroup
      group={upToDateGroup}
      onUpdate={setUpToDateGroup}
      onNestedSettingUpdate={(key, value) => debouncedUpdate(spaceId, key, value)}
      renderNestedSettingInput={(id, setting, _key, onUpdate) => {
        if (setting.key === 'spaceLogo') {
          return {
            input: (
              <Space id={id}>
                <Image
                  src={spaceLogoUrl || fallbackImage}
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
                        imageExists={!!spaceLogoUrl && !spaceLogoFilePath!.startsWith('public/')}
                        onImageUpdate={(filePath) => {
                          const deleted = typeof filePath === 'undefined';

                          if (deleted) {
                            setLogoFilePath(undefined);
                            setSpaceLogoUrl(undefined);
                          } else {
                            setLogoFilePath(filePath);
                          }

                          if (deleted) app.message.success('Logo deleted');
                          else app.message.success('Logo uploaded');

                          router.refresh(); // To refresh other places in the page
                        }}
                        onUploadFail={() => app.message.error('Error uploading image')}
                        config={{
                          entityType: EntityType.ORGANIZATION,
                          entityId: spaceId,
                          useDefaultRemoveFunction: true,
                          fileName: spaceLogoFilePath ?? undefined,
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
            ),
          };
        } else if (setting.key === 'customNavigationLinks') {
          return {
            input: <CustomNavigationLinks onUpdate={onUpdate} values={setting.value} />,
          };
        }
      }}
    />
  );
};

export default Wrapper;
