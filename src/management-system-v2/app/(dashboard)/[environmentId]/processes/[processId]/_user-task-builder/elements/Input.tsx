import { useContext, useEffect, useId, useState } from 'react';

import { Select, Input as AntInput } from 'antd';
import { EditOutlined } from '@ant-design/icons';

import { UserComponent, useNode } from '@craftjs/core';

import { ContextMenu, Overlay, Setting } from './utils';
import EditableText from '../_utils/EditableText';
import useBuilderStateStore from '../use-builder-state-store';
import BuilderContext from '../BuilderContext';

type InputProps = {
  label?: string;
  type?: 'text' | 'number' | 'email';
  defaultValue?: string;
  labelPosition?: 'top' | 'left' | 'none';
  variable?: string;
};

export const ExportInput: UserComponent<InputProps> = ({
  label = '',
  type = 'text',
  defaultValue = '',
  labelPosition = 'top',
  variable,
}) => {
  const inputId = useId();

  const value = defaultValue || (variable && `{${variable}}`);

  return (
    <ContextMenu menu={[]}>
      <div
        className="user-task-form-input"
        style={{
          display: 'flex',
          flexDirection: labelPosition === 'top' ? 'column' : 'row',
          alignItems: labelPosition === 'left' ? 'baseline' : undefined,
        }}
      >
        {labelPosition !== 'none' && (
          <div style={{ marginRight: labelPosition === 'left' ? '8px' : 0, position: 'relative' }}>
            <EditableText
              style={{ whiteSpace: 'nowrap' }}
              value={label}
              active={false}
              onStopEditing={() => { }}
              tagName="label"
              htmlFor={inputId}
              onClick={() => { }}
              onChange={() => { }}
            />
          </div>
        )}

        <input id={inputId} type={type} defaultValue={value} name={variable} />
      </div>
    </ContextMenu>
  );
};

const Input: UserComponent<InputProps> = ({
  label = '',
  type = 'text',
  defaultValue = '',
  labelPosition = 'top',
  variable,
}) => {
  const {
    connectors: { connect },
    actions: { setProp },
  } = useNode();
  const { editingEnabled } = useContext(BuilderContext);

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
              show={editingEnabled && labelHovered && !textEditing}
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
          disabled={!editingEnabled}
          type={type}
          value={defaultValue}
          name={variable}
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
    variable,
  } = useNode((node) => ({
    type: node.data.props.type,
    labelPosition: node.data.props.labelPosition,
    variable: node.data.props.variable,
  }));

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
            onChange={(val) =>
              setProp((props: InputProps) => {
                props.labelPosition = val;
              })
            }
          />
        }
      />
      <Setting
        label="Variable"
        control={
          <AntInput
            value={variable}
            onChange={(e) => {
              setProp((props: InputProps) => {
                props.variable = e.target.value;
              });
            }}
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
    variable: undefined,
  },
};

export default Input;
