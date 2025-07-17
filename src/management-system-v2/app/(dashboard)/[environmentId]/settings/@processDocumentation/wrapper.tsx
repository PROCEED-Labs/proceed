'use client';

import React from 'react';

import { useState } from 'react';
import { Setting, SettingGroup } from '../type-util';
import { SettingDescription, SettingsGroup } from '../components';
import { debouncedSettingsUpdate } from '../utils';
import { useEnvironment } from '@/components/auth-can';
import { Checkbox } from 'antd';
import { createGanttSettingsRenderer } from '@/components/bpmn-timeline/gantt-settings-utils';

type WrapperProps = {
  group: SettingGroup;
};

const Wrapper: React.FC<WrapperProps> = ({ group }) => {
  const [upToDateGroup, setUpToDateGroup] = useState(group);

  const { spaceId } = useEnvironment();

  return (
    <SettingsGroup
      group={upToDateGroup}
      onUpdate={setUpToDateGroup}
      onNestedSettingUpdate={(key, value) => debouncedSettingsUpdate(spaceId, key, value)}
      renderNestedSettingInput={(id, setting, key, onUpdate) => {
        // Handle gantt view settings with their own custom logic
        if (key.startsWith('process-documentation.gantt-view.')) {
          // Find the gantt-view settings group
          const ganttViewGroup = upToDateGroup.children.find(
            (child) => child.key === 'gantt-view',
          ) as SettingGroup;

          if (ganttViewGroup) {
            // Use the gantt settings renderer for gantt-specific logic
            const ganttRenderer = createGanttSettingsRenderer(ganttViewGroup);
            // Convert the key from process-documentation.gantt-view.X to gantt-view.X
            const ganttKey = key.replace('process-documentation.', '');
            return ganttRenderer(id, setting, ganttKey, onUpdate);
          }
        }

        // Handle process documentation main settings (list, editor enable/disable)
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
