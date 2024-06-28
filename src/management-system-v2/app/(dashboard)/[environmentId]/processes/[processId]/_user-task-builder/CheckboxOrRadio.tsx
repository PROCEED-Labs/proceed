import { Input as AntInput, Typography, Select, Button, Space } from 'antd';

import { UserComponent, useEditor, useNode } from '@craftjs/core';
import { useMemo, useState } from 'react';

import { v4 } from 'uuid';
import { ComponentSettings } from './utils';

type CheckboxOrRadioProps = {
  type: 'checkbox' | 'radio';
  variable?: string;
  data?: { label: string; value: string; checked?: boolean }[];
};

const CheckboxOrRadio: UserComponent<CheckboxOrRadioProps> = ({
  type,
  variable = 'test',
  data = [{ label: 'Double-Click Me', value: '', checked: false }],
}) => {
  const { query } = useEditor();

  const {
    connectors: { connect },
    actions: { setProp },
    isHovered,
  } = useNode((state) => {
    const parent = state.data.parent && query.node(state.data.parent).get();

    return { isHovered: !!parent && parent.events.hovered };
  });

  const [currentEditIndex, setCurrentEditIndex] = useState(-1);
  const [currentLabel, setCurrentLabel] = useState('');

  const handleDoubleClick = (index: number) => {
    setCurrentLabel(data[index].label);
    setCurrentEditIndex(index);
  };

  const handleLabelSave = (index: number) => {
    setProp((props: CheckboxOrRadioProps) => {
      props.data = data.map((entry, entryIndex) => {
        let newLabel = entry.label;

        if (entryIndex === index) newLabel = currentLabel;

        return { ...entry, label: newLabel };
      });
    });
    setCurrentLabel('');
    setCurrentEditIndex(-1);
  };

  const handleClick = (index: number) => {
    setProp((props: CheckboxOrRadioProps) => {
      props.data = data.map((entry, entryIndex) => {
        if (entryIndex === index) return { ...entry, checked: !entry.checked };
        else return { ...entry, checked: type === 'radio' ? false : entry.checked };
      });
    });
  };

  const handleAddButton = (index: number) => {
    setProp((props: CheckboxOrRadioProps) => {
      props.data = [
        ...data.slice(0, index + 1),
        { label: 'Double-Click Me', value: '', checked: false },
        ...data.slice(index + 1),
      ];
    });
  };

  const handleRemoveButton = (index: number) => {
    setProp((props: CheckboxOrRadioProps) => {
      props.data = [...data.slice(0, index), ...data.slice(index + 1)];
    });
  };

  const inputIds = useMemo(() => {
    return data.map(() => v4());
  }, [data.length]);

  return (
    <div
      ref={(r) => {
        r && connect(r);
      }}
    >
      <div className="user-task-form-input-group">
        {data.map(({ label, value, checked }, index) => (
          <span key={index}>
            {index === currentEditIndex ? (
              <AntInput
                autoFocus
                value={currentLabel}
                onChange={(e) => setCurrentLabel(e.target.value)}
                onBlur={() => handleLabelSave(index)}
                onPressEnter={() => handleLabelSave(index)}
              />
            ) : (
              <label onDoubleClick={() => handleDoubleClick(index)} htmlFor={inputIds[index]}>
                {label}
              </label>
            )}
            <input
              id={inputIds[index]}
              type={type}
              value={value}
              name={variable}
              checked={checked}
              onClick={() => handleClick(index)}
              onChange={() => handleClick(index)}
            />
            {isHovered && (
              <Button
                style={{
                  position: 'absolute',
                  right: '0',
                  transform: 'translate(100%,0)',
                }}
                title={`Add ${type === 'checkbox' ? 'Checkbox' : 'Radio Button'} Below`}
                onClick={() => handleAddButton(index)}
              >
                +
              </Button>
            )}
            {isHovered && data.length > 1 && (
              <Button
                style={{
                  position: 'absolute',
                  right: '0',
                  transform: 'translate(220%,0)',
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

export const CheckboxOrRadioSettings = () => {
  const {
    actions: { setProp },
    variable,
  } = useNode((node) => ({
    variable: node.data.props.variable,
  }));

  const items = [
    {
      key: 'type',
      label: (
        <Space style={{ minWidth: 'max-content' }} align="center">
          <Typography.Title style={{ marginBottom: 0 }} level={5}>
            Variable:
          </Typography.Title>
          <Select
            options={[
              { value: 'var1', label: 'Var1' },
              { value: 'var2', label: 'Var2' },
              { value: 'var3', label: 'Var3' },
            ]}
            value={variable}
            onChange={(val) =>
              setProp((props: CheckboxOrRadioProps) => {
                props.variable = val;
              })
            }
          />
        </Space>
      ),
    },
  ];

  return <ComponentSettings controls={items} />;
};

CheckboxOrRadio.craft = {
  rules: {
    canDrag: () => false,
  },
  related: {
    settings: CheckboxOrRadioSettings,
  },
  props: {
    variable: 'test',
    data: [{ label: 'Double-Click Me', value: '', checked: false }],
  },
};

export default CheckboxOrRadio;
