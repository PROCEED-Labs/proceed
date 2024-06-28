import { Input as AntInput, Typography, Row, Select, Space } from 'antd';

import { UserComponent, useNode } from '@craftjs/core';
import { useState } from 'react';

import { v4 } from 'uuid';
import { ComponentSettings } from './utils';

type InputProps = {
  label: string;
  type?: 'text' | 'number' | 'email';
};

const Input: UserComponent<InputProps> = ({ label, type = 'text' }) => {
  const {
    connectors: { connect },
    actions: { setProp },
  } = useNode();

  const [labelEditable, setLabelEditable] = useState(false);
  const [currentLabel, setCurrentLabel] = useState(label);

  const handleDoubleClick = () => {
    setLabelEditable(true);
  };

  const handleSave = () => {
    setProp((props: InputProps) => {
      props.label = currentLabel;
    });
    setLabelEditable(false);
  };

  const inputId = v4();

  return (
    <div
      ref={(r) => {
        r && connect(r);
      }}
      className="user-task-form-input"
    >
      <div>
        {labelEditable ? (
          <AntInput
            autoFocus
            value={currentLabel}
            onChange={(e) => setCurrentLabel(e.target.value)}
            onBlur={handleSave}
            onPressEnter={handleSave}
          />
        ) : (
          <label onDoubleClick={handleDoubleClick} htmlFor={inputId}>
            {label}
          </label>
        )}
      </div>

      <input id={inputId} type={type} />
    </div>
  );
};

export const InputSettings = () => {
  const {
    actions: { setProp },
    type,
  } = useNode((node) => ({
    type: node.data.props.type,
  }));

  const items = [
    {
      key: 'type',
      label: (
        <Space style={{ minWidth: 'max-content' }} align="center">
          <Typography.Title style={{ marginBottom: 0 }} level={5}>
            Type:
          </Typography.Title>
          <Select
            options={[
              { value: 'text', label: 'Text' },
              { value: 'number', label: 'Number' },
              { value: 'email', label: 'E-Mail' },
            ]}
            value={type}
            onChange={(val) =>
              setProp((props: InputProps) => {
                props.type = val;
              })
            }
          />
        </Space>
      ),
    },
  ];

  return <ComponentSettings controls={items} />;
};

Input.craft = {
  rules: {
    canDrag: () => false,
  },
  related: {
    settings: InputSettings,
  },
  props: {
    type: 'text',
    label: 'Double-Click Me',
  },
};

export default Input;
