'use client';

import React, { useEffect, useId, useState } from 'react';

import { Typography, Input, Select, Checkbox, InputNumber } from 'antd';
import {
  Setting as SettingType,
  SettingGroup as SettingGroupType,
  isGroup,
  SettingGroup,
} from './type-util';
import useSettingsPageStore from './use-settings-page-store';
import { updateSpaceSettings } from '@/lib/data/db/space-settings';
import { useEnvironment } from '@/components/auth-can';

const mergeKeys = (setting: SettingType | SettingGroupType, parentKey?: string) => {
  return parentKey ? `${parentKey}.${setting.key}` : setting.key;
};

type SettingProps = {
  setting: SettingType;
  parentKey: string;
  onUpdate: (value: SettingType) => void;
};

const Setting: React.FC<SettingProps> = ({ setting, parentKey, onUpdate }) => {
  const id = useId();

  const { spaceId } = useEnvironment();

  let input = <></>;

  const update = async (value: any) => {
    onUpdate({ ...setting, value });
    await updateSpaceSettings(spaceId, mergeKeys(setting, parentKey), value);
  };

  switch (setting.type) {
    case 'string':
      input = (
        <Input
          id={id}
          style={{ maxWidth: '500px' }}
          value={setting.value}
          onChange={(e) => update(e.target.value)}
        />
      );
      break;
    case 'boolean':
      input = (
        <Checkbox id={id} checked={setting.value} onChange={(e) => update(e.target.checked)} />
      );
      break;
    case 'number':
      input = (
        <InputNumber
          id={id}
          style={{ maxWidth: '500px' }}
          value={setting.value}
          onChange={(val) => update(val)}
        />
      );
      break;
    case 'select':
      input = (
        <Select
          style={{ maxWidth: '500px' }}
          popupMatchSelectWidth={false}
          value={setting.value}
          options={setting.options}
          onChange={(val) => update(val)}
        />
      );
  }

  const descriptionPosition = setting.type === 'boolean' ? 'right' : 'above';
  const description = setting.description && (
    <Typography.Text
      style={{
        marginLeft: descriptionPosition === 'right' ? '5px' : undefined,
        marginBottom: descriptionPosition === 'above' ? '10px' : undefined,
        display: descriptionPosition === 'above' ? 'block' : undefined,
        color: '#969696',
      }}
    >
      {setting.description}
    </Typography.Text>
  );

  return (
    <div style={{ padding: '10px 0 20px 0' }}>
      <div style={{ marginBottom: '5px' }}>
        <label htmlFor={id}>
          <Typography.Text strong>{setting.name}</Typography.Text>
        </label>
      </div>
      {descriptionPosition === 'above' && <div>{description}</div>}
      {input}
      {descriptionPosition === 'right' && description}
    </div>
  );
};

type SettingsGroupProps = {
  group: SettingGroupType;
  parentKey?: string;
  onUpdate: (changedGroup: SettingGroupType) => void;
};

const SettingsGroup: React.FC<SettingsGroupProps> = ({ group, parentKey = '', onUpdate }) => {
  const update = (childIndex: number, changedChild: SettingGroupType | SettingType) => {
    onUpdate({
      ...group,
      children: [
        ...group.children.slice(0, childIndex),
        changedChild,
        ...group.children.slice(childIndex + 1),
      ],
    });
  };

  return (
    <div id={mergeKeys(group, parentKey)}>
      <Typography.Title level={parentKey ? 4 : 2}>{group.name}</Typography.Title>
      {group.children.map((el, index) =>
        isGroup(el) ? (
          <SettingsGroup
            key={el.key}
            group={el}
            parentKey={mergeKeys(group, parentKey)}
            onUpdate={(changed) => update(index, changed)}
          />
        ) : (
          <Setting
            key={el.key}
            setting={el}
            parentKey={mergeKeys(group, parentKey)}
            onUpdate={(changed) => update(index, changed)}
          />
        ),
      )}
    </div>
  );
};

type SettingsSectionProps = {
  sectionName: string;
  group: SettingGroup;
  priority?: number;
};

const SettingsSection: React.FC<SettingsSectionProps> = ({
  sectionName,
  group,
  priority = 1000,
}) => {
  const { registerSection, setPriority } = useSettingsPageStore();

  const [upToDateGroup, setUpToDateGroup] = useState(group);

  useEffect(() => {
    registerSection(sectionName, group);
    setPriority(sectionName, priority);
  }, [registerSection, setPriority, sectionName, priority, group]);

  return <SettingsGroup key={group.key} group={upToDateGroup} onUpdate={setUpToDateGroup} />;
};

export default SettingsSection;
