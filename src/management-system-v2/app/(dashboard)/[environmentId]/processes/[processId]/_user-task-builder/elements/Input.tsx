import { useId, useState } from 'react';

import { Select } from 'antd';
import { UserComponent, useEditor, useNode } from '@craftjs/core';

import { Setting } from '../utils';
import EditableText from '../_utils/EditableText';

type InputProps = {
  label: string;
  type?: 'text' | 'number' | 'email';
  defaultValue?: string;
  labelPosition?: 'top' | 'left' | 'none';
};

const Input: UserComponent<InputProps> = ({
  label,
  type = 'text',
  defaultValue = '',
  labelPosition = 'top',
}) => {
  const {
    connectors: { connect },
    actions: { setProp },
  } = useNode();
  const { editingEnabled } = useEditor((state) => ({ editingEnabled: state.options.enabled }));

  const [defaultEditable, setDefaultEditable] = useState(false);

  const inputId = useId();

  return (
    <div
      ref={(r) => {
        r && connect(r);
      }}
      className="user-task-form-input"
      style={{
        display: 'flex',
        flexDirection: labelPosition === 'top' ? 'column' : 'row',
        alignItems: labelPosition === 'left' ? 'baseline' : undefined,
      }}
    >
      {labelPosition !== 'none' && (
        <div style={{ marginRight: labelPosition === 'left' ? '8px' : 0 }}>
          <EditableText
            value={label}
            tagName="label"
            htmlFor={inputId}
            onClick={(e) => e.preventDefault()}
            onChange={(newText) => setProp((props: InputProps) => (props.label = newText))}
          />
        </div>
      )}

      <input
        id={inputId}
        type={type}
        value={defaultValue}
        onMouseDownCapture={(e) => defaultEditable && e.stopPropagation()}
        onDoubleClick={(e) => {
          if (!editingEnabled) return;
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
    labelPosition,
  } = useNode((node) => ({
    type: node.data.props.type,
    labelPosition: node.data.props.labelPosition,
  }));
  const { editingEnabled } = useEditor((state) => ({ editingEnabled: state.options.enabled }));

  return (
    <>
      <Setting
        label="Type"
        control={
          <Select
            style={{ display: 'block' }}
            options={[
              { value: 'text', label: 'Text' },
              { value: 'number', label: 'Number' },
              { value: 'email', label: 'E-Mail' },
            ]}
            value={type}
            disabled={!editingEnabled}
            onChange={(val) =>
              setProp((props: InputProps) => {
                props.type = val;
              })
            }
          />
        }
      />
      <Setting
        label="Label"
        control={
          <Select
            style={{ display: 'block' }}
            options={[
              { value: 'top', label: 'Above' },
              { value: 'left', label: 'Left' },
              { value: 'none', label: 'Hidden' },
            ]}
            value={labelPosition}
            disabled={!editingEnabled}
            onChange={(val) =>
              setProp((props: InputProps) => {
                props.labelPosition = val;
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
    labelPosition: 'top',
  },
};

export default Input;
