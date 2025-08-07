import { useEffect, useId, useState } from 'react';

import { Select, Input as AntInput } from 'antd';
import { EditOutlined } from '@ant-design/icons';

import { UserComponent, useNode } from '@craftjs/core';

import { ContextMenu, Overlay, Setting, VariableSetting } from './utils';
import EditableText from '../_utils/EditableText';
import useBuilderStateStore from '../use-builder-state-store';
import { useCanEdit } from '../../modeler';
import useProcessVariables from '../../use-process-variables';

import { textFormatMap, typeLabelMap } from '../../use-process-variables';

type InputProps = {
  label?: string;
  type?: 'text' | 'number' | 'email' | 'url' | 'file';
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

  const input = (
    <input
      id={inputId}
      className={variable ? `variable-${variable}` : undefined}
      type={type}
      defaultValue={value}
      name={variable}
    />
  );

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
          </>
        ) : (
          input
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
}) => {
  const {
    connectors: { connect },
    actions: { setProp },
  } = useNode();
  const editingEnabled = useCanEdit();

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

  const input = (
    <input
      id={inputId}
      className={variable ? `variable-${variable}` : undefined}
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
  } = useNode((node) => ({
    type: node.data.props.type,
    labelPosition: node.data.props.labelPosition,
    variable: node.data.props.variable,
  }));

  const { variables } = useProcessVariables();

  const selectedVariable = variables.find((v) => v.name === variable);

  return (
    <>
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

      <VariableSetting
        variable={variable}
        allowedTypes={['string', 'number', 'file']}
        onChange={(newVariable, newVariableType, newVariableFormat) => {
          setProp((props: InputProps) => {
            props.variable = newVariable;

            if (newVariableFormat) {
              props.type = newVariableFormat;
              return;
            }

            switch (newVariableType) {
              case 'string':
                props.type = 'text';
                break;
              case 'number':
                props.type = 'number';
                break;
              case 'file':
                props.type = 'file';
                break;
              default:
                props.type = 'text';
            }
          });
        }}
      />
      {selectedVariable ? (
        <>
          <Setting
            label="Type"
            disabled
            control={<AntInput value={typeLabelMap[selectedVariable.dataType]} />}
          />
          {!!selectedVariable.textFormat && (
            <Setting
              label="Format"
              disabled
              control={<AntInput value={textFormatMap[selectedVariable.textFormat]} />}
            />
          )}
        </>
      ) : null}
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
