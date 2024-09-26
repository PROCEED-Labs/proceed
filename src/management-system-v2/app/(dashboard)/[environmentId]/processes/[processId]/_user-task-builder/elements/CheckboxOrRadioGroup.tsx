import { Fragment, useId, useState } from 'react';

import { Divider, Input, MenuProps, Select, Space, Tooltip } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import { TbRowInsertTop, TbRowInsertBottom, TbRowRemove } from 'react-icons/tb';

import { UserComponent, useEditor, useNode } from '@craftjs/core';

import EditableText from '../_utils/EditableText';
import {
  Setting,
  ContextMenu,
  Overlay,
  SidebarButtonFactory,
  MenuItemFactoryFactory,
} from '../utils';
import { WithRequired } from '@/lib/typescript-utils';

import { SettingOutlined, EditOutlined } from '@ant-design/icons';
import { createPortal } from 'react-dom';

const defaultText = 'Double-Click Me To Edit';

const checkboxValueHint =
  'This will be the value that is added to the variable associated with this group when the checkbox is checked at the time the form is submitted.';
const radioValueHint =
  'This will be the value that is assigned to the variable associated with this group when the radio button is selected at the time the form is submitted.';

type CheckBoxOrRadioGroupProps = {
  type: 'checkbox' | 'radio';
  variable?: string;
  data?: { label: string; value: string; checked?: boolean }[];
};

type CheckBoxOrRadioButtonProps = WithRequired<
  Omit<CheckBoxOrRadioGroupProps, 'data'>,
  'variable'
> & {
  label: string;
  value: string;
  checked?: boolean;
  onChange: () => void;
  onLabelChange: (newLabel: string) => void;
  onContextMenu?: (top: number, left: number) => void;
};

