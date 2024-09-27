import { useEffect, useId, useState } from 'react';

import { Select } from 'antd';
import { EditOutlined } from '@ant-design/icons';

import { UserComponent, useEditor, useNode } from '@craftjs/core';

import { ContextMenu, Overlay, Setting } from './utils';
import EditableText from '../_utils/EditableText';
import useBuilderStateStore from '../use-builder-state-store';

type InputProps = {
  label?: string;
  type?: 'text' | 'number' | 'email';
  defaultValue?: string;
  labelPosition?: 'top' | 'left' | 'none';
};

const Input: UserComponent<InputProps> = ({
  label = '',
  type = 'text',
  defaultValue = '',
  labelPosition = 'top',
}) => {
  const {
    connectors: { connect },
    actions: { setProp },
  } = useNode();
  const { editingEnabled } = useEditor((state) => ({ editingEnabled: state.options.enabled }));

  const inputId = useId();

  const [labelHovered, setLabelHovered] = useState(false);
  const [textEditing, setTextEditing] = useState(false);
  const [editingDefault, setEditingDefault] = useState(false);
  const blockDragging = useBuilderStateStore((state) => state.blockDragging);
  const unblockDragging = useBuilderStateStore((state) => state.unblockDragging);
  useEffect(() => {
    if (editingDefault) {
      blockDragging(inputId);

      return () => {
        unblockDragging(inputId);
      };
    }
  }, [inputId, editingDefault]);

  return (
    <ContextMenu menu={[]}>
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
          <div
            style={{ marginRight: labelPosition === 'left' ? '8px' : 0, position: 'relative' }}
            onMouseEnter={() => setLabelHovered(true)}
          >
            <Overlay
              show={labelHovered && !textEditing}
              onHide={() => setLabelHovered(false)}
              controls={[
                {
                  key: 'edit',
                  icon: <EditOutlined onClick={() => setTextEditing(true)} />,
                },
              ]}
            >
              <EditableText
                style={{ whiteSpace: 'nowrap' }}
                value={label}
                active={textEditing}
                onStopEditing={() => setTextEditing(false)}
                tagName="label"
                htmlFor={inputId}
                onClick={(e) => e.preventDefault()}
                onChange={(newText) => setProp((props: InputProps) => (props.label = newText))}
              />
            </Overlay>
          </div>
        )}

        <input
          id={inputId}
          type={type}
          value={defaultValue}
          onClick={() => {
            if (!editingEnabled) return;
            setEditingDefault(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
          }}
          onBlur={() => setEditingDefault(false)}
          onChange={(e) => setProp((props: InputProps) => (props.defaultValue = e.target.value))}
        />
      </div>
    </ContextMenu>
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
    label: 'New Input',
    defaultValue: '',
    labelPosition: 'top',
  },
};

export default Input;
