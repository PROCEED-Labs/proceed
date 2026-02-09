'use client';

import React from 'react';

import { useState } from 'react';
import { Setting, SettingGroup } from '../type-util';
import { SettingDescription, SettingsGroup } from '../components';
import { useDebouncedSettingsUpdate } from '../utils';
import { useEnvironment } from '@/components/auth-can';
import { Checkbox, InputNumber } from 'antd';

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
        const sectionActiveSetting = upToDateGroup.children.find(
          (child) => child.key === 'active',
        ) as Setting;
        const disabled = !sectionActiveSetting.value;
        if (setting.type === 'boolean' && key !== 'process-automation.active') {
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
        } else if (setting.type === 'number') {
          return {
            input: (
              <InputNumber
                id={id}
                disabled={disabled}
                value={setting.value}
                onChange={(val) => onUpdate(val)}
              />
            ),
            descriptionTop: <SettingDescription description={setting.description} position="top" />,
          };
        }
      }}
    />
  );
};

export default Wrapper;
