'use client';

import React from 'react';

import { useState } from 'react';
import { Setting, SettingGroup } from '../type-util';
import { SettingDescription, SettingsGroup } from '../components';
import { useDebouncedSettingsUpdate } from '../utils';
import { useEnvironment } from '@/components/auth-can';
import { Checkbox } from 'antd';

type WrapperProps = {
  group: SettingGroup;
};

const Wrapper: React.FC<WrapperProps> = ({ group }) => {
  const [upToDateGroup, setUpToDateGroup] = useState(group);

  const { spaceId } = useEnvironment();

  const debouncedUpdate = useDebouncedSettingsUpdate();

  return (
    <SettingsGroup
      group={upToDateGroup}
      onUpdate={setUpToDateGroup}
      onNestedSettingUpdate={(key, value) => debouncedUpdate(spaceId, key, value)}
      renderNestedSettingInput={(id, setting, key, onUpdate) => {
        if (setting.type === 'boolean' && key !== 'process-documentation.active') {
          const sectionActiveSetting = upToDateGroup.children.find(
            (child) => child.key === 'active',
          ) as Setting;
          const disabled = !sectionActiveSetting.value;

          return {
            input: (
              <Checkbox
                id={id}
                disabled={disabled}
                checked={setting.value}
                onChange={(e) => onUpdate(e.target.checked)}
              />
            ),
            descriptionRight: (
              <SettingDescription description={setting.description} position="right" />
            ),
          };
        }
      }}
    />
  );
};

export default Wrapper;
