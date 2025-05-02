'use client';

import React, { useEffect, useId } from 'react';

import { Typography, Input, Select, Checkbox, InputNumber, Form } from 'antd';
import {
  Setting as SettingType,
  SettingGroup as SettingGroupType,
  isGroup,
  SettingGroup,
} from './type-util';
import useSettingsPageStore from './use-settings-page-store';

const mergeKeys = (setting: SettingType | SettingGroupType, parentKey?: string) => {
  return parentKey ? `${parentKey}.${setting.key}` : setting.key;
};

type SettingProps = {
  setting: SettingType;
  parentKey: string;
};

const Setting: React.FC<SettingProps> = ({ setting, parentKey }) => {
  const id = useId();

  let input = <></>;

  switch (setting.type) {
    case 'string':
      input = <Input id={id} style={{ maxWidth: '500px' }} />;
      break;
    case 'boolean':
      input = <Checkbox id={id} />;
      break;
    case 'number':
      input = <InputNumber id={id} style={{ maxWidth: '500px' }} />;
      break;
    case 'select':
      input = (
        <Select
          style={{ maxWidth: '500px' }}
          popupMatchSelectWidth={false}
          value={setting.value}
          options={setting.options}
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
      <Form.Item
        initialValue={setting.value}
        valuePropName={setting.type === 'boolean' ? 'checked' : 'value'}
        name={mergeKeys(setting, parentKey)}
        noStyle
      >
        {input}
      </Form.Item>{' '}
      {descriptionPosition === 'right' && description}
    </div>
  );
};

type SettingsGroupProps = {
  group: SettingGroupType;
  parentKey?: string;
};

const SettingsGroup: React.FC<SettingsGroupProps> = ({ group, parentKey = '' }) => {
  return (
    <div id={mergeKeys(group, parentKey)}>
      <Typography.Title level={parentKey ? 4 : 2}>{group.name}</Typography.Title>
      {group.children.map((el) =>
        isGroup(el) ? (
          <SettingsGroup key={el.key} group={el} parentKey={mergeKeys(group, parentKey)} />
        ) : (
          <Setting key={el.key} setting={el} parentKey={mergeKeys(group, parentKey)} />
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

  useEffect(() => {
    registerSection(sectionName, group);
    setPriority(sectionName, priority);
  }, [registerSection, setPriority, sectionName, priority, group]);

  return <SettingsGroup key={group.key} group={group} />;
};

export default SettingsSection;