const CheckboxOrRadioButton: React.FC<CheckBoxOrRadioButtonProps> = ({
  type,
  variable,
  label,
  value,
  checked,
  onChange,
  onLabelChange,
  onContextMenu,
}) => {
  const id = useId();
  const [hovered, setHovered] = useState(false);
  const [textEditing, setTextEditing] = useState(false);

  return (
    <>
      <input
        id={id}
        type={type}
        value={value}
        name={variable}
        checked={checked}
        onClick={onChange}
        onChange={onChange}
      />
      <span
        style={{ position: 'relative', width: '100%' }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <Overlay
          show={hovered && !textEditing}
          controls={[
            {
              icon: <EditOutlined onClick={() => setTextEditing(true)} />,
              key: 'edit',
            },
            {
              icon: <SettingOutlined onClick={(e) => onContextMenu?.(e.clientY, e.clientX)} />,
              key: 'setting',
            },
          ]}
        >
          <EditableText
            value={label}
            tagName="label"
            htmlFor={id}
            externalActive={textEditing}
            onStopEditing={() => setTextEditing(false)}
            onChange={onLabelChange}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          />
        </Overlay>
      </span>
    </>
  );
};

const menuOptions = {
  'add-above': { label: 'Above', icon: <TbRowInsertTop size={20} /> },
  'add-below': { label: 'Below', icon: <TbRowInsertBottom size={20} /> },
  remove: { label: 'Remove', icon: <TbRowRemove size={20} /> },
} as const;

type ContextAction = keyof typeof menuOptions;

const SidebarButton = SidebarButtonFactory(menuOptions);
const toMenuItem = MenuItemFactoryFactory(menuOptions);

const CheckBoxOrRadioGroup: UserComponent<CheckBoxOrRadioGroupProps> = ({
  type,
  variable = 'test',
  data = [{ label: defaultText, value: '', checked: false }],
}) => {
  const { query, editingEnabled } = useEditor((state) => ({
    editingEnabled: state.options.enabled,
  }));

  const [contextMenuPosition, setContextMenuPosition] = useState<{ top: number; left: number }>();
  const [contextMenuTarget, setContextMenuTarget] = useState<number>();
  const [hoveredContextAction, setContextAction] = useState<ContextAction>();
  const [currentValue, setCurrentValue] = useState('');

  const {
    connectors: { connect },
    actions: { setProp },
    isHovered,
  } = useNode((state) => {
    const parent = state.data.parent && query.node(state.data.parent).get();
    return { isHovered: !!parent && parent.events.hovered };
  });

  const handleLabelEdit = (index: number, text: string) => {
    if (!editingEnabled) return;
    setProp((props: CheckBoxOrRadioGroupProps) => {
      props.data = data.map((entry, entryIndex) => {
        let newLabel = entry.label;

        if (entryIndex === index) newLabel = text;

        return { ...entry, label: newLabel };
      });
    });
  };

  const handleValueChange = (index: number, value: string) => {
    if (!editingEnabled) return;
    setProp((props: CheckBoxOrRadioGroupProps) => {
      props.data = data.map((entry, entryIndex) => {
        let newValue = entry.value;

        if (entryIndex === index) newValue = value;

        return { ...entry, value: newValue };
      });
    });
  };

  const handleClick = (index: number) => {
    if (!editingEnabled) return;
    setProp((props: CheckBoxOrRadioGroupProps) => {
      props.data = data.map((entry, entryIndex) => {
        if (entryIndex === index) return { ...entry, checked: !entry.checked };
        else return { ...entry, checked: type === 'radio' ? false : entry.checked };
      });
    });
  };

  const handleAddButton = (index: number) => {
    if (!editingEnabled) return;
    setProp((props: CheckBoxOrRadioGroupProps) => {
      props.data = [
        ...data.slice(0, index),
        { label: defaultText, value: '', checked: false },
        ...data.slice(index),
      ];
    });
  };

  const handleRemoveButton = (index: number) => {
    if (!editingEnabled) return;
    setProp((props: CheckBoxOrRadioGroupProps) => {
      props.data = [...data.slice(0, index), ...data.slice(index + 1)];
    });
  };

  const valueTooltip = (
    <Tooltip title={type === 'checkbox' ? checkboxValueHint : radioValueHint}>
      <InfoCircleOutlined />
    </Tooltip>
  );

  const contextMenu: MenuProps['items'] =
    contextMenuTarget !== undefined
      ? [
          {
            key: 'add',
            label: 'Add',
            children: [
              toMenuItem('add-above', () => handleAddButton(contextMenuTarget), setContextAction),
              toMenuItem(
                'add-below',
                () => handleAddButton(contextMenuTarget + 1),
                setContextAction,
              ),
            ],
          },
          toMenuItem('remove', () => handleRemoveButton(contextMenuTarget), setContextAction),
          {
            key: 'value',
            label: (
              <div
                style={{
                  display: 'flex',
                  width: '100%',
                  height: '100%',
                  alignItems: 'center',
                }}
              >
                <Input
                  addonBefore="Value"
                  addonAfter={valueTooltip}
                  style={{ width: '250px' }}
                  value={currentValue}
                  onChange={(e) => setCurrentValue(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleValueChange(contextMenuTarget, currentValue);
                    e.stopPropagation();
                  }}
                  onBlur={() => handleValueChange(contextMenuTarget, currentValue)}
                />
              </div>
            ),
          },
        ]
      : [];

  return (
    <div
      ref={(r) => {
        r && connect(r);
      }}
    >
      <div className="user-task-form-input-group">
        <ContextMenu
          menu={contextMenu}
          onClose={() => {
            setContextMenuTarget(undefined);
            setContextAction(undefined);
            setCurrentValue('');
          }}
          triggers={[]}
          externalPosition={contextMenuPosition}
        >
          {data.map(({ label, value, checked }, index) => (
            <Fragment key={index}>
              {index === contextMenuTarget && hoveredContextAction === 'add-above' && (
                <span style={{ backgroundColor: 'rgba(0,255,0,0.33)' }}>
                  <CheckboxOrRadioButton
                    type={type}
                    variable={variable}
                    label={defaultText}
                    value={value}
                    onChange={() => {}}
                    onLabelChange={() => {}}
                  />
                </span>
              )}
              <div
                className="user-task-form-input-group-member"
                style={{
                  backgroundColor:
                    contextMenuTarget === index && hoveredContextAction === 'remove'
                      ? 'rgba(255,0,0,0.33)'
                      : undefined,
                }}
                onContextMenu={(e) => {
                  setCurrentValue(value);
                  setContextMenuTarget(index);
                  setContextMenuPosition({ top: e.clientY, left: e.clientX });
                  e.preventDefault();
                }}
              >
                <CheckboxOrRadioButton
                  type={type}
                  variable={variable}
                  label={label}
                  value={value}
                  checked={checked}
                  onChange={() => handleClick(index)}
                  onLabelChange={(newLabel) => handleLabelEdit(index, newLabel)}
                  onContextMenu={(top, left) => {
                    setCurrentValue(value);
                    setContextMenuTarget(index);
                    setContextMenuPosition({ top, left });
                  }}
                />
              </div>
              {index === contextMenuTarget && hoveredContextAction === 'add-below' && (
                <span style={{ backgroundColor: 'rgba(0,255,0,0.33)' }}>
                  <CheckboxOrRadioButton
                    type={type}
                    variable={variable}
                    label={defaultText}
                    value={value}
                    onChange={() => {}}
                    onLabelChange={() => {}}
                  />
                </span>
              )}
            </Fragment>
          ))}
          {contextMenuTarget !== undefined &&
            createPortal(
              <>
                <Divider>{type === 'checkbox' ? 'Checkbox' : 'Radio'} Settings</Divider>
                <Space style={{ width: '100%' }} direction="vertical" align="center">
                  <Space.Compact>
                    <SidebarButton
                      action="add-above"
                      onClick={() => {
                        handleAddButton(contextMenuTarget);
                        setContextMenuTarget(contextMenuTarget + 1);
                      }}
                      onHovered={setContextAction}
                    />
                    <SidebarButton
                      action="add-below"
                      onClick={() => handleAddButton(contextMenuTarget + 1)}
                      onHovered={setContextAction}
                    />
                    <SidebarButton
                      action="remove"
                      disabled={data.length < 2}
                      onClick={() => handleRemoveButton(contextMenuTarget)}
                      onHovered={setContextAction}
                    />
                  </Space.Compact>
                  <Space.Compact>
                    <Setting
                      label="Value"
                      control={
                        <Input
                          addonAfter={valueTooltip}
                          value={currentValue}
                          onChange={(e) => setCurrentValue(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          onBlur={() => handleValueChange(contextMenuTarget, currentValue)}
                        />
                      }
                    />
                  </Space.Compact>
                </Space>
              </>,
              document.getElementById('sub-element-settings-toolbar')!,
            )}
        </ContextMenu>
      </div>
    </div>
  );
};

export const CheckBoxOrRadioGroupSettings = () => {
  const {
    actions: { setProp },
    variable,
  } = useNode((node) => ({
    variable: node.data.props.variable,
  }));
  const { editingEnabled } = useEditor((state) => ({ editingEnabled: state.options.enabled }));

  return (
    <>
      <Setting
        label="Variable"
        control={
          <Select
            style={{ display: 'block' }}
            options={[
              { value: 'var1', label: 'Var1' },
              { value: 'var2', label: 'Var2' },
              { value: 'var3', label: 'Var3' },
            ]}
            value={variable}
            disabled={!editingEnabled}
            onChange={(val) =>
              setProp((props: CheckBoxOrRadioGroupProps) => {
                props.variable = val;
              })
            }
          />
        }
      />
    </>
  );
};

CheckBoxOrRadioGroup.craft = {
  rules: {
    canDrag: () => false,
  },
  related: {
    settings: CheckBoxOrRadioGroupSettings,
  },
  props: {
    variable: 'test',
    data: [{ label: defaultText, value: '', checked: false }],
  },
};

export default CheckBoxOrRadioGroup;
