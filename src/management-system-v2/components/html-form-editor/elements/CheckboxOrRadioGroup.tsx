import React, { useEffect, useId, useMemo, useState } from 'react';

import { Divider, Input, MenuProps, Space, Tooltip } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import {
  TbRowInsertTop,
  TbRowInsertBottom,
  TbRowRemove,
  TbArrowBarUp,
  TbArrowBarDown,
} from 'react-icons/tb';

import cn from 'classnames';

import { UserComponent, useEditor, useNode } from '@craftjs/core';

import EditableText from '../_utils/EditableText';
import {
  Setting,
  ContextMenu,
  Overlay,
  SidebarButtonFactory,
  MenuItemFactoryFactory,
  VariableSetting,
} from './utils';
import { WithRequired } from '@/lib/typescript-utils';

import { EditOutlined } from '@ant-design/icons';
import { createPortal } from 'react-dom';
import { useCanEdit } from '@/lib/can-edit-context';
import useEditorStateStore from '../use-editor-state-store';

const checkboxValueHint =
  'This will be the value that is added to the variable associated with this group when the checkbox is checked at the time the form is submitted.';
const radioValueHint =
  'This will be the value that is assigned to the variable associated with this group when the radio button is selected at the time the form is submitted.';

export type CheckBoxOrRadioGroupProps = {
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

const ExportCheckboxOrRadioButton: React.FC<CheckBoxOrRadioButtonProps> = ({
  type,
  variable,
  label,
  value,
  checked,
}) => {
  const id = useId();

  let checkOrPlaceholder = checked ? 'checked' : '';
  if (!checked) {
    if (value && type === 'radio') {
      checkOrPlaceholder = `{%if ${variable} == '${value}'%}checked{%/if%}`;
    } else if (value && type === 'checkbox') {
      checkOrPlaceholder = `{%if ${variable} contains '${value}'%}checked{%/if%}`;
    } else {
      checkOrPlaceholder = `{%if ${variable}%}checked{%/if%}`;
    }
  }

  // use inner html to allow the inclusion of our placeholders in the output which would be excluded
  // when using regular react input components
  return (
    <div
      className="user-task-form-input-group-member"
      dangerouslySetInnerHTML={{
        __html: `
<input id="${id}" type="${type}" value="${value || ''}" name="${variable}" ${checkOrPlaceholder}/>
<span style="position: relative; width: 100%"><label for="${id}">${label}</span></span>
`,
      }}
    />
  );
};

export const ExportCheckboxOrRadioGroup: React.FC<CheckBoxOrRadioGroupProps> = ({
  type,
  variable = '',
  data,
}) => {
  const id = useId();

  if (!variable) variable = `__anonymous_variable_${id}__`;

  data = data.map((entry) => {
    if (!entry.value && (type === 'radio' || data.length > 1)) {
      // if we have a radio button or multiple checkboxes we require the entry to have a value
      // => set the value to the content of the label if the user has not provided a value
      let { value, label } = entry;
      if (label) {
        let labelText = label;
        let newLabelText = label;
        // unwrap the value of the label from the surrounding html elements
        do {
          labelText = newLabelText;
          newLabelText = newLabelText.replace(/(.*)(<[^<]*>)(.*)/, '$1$3');
        } while (labelText != newLabelText);
        value = newLabelText;
      } else value = id;
      return { ...entry, value };
    }

    return entry;
  });

  return (
    <div className={`user-task-form-input-group variable-${variable}`}>
      {data.map((entry) => (
        <ExportCheckboxOrRadioButton
          type={type}
          variable={variable}
          label={entry.label}
          value={entry.value}
          checked={entry.checked}
          onChange={() => {}}
          onLabelChange={() => {}}
        />
      ))}
    </div>
  );
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

  const editingEnabled = useCanEdit();
  return (
    <>
      <input
        id={id}
        disabled={!editingEnabled}
        type={type}
        value={value || undefined}
        name={variable}
        checked={checked}
        onClick={onChange}
        onChange={onChange}
      />
      <span
        onClick={() => onEdit?.()}
        style={{ position: 'relative', width: '100%' }}
        onMouseEnter={() => setHovered(true)}
      >
        <Overlay
          show={hovered && !textEditing}
          onHide={() => setHovered(false)}
          controls={[
            editingEnabled && {
              icon: <EditOutlined onClick={() => setTextEditing(true)} />,
              key: 'edit',
            },
          ]}
          onDoubleClick={() => setTextEditing(true)}
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
  'move-down': { label: 'Down', icon: <TbArrowBarDown /> },
  'move-up': { label: 'Up', icon: <TbArrowBarUp /> },
} as const;

type EditAction = keyof typeof menuOptions;

const SidebarButton = SidebarButtonFactory(menuOptions);
const toMenuItem = MenuItemFactoryFactory(menuOptions);

const CheckBoxOrRadioGroup: UserComponent<CheckBoxOrRadioGroupProps> = ({
  type,
  variable = '',
  data,
}) => {
  const { query } = useEditor();

  const [editTarget, setEditTarget] = useState<number>();
  const [hoveredAction, setHoveredAction] = useState<EditAction>();
  const [currentValue, setCurrentValue] = useState('');

  const variables = useEditorStateStore((state) => state.variables);

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

  const editingEnabled = useCanEdit();

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

  const handleMoveDown = (index: number) => {
    if (!editingEnabled) return;
    setProp((props: CheckBoxOrRadioGroupProps) => {
      props.data = [
        ...data.slice(0, index),
        data[index + 1],
        data[index],
        ...data.slice(index + 2),
      ];
    });
  };

  const handleMoveUp = (index: number) => {
    if (!editingEnabled) return;
    setProp((props: CheckBoxOrRadioGroupProps) => {
      props.data = [
        ...data.slice(0, index - 1),
        data[index],
        data[index - 1],
        ...data.slice(index + 1),
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

  const selectedVariable = variables?.find((v) => v.name === variable);
  const showAdditionalOptions =
    editTarget !== undefined && (!selectedVariable || selectedVariable.dataType !== 'boolean');

  const contextMenu: MenuProps['items'] = showAdditionalOptions
    ? [
        {
          key: 'add',
          label: 'Add',
          children: [
            toMenuItem('add-above', () => handleAddButton(editTarget), setHoveredAction),
            toMenuItem('add-below', () => handleAddButton(editTarget + 1), setHoveredAction),
          ],
        },
        {
          key: 'move',
          label: 'Move',
          children: [
            toMenuItem('move-up', () => editTarget && handleMoveUp(editTarget), setHoveredAction),
            toMenuItem(
              'move-down',
              () => editTarget < data.length - 1 && handleMoveDown(editTarget),
              setHoveredAction,
            ),
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
    let dataCopy: DataOrPreview[] = data.map((entry, index) => {
      return {
        ...entry,
        isEditTarget: editTarget === index,
        isRemovePreview: editTarget === index && hoveredAction === 'remove',
      };
    });

    const addPreview = {
      label: getNewElementLabel(type),
      value: '',
      isAddPreview: true,
      checked: false,
    };
    if (hoveredAction === 'add-above') dataCopy.splice(editTarget || 0, 0, addPreview);
    else if (hoveredAction === 'add-below')
      dataCopy.splice(editTarget ? editTarget + 1 : dataCopy.length, 0, addPreview);
    else if (editTarget && hoveredAction === 'move-down' && editTarget < dataCopy.length - 1)
      dataCopy = [
        ...dataCopy.slice(0, editTarget),
        { ...dataCopy[editTarget], isRemovePreview: true },
        dataCopy[editTarget + 1],
        { ...dataCopy[editTarget], isAddPreview: true },
        ...dataCopy.slice(editTarget + 2),
      ];
    else if (hoveredAction === 'move-up' && editTarget)
      dataCopy = [
        ...dataCopy.slice(0, editTarget - 1),
        { ...dataCopy[editTarget], isAddPreview: true },
        dataCopy[editTarget - 1],
        { ...dataCopy[editTarget], isRemovePreview: true },
        ...dataCopy.slice(editTarget + 1),
      ];

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
        <div className={`user-task-form-input-group variable-${variable}`}>
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
          {showAdditionalOptions &&
            createPortal(
              <>
                <Divider>{type === 'checkbox' ? 'Checkbox' : 'Radio'} Settings</Divider>
                <Space style={{ width: '100%' }} direction="vertical" align="center">
                  <Space.Compact>
                    <SidebarButton
                      action="add-above"
                      onClick={() => {
                        handleAddButton(editTarget || 0);
                        setEditTarget(editTarget ? editTarget + 1 : 0);
                      }}
                      onHovered={setHoveredAction}
                    />
                    <SidebarButton
                      action="add-below"
                      onClick={() => {
                        if (editTarget !== undefined) {
                          handleAddButton(editTarget + 1);
                        } else {
                          handleAddButton(data.length);
                          setEditTarget(data.length);
                        }
                      }}
                      onHovered={setHoveredAction}
                    />
                    <SidebarButton
                      action="remove"
                      disabled={editTarget === undefined || data.length < 2}
                      onClick={() => {
                        if (editTarget !== undefined) {
                          handleRemoveButton(editTarget);
                          setEditTarget(undefined);
                          setCurrentValue('');
                          setHoveredAction(undefined);
                        }
                      }}
                      onHovered={setHoveredAction}
                    />
                    <SidebarButton
                      action="move-down"
                      disabled={editTarget === undefined || data.length - 1 === editTarget}
                      onClick={() => {
                        if (editTarget !== undefined) {
                          handleMoveDown(editTarget);
                          setEditTarget(editTarget + 1);
                        }
                      }}
                      onHovered={setHoveredAction}
                    />
                    <SidebarButton
                      action="move-up"
                      disabled={!editTarget}
                      onClick={() => {
                        if (editTarget !== undefined) {
                          handleMoveUp(editTarget);
                          setEditTarget(editTarget - 1);
                        }
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
                          onBlur={() =>
                            editTarget !== undefined && handleValueChange(editTarget, currentValue)
                          }
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
    type,
    variable,
    data,
  } = useNode((node) => ({
    type: node.data.props.type,
    variable: node.data.props.variable,
    data: node.data.props.data,
  }));

  const allowedTypes: React.ComponentProps<typeof VariableSetting>['allowedTypes'] =
    type === 'radio' ? ['string', 'number'] : ['boolean', 'array'];

  return (
    <VariableSetting
      variable={variable}
      allowedTypes={allowedTypes}
      onChange={(newVariable, variableType) =>
        setProp((props: CheckBoxOrRadioGroupProps) => {
          props.variable = newVariable;

          // if the type is set to boolean make sure there is only one checkbox and the
          // value is empty so the default on/off is used
          if (variableType === 'boolean') props.data = [{ ...data[0], value: '' }];
        })
      }
    />
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
    data: [{ label: 'New Element', value: '', checked: false }],
  },
};

export default CheckBoxOrRadioGroup;
