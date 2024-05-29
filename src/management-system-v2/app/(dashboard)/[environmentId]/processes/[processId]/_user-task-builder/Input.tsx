import { Input as AntInput, Typography, Row, Select } from 'antd';

import { UserComponent, useNode } from '@craftjs/core';
import { useState } from 'react';

import { v4 } from 'uuid';

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
    setProp((props) => {
      props.label = currentLabel;
    });
    setLabelEditable(false);
  };

  const inputId = v4();

  return (
    <div ref={(r) => connect(r)} className="user-task-form-input">
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

  return (
    <Row>
      <Typography.Title style={{ marginRight: 10 }} level={5}>
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
          setProp((props) => {
            props.type = val;
          })
        }
      />
    </Row>
  );
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
