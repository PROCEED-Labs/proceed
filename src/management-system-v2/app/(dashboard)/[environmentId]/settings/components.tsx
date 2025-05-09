import React, { ReactNode, useId } from 'react';

import { Typography, Input, Select, Checkbox, InputNumber } from 'antd';
import {
  Setting as SettingType,
  SettingGroup as SettingGroupType,
  isGroup,
  mergeKeys,
} from './type-util';

import cn from 'classnames';
import styles from './components.module.scss';

type SettingDescriptionProps = {
  description: ReactNode;
  position: 'top' | 'right';
};

export const SettingDescription: React.FC<SettingDescriptionProps> = ({
  description,
  position,
}) => {
  return (
    <Typography.Text
      className={cn(styles.SettingHint, position === 'top' ? styles.Above : styles.Right)}
    >
      {description}
    </Typography.Text>
  );
};

type SettingProps = {
  setting: SettingType;
  parentKey: string;
  onUpdate: (key: string, value: any) => void;
  renderInput?: (
    id: string,
    setting: SettingType,
    key: string,
    onUpdate: (changedValue: any) => void,
  ) => { input: ReactNode; descriptionTop?: ReactNode; descriptionRight?: ReactNode } | void;
};

export const Setting: React.FC<SettingProps> = ({ setting, onUpdate, parentKey, renderInput }) => {
  const id = useId();

  const customRender = renderInput?.(id, setting, mergeKeys(setting, parentKey), (changedValue) =>
    onUpdate(mergeKeys(setting, parentKey), changedValue),
  );

  let input = customRender?.input;
  let topDescription = customRender?.descriptionTop;
  let rightDescription = customRender?.descriptionRight;

  if (!customRender) {
    switch (setting.type) {
      case 'string':
        input = input || (
          <Input
            id={id}
            className={styles.SettingInput}
            value={setting.value}
            onChange={(e) => onUpdate(mergeKeys(setting, parentKey), e.target.value)}
          />
        );
        topDescription = <SettingDescription description={setting.description} position={'top'} />;
        break;
      case 'boolean':
        input = (
          <Checkbox
            id={id}
            checked={setting.value}
            onChange={(e) => onUpdate(mergeKeys(setting, parentKey), e.target.checked)}
          />
        );
        rightDescription = (
          <SettingDescription description={setting.description} position={'right'} />
        );
        break;
      case 'number':
        input = (
          <InputNumber
            id={id}
            className={styles.SettingInput}
            value={setting.value}
            onChange={(val) => onUpdate(mergeKeys(setting, parentKey), val)}
          />
        );
        topDescription = <SettingDescription description={setting.description} position={'top'} />;
        break;
      case 'select':
        input = (
          <Select
            className={styles.SettingInput}
            popupMatchSelectWidth={false}
            value={setting.value}
            options={setting.options}
            onChange={(val) => onUpdate(mergeKeys(setting, parentKey), val)}
          />
        );
        topDescription = <SettingDescription description={setting.description} position={'top'} />;
    }
  }

  return (
    <div className={styles.Setting}>
      <div className={styles.SettingLabel}>
        <label htmlFor={id}>
          <Typography.Text strong>{setting.name}</Typography.Text>
        </label>
      </div>
      {topDescription}
      {input}
      {rightDescription}
    </div>
  );
};

type SettingsGroupProps = {
  group: SettingGroupType;
  parentKey?: string;
  onUpdate: (changedGroup: SettingGroupType) => void;
  onNestedSettingUpdate?: (key: string, value: any) => void;
  renderNestedSettingInput?: SettingProps['renderInput'];
};

export const SettingsGroup: React.FC<SettingsGroupProps> = ({
  group,
  parentKey = '',
  onUpdate,
  onNestedSettingUpdate,
  renderNestedSettingInput,
}) => {
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
            onNestedSettingUpdate={onNestedSettingUpdate}
            renderNestedSettingInput={renderNestedSettingInput}
          />
        ) : (
          <Setting
            key={el.key}
            setting={el}
            parentKey={mergeKeys(group, parentKey)}
            onUpdate={(key, changedValue) => {
              update(index, { ...el, value: changedValue });
              if (onNestedSettingUpdate) onNestedSettingUpdate(key, changedValue);
            }}
            renderInput={renderNestedSettingInput}
          />
        ),
      )}
    </div>
  );
};
