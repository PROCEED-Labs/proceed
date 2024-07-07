import { Input as AntInput, Typography, Row, Select, Space } from 'antd';

import { UserComponent, useNode } from '@craftjs/core';
import { useState } from 'react';

import { v4 } from 'uuid';
import { ComponentSettings } from './utils';

type InputProps = {
  label: string;
  type?: 'text' | 'number' | 'email';
  defaultValue?: string;
};

const Input: UserComponent<InputProps> = ({ label, type = 'text', defaultValue = '' }) => {
  const {
    connectors: { connect },
    actions: { setProp },
  } = useNode();

  const [labelEditable, setLabelEditable] = useState(false);
  const [currentLabel, setCurrentLabel] = useState(label);

  const [defaultEditable, setDefaultEditable] = useState(false);

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
            onMouseDownCapture={(e) => e.stopPropagation()}
          />
        ) : (
          <label onDoubleClick={handleDoubleClick} htmlFor={inputId}>
            {label}
          </label>
        )}
      </div>

      <input
        id={inputId}
        type={type}
        value={defaultValue}
        onMouseDownCapture={(e) => defaultEditable && e.stopPropagation()}
        onDoubleClick={(e) => {
          e.currentTarget.focus();
          setDefaultEditable(true);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.currentTarget.blur();
            setDefaultEditable(false);
          }
        }}
        onBlur={() => setDefaultEditable(false)}
        onChange={(e) => setProp((props: InputProps) => (props.defaultValue = e.target.value))}
      />
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
    defaultValue: '',
  },
};

export default Input;
