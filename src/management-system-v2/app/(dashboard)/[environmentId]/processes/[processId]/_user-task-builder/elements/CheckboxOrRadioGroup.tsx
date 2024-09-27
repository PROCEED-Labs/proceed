import { useEffect, useId, useMemo, useState } from 'react';

import { Divider, Input, MenuProps, Select, Space, Tooltip } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import { TbRowInsertTop, TbRowInsertBottom, TbRowRemove } from 'react-icons/tb';

import cn from 'classnames';

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

const checkboxValueHint =
  'This will be the value that is added to the variable associated with this group when the checkbox is checked at the time the form is submitted.';
const radioValueHint =
  'This will be the value that is assigned to the variable associated with this group when the radio button is selected at the time the form is submitted.';

type CheckBoxOrRadioGroupProps = {
  type: 'checkbox' | 'radio';
  variable?: string;
  data: { label: string; value: string; checked: boolean }[];
};

type CheckBoxOrRadioButtonProps = WithRequired<
  Omit<CheckBoxOrRadioGroupProps, 'data'>,
  'variable'
> & {
  label: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  onLabelChange: (newLabel: string) => void;
  onEdit?: () => void;
};

const getNewElementLabel = (type: CheckBoxOrRadioButtonProps['type']) => {
  if (type === 'checkbox') return 'New Checkbox';
  else return 'New Radio Button';
};

const CheckboxOrRadioButton: React.FC<CheckBoxOrRadioButtonProps> = ({
  type,
  variable,
  label,
  value,
  checked,
  onChange,
  onLabelChange,
  onEdit,
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
      <span style={{ position: 'relative', width: '100%' }} onMouseEnter={() => setHovered(true)}>
        <Overlay
          show={hovered && !textEditing}
          onHide={() => setHovered(false)}
          controls={[
            {
              icon: <EditOutlined onClick={() => setTextEditing(true)} />,
              key: 'edit',
            },
            {
              icon: <SettingOutlined onClick={() => onEdit?.()} />,
              key: 'setting',
            },
          ]}
        >
          <EditableText
            value={label}
            tagName="label"
            htmlFor={id}
            active={textEditing}
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

type EditAction = keyof typeof menuOptions;

const SidebarButton = SidebarButtonFactory(menuOptions);
const toMenuItem = MenuItemFactoryFactory(menuOptions);

const CheckBoxOrRadioGroup: UserComponent<CheckBoxOrRadioGroupProps> = ({
  type,
  variable = 'test',
  data,
}) => {
  const { query, editingEnabled } = useEditor((state) => ({
    editingEnabled: state.options.enabled,
  }));

  const [editTarget, setEditTarget] = useState<number>();
  const [hoveredAction, setHoveredAction] = useState<EditAction>();
  const [currentValue, setCurrentValue] = useState('');

  const {
    connectors: { connect },
    actions: { setProp },
    isSelected,
  } = useNode((state) => {
    const parent = state.data.parent && query.node(state.data.parent).get();
    return {
      isHovered: !!parent && parent.events.hovered,
      isSelected: !!parent && parent.events.selected,
    };
  });

  useEffect(() => {
    if (!isSelected) {
      setEditTarget(undefined);
      setHoveredAction(undefined);
      setCurrentValue('');
    }
  }, [isSelected]);

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
        { label: getNewElementLabel(type), value: '', checked: false },
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
    editTarget !== undefined
      ? [
          {
            key: 'add',
            label: 'Add',
            children: [
              toMenuItem('add-above', () => handleAddButton(editTarget), setHoveredAction),
              toMenuItem('add-below', () => handleAddButton(editTarget + 1), setHoveredAction),
            ],
          },
          toMenuItem('remove', () => handleRemoveButton(editTarget), setHoveredAction),
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
                    if (e.key === 'Enter') handleValueChange(editTarget, currentValue);
                    e.stopPropagation();
                  }}
                  onBlur={() => handleValueChange(editTarget, currentValue)}
                />
              </div>
            ),
          },
        ]
      : [];

  const dataWithPreviews = useMemo(() => {
    type DataOrPreview = (typeof data)[number] & {
      isAddPreview?: boolean;
      isRemovePreview?: boolean;
      isEditTarget?: boolean;
    };
    const dataCopy: DataOrPreview[] = data.map((entry, index) => {
      return {
        ...entry,
        isEditTarget: editTarget === index,
        isRemovePreview: editTarget === index && hoveredAction === 'remove',
      };
    });

    if (editTarget !== undefined) {
      const addPreview = {
        label: getNewElementLabel(type),
        value: '',
        isAddPreview: true,
        checked: false,
      };
      if (hoveredAction === 'add-above') dataCopy.splice(editTarget, 0, addPreview);
      else if (hoveredAction === 'add-below') dataCopy.splice(editTarget + 1, 0, addPreview);
    }

    return dataCopy;
  }, [data, editTarget, hoveredAction]);

  return (
    <ContextMenu
      menu={contextMenu}
      onClose={() => {
        setEditTarget(undefined);
        setHoveredAction(undefined);
        setCurrentValue('');
      }}
    >
      <div
        ref={(r) => {
          r && connect(r);
        }}
      >
        <div className="user-task-form-input-group">
          {dataWithPreviews.map(
            ({ label, value, checked, isAddPreview, isRemovePreview, isEditTarget }, index) => (
              <div
                className={cn('user-task-form-input-group-member', {
                  'target-sub-element': isEditTarget && !isRemovePreview,
                  'sub-element-add-preview': isAddPreview,
                  'sub-element-remove-preview': isRemovePreview,
                })}
                onContextMenu={(e) => {
                  setCurrentValue(value);
                  setEditTarget(index);
                  e.preventDefault();
                }}
                key={index}
              >
                <CheckboxOrRadioButton
                  type={type}
                  variable={variable}
                  label={label}
                  value={value}
                  checked={checked}
                  onChange={() => handleClick(index)}
                  onLabelChange={(newLabel) => handleLabelEdit(index, newLabel)}
                  onEdit={() => {
                    setCurrentValue(value);
                    setEditTarget(index);
                  }}
                />
              </div>
            ),
          )}
          {editTarget !== undefined &&
            createPortal(
              <>
                <Divider>{type === 'checkbox' ? 'Checkbox' : 'Radio'} Settings</Divider>
                <Space style={{ width: '100%' }} direction="vertical" align="center">
                  <Space.Compact>
                    <SidebarButton
                      action="add-above"
                      onClick={() => {
                        handleAddButton(editTarget);
                        setEditTarget(editTarget + 1);
                      }}
                      onHovered={setHoveredAction}
                    />
                    <SidebarButton
                      action="add-below"
                      onClick={() => handleAddButton(editTarget + 1)}
                      onHovered={setHoveredAction}
                    />
                    <SidebarButton
                      action="remove"
                      disabled={data.length < 2}
                      onClick={() => {
                        handleRemoveButton(editTarget);
                        setEditTarget(undefined);
                        setCurrentValue('');
                        setHoveredAction(undefined);
                      }}
                      onHovered={setHoveredAction}
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
                          onBlur={() => handleValueChange(editTarget, currentValue)}
                        />
                      }
                    />
                  </Space.Compact>
                </Space>
              </>,
              document.getElementById('sub-element-settings-toolbar')!,
            )}
        </div>
      </div>
    </ContextMenu>
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
    data: [{ label: 'New Element', value: '', checked: false }],
  },
};

export default CheckBoxOrRadioGroup;
