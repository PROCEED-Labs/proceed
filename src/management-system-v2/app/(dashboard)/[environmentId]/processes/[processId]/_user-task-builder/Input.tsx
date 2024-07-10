import { Select } from 'antd';

import { UserComponent, useNode } from '@craftjs/core';
import { useId, useState } from 'react';

import { EditableText, Setting } from './utils';

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

  const [defaultEditable, setDefaultEditable] = useState(false);

  const inputId = useId();

  return (
    <div
      ref={(r) => {
        r && connect(r);
      }}
      className="user-task-form-input"
    >
      <div>
        <EditableText
          value={label}
          tagName="label"
          htmlFor={inputId}
          onClick={(e) => e.preventDefault()}
          onChange={(newText) => setProp((props: InputProps) => (props.label = newText))}
        />
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

  return (
    <>
      <Setting
        label="Type"
        control={
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
        }
      />
    </>
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
    defaultValue: '',
  },
};

export default Input;
