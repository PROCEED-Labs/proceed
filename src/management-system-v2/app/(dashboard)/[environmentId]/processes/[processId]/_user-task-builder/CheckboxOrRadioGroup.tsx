import { useId } from 'react';

import { Select, Button } from 'antd';

import { UserComponent, useEditor, useNode } from '@craftjs/core';

import EditableText from './_utils/EditableText';
import { Setting } from './utils';
import { WithRequired } from '@/lib/typescript-utils';

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
};

const CheckboxOrRadioButton: React.FC<CheckBoxOrRadioButtonProps> = ({
  type,
  variable,
  label,
  value,
  checked,
  onChange,
  onLabelChange,
}) => {
  const id = useId();

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
      <EditableText
        value={label}
        tagName="label"
        htmlFor={id}
        onChange={onLabelChange}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      />
    </>
  );
};

const CheckBoxOrRadioGroup: UserComponent<CheckBoxOrRadioGroupProps> = ({
  type,
  variable = 'test',
  data = [{ label: 'Double-Click Me', value: '', checked: false }],
}) => {
  const { query, editingEnabled } = useEditor((state) => ({
    editingEnabled: state.options.enabled,
  }));

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
        ...data.slice(0, index + 1),
        { label: 'Double-Click Me', value: '', checked: false },
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

  return (
    <div
      ref={(r) => {
        r && connect(r);
      }}
    >
      <div className="user-task-form-input-group">
        {data.map(({ label, value, checked }, index) => (
          <span key={index}>
            <CheckboxOrRadioButton
              type={type}
              variable={variable}
              label={label}
              value={value}
              checked={checked}
              onChange={() => handleClick(index)}
              onLabelChange={(newLabel) => handleLabelEdit(index, newLabel)}
            />
            {editingEnabled && isHovered && (
              <Button
                style={{
                  position: 'absolute',
                  right: '0',
                  transform: 'translate(110%,0)',
                }}
                title={`Add ${type === 'checkbox' ? 'Checkbox' : 'Radio Button'} Below`}
                onClick={() => handleAddButton(index)}
              >
                +
              </Button>
            )}
            {editingEnabled && isHovered && data.length > 1 && (
              <Button
                style={{
                  position: 'absolute',
                  right: '0',
                  transform: 'translate(230%,0)',
                }}
                title={`Remove ${type === 'checkbox' ? 'Checkbox' : 'Radio Button'}`}
                onClick={() => handleRemoveButton(index)}
              >
                -
              </Button>
            )}
          </span>
        ))}
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
    data: [{ label: 'Double-Click Me', value: '', checked: false }],
  },
};

export default CheckBoxOrRadioGroup;
