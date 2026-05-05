import { useEffect, useId, useState } from 'react';

import { Button, Select } from 'antd';
import { EditOutlined } from '@ant-design/icons';

import { UserComponent, useNode } from '@craftjs/core';

import { ContextMenu, Overlay, Setting, useDeleteControl, VariableSetting } from './utils';
import EditableText from '../_utils/EditableText';
import useEditorStateStore from '../use-editor-state-store';
import { DeleteButton } from '../DeleteButton';
import DataObjectSelectionModal from '../_utils/DataObjectSelectionModal';

type InputProps = {
  label?: string;
  type?: 'text' | 'number' | 'email' | 'url' | 'file' | 'date';
  defaultValue?: string;
  labelPosition?: 'top' | 'left' | 'none';
  variable?: string;
  globalVariable?: string;
};

export const ExportInput: UserComponent<InputProps> = ({
  label = '',
  type = 'text',
  defaultValue = '',
  labelPosition = 'top',
  variable,
  globalVariable,
}) => {
  const inputId = useId();

  const effectiveName = globalVariable || variable || `__anonymous_variable_${inputId}__`;

  const value = defaultValue || `{%${effectiveName}%}`;

  const input = (
    <input
      id={inputId}
      className={effectiveName ? `variable-${effectiveName}` : undefined}
      type={type}
      defaultValue={value}
      name={effectiveName}
    />
  );

  return (
    <ContextMenu menu={[]}>
      <div
        className={`user-task-form-input input-for-${variable}`}
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
              onStopEditing={() => {}}
              tagName="label"
              htmlFor={inputId}
              onClick={() => {}}
              onChange={() => {}}
            />
          </div>
        )}

        {/* Workaround for custom style file upload found here: https://stackoverflow.com/a/25825731 */}
        {type === 'file' ? (
          <>
            <label className="file-upload" htmlFor={inputId}>
              Upload File
              {input}
            </label>
            <div className="selected-files"></div>
            <div className="validation-error"></div>
          </>
        ) : (
          <>
            {input}
            <div className="validation-error"></div>
          </>
        )}
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
  globalVariable,
}) => {
  const {
    connectors: { connect },
    actions: { setProp },
  } = useNode();

  const editingEnabled = useEditorStateStore((state) => state.editingEnabled);

  const inputId = useId();

  const [labelHovered, setLabelHovered] = useState(false);
  const [textEditing, setTextEditing] = useState(false);
  const [editingDefault, setEditingDefault] = useState(false);
  const [inputHovered, setInputHovered] = useState(false);
  const { handleDelete } = useDeleteControl();
  const blockDragging = useEditorStateStore((state) => state.blockDragging);
  const unblockDragging = useEditorStateStore((state) => state.unblockDragging);
  useEffect(() => {
    if (editingDefault) {
      blockDragging(inputId);

      return () => {
        unblockDragging(inputId);
      };
    }
  }, [inputId, editingDefault]);

  const effectiveName = globalVariable || variable;

  const input = (
    <input
      id={inputId}
      className={effectiveName ? `variable-${effectiveName}` : undefined}
      disabled={!editingEnabled}
      type={type}
      value={defaultValue}
      name={effectiveName}
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
  );

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
          position: 'relative',
        }}
        onMouseEnter={() => setInputHovered(true)}
        onMouseLeave={() => setInputHovered(false)}
      >
        <DeleteButton show={editingEnabled && inputHovered} onClick={handleDelete} />
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
              onDoubleClick={() => setTextEditing(true)}
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

        {/* Workaround for custom style file upload found here: https://stackoverflow.com/a/25825731 */}
        {type === 'file' ? (
          <>
            <label className="file-upload" htmlFor={inputId}>
              Upload File
              {input}
            </label>
          </>
        ) : (
          input
        )}
      </div>
    </ContextMenu>
  );
};

export const InputSettings = () => {
  const {
    actions: { setProp },
    labelPosition,
    variable,
    globalVariable,
  } = useNode((node) => ({
    labelPosition: node.data.props.labelPosition,
    variable: node.data.props.variable,
    globalVariable: node.data.props.globalVariable,
  }));

  const [modalOpen, setModalOpen] = useState(false);

  // Determine display text for the button
  const getDisplayText = () => {
    if (globalVariable) {
      return globalVariable;
    }
    if (variable) {
      return variable;
    }
    return 'Select Variable';
  };

  const displayText = getDisplayText();
  const hasVariable = !!(globalVariable || variable);

  return (
    <>
      <Setting
        label="Label"
        control={
          <Select
            style={{ display: 'flex' }}
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
          <Button
            style={{
              display: 'flex',
              width: '100%',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
            onClick={() => setModalOpen(true)}
            type={hasVariable ? 'default' : 'dashed'}
            title={hasVariable ? displayText : 'Click to select a variable'}
          >
            <span
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1,
                textAlign: 'left',
              }}
            >
              {displayText}
            </span>
            <EditOutlined style={{ marginLeft: 8, flexShrink: 0 }} />
          </Button>
        }
      />

      <DataObjectSelectionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSelect={(selected, isGlobal, variableType, variableTextFormat) => {
          setProp((props: InputProps) => {
            if (isGlobal) {
              props.globalVariable = selected;
              props.variable = undefined;
              props.type = 'text'; // global variables are always text for now
            } else {
              props.variable = selected;
              props.globalVariable = undefined;
              if (variableTextFormat) {
                props.type = variableTextFormat as
                  | 'text'
                  | 'number'
                  | 'email'
                  | 'url'
                  | 'file'
                  | 'date'
                  | undefined;
              } else {
                switch (variableType) {
                  case 'string':
                    props.type = 'text';
                    break;
                  case 'number':
                    props.type = 'number';
                    break;
                  case 'file':
                    props.type = 'file';
                    break;
                  case 'date':
                    props.type = 'date';
                    break;
                  default:
                    props.type = 'text';
                }
              }
            }
          });
        }}
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
    globalVariable: undefined,
  },
};

export default Input;
