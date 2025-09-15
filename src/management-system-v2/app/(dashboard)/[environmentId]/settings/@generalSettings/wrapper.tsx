'use client';

import React from 'react';

import { useState } from 'react';
import { SettingGroup } from '../../settings/type-util';
import { SettingsGroup } from '../../settings/components';
import { useEnvironment } from '@/components/auth-can';
import { App, Button, theme, Space, Modal } from 'antd';
import { EntityType } from '@/lib/helpers/fileManagerHelpers';
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

  const { colorWarning } = theme.useToken().token;

  const space = useEnvironment();

  // NOTE: this may break
  const initialLogoFilePath = (group as any).children.find(
    (setting: any) => setting.key === 'spaceLogo',
  )?.children[0]?.value as string | undefined;

  return (
    <SettingsGroup
      group={upToDateGroup}
      onUpdate={setUpToDateGroup}
      onNestedSettingUpdate={(key, value) => debouncedUpdate(spaceId, key, value)}
      renderNestedSettingInput={(id, setting, _key, onUpdate) => {
        if (setting.key === 'logo') {
          return {
            input: (
              <Space id={id}>
                <ImageUpload
                  onImageUpdate={(name) => {
                    const deleted = typeof name === 'undefined';
                    if (deleted) {
                      app.message.success('Logo deleted');
                    } else {
                      app.message.success('Logo uploaded');
                    }
                    // To update other components that might depend on the logo
                    router.refresh();
                  }}
                  initialFileName={initialLogoFilePath}
                  onUploadFail={() => app.message.error('Error uploading image')}
                  config={{
                    entityType: EntityType.ORGANIZATION,
                    entityId: space.spaceId,
                  }}
                  fileManagerErrorToasts={false}
                />
                <Button
                  onClick={() =>
                    Modal.confirm({
                      content:
                        'Logo changes may take some time to appear everywhere. This is normal and should resolve itself shortly',
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
        } else if (setting.key === 'links') {
          return {
            input: <CustomNavigationLinks onUpdate={onUpdate} values={setting.value} />,
          };
        }
      }}
    />
  );
};

export default Wrapper;
