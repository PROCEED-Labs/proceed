import React, { useEffect, useState } from 'react';
import {
  Checkbox,
  CheckboxChangeEvent,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Tooltip,
  Typography,
} from 'antd';

import { FaRegQuestionCircle } from 'react-icons/fa';
import { ProcessVariable, textFormatMap, typeLabelMap } from '@/lib/process-variable-schema';

type ProcessVariableFormProps = {
  open?: boolean;
  originalVariable?: ProcessVariable;
  allowedTypes?: ProcessVariable['dataType'][];
  variables: ProcessVariable[];
  onSubmit: (variable: ProcessVariable) => void;
  onCancel: () => void;
};

type DefaultValueInputProps = {
  variable?: Partial<ProcessVariable>;
  onChange: (newValue: any) => void;
};

const DefaultValueInput: React.FC<DefaultValueInputProps> = ({ variable, onChange }) => {
  if (!variable?.dataType) return <></>;

  switch (variable.dataType) {
    case 'string':
      return (
        <Input
          value={variable.defaultValue}
          type={variable.textFormat}
          onChange={(e) => onChange(e.target.value || undefined)}
        />
      );
    case 'number':
      return (
        <InputNumber
          style={{ width: '100%' }}
          value={variable.defaultValue ? parseFloat(variable.defaultValue) : undefined}
          stringMode
          onChange={(value) => onChange(value ? value : undefined)}
        />
      );
    case 'boolean':
      return (
        <Select
          value={variable.defaultValue || null}
          labelRender={(entry) => (entry.value ? entry.label : '')}
          options={[
            {
              value: null,
              label: <Typography.Text type="secondary">[No Default]</Typography.Text>,
            },
            { value: 'true', label: 'On/True' },
            { value: 'false', label: 'Off/False' },
          ]}
          onChange={(val) => onChange(val)}
        />
      );
  }
};

function isNumber(num: string) {
  return num.trim() && !isNaN(+num.trim());
}

const ProcessVariableForm: React.FC<ProcessVariableFormProps> = ({
  open,
  variables,
  allowedTypes = Object.keys(typeLabelMap),
  originalVariable,
  onSubmit,
  onCancel,
}) => {
  const [editVariable, setEditVariable] = useState<Partial<ProcessVariable> | undefined>();

  const [form] = Form.useForm();

  useEffect(() => {
    if (open) {
      if (originalVariable) {
        setEditVariable({ ...originalVariable });
      } else {
        setEditVariable({ dataType: 'string' });
      }
    }
    return () => setEditVariable(undefined);
  }, [open, originalVariable]);

  const handleSubmit = async () => {
    try {
      await form.validateFields();

      onSubmit(editVariable as ProcessVariable);
    } catch (err) {}
  };

  if (!editVariable) return <></>;

  const getChangeHandler = (
    attr: keyof ProcessVariable,
    eventAttr: 'value' | 'checked' = 'value',
  ) => {
    return (e: React.ChangeEvent<HTMLInputElement> | CheckboxChangeEvent) =>
      setEditVariable({ ...editVariable, [attr]: e.target[eventAttr] });
  };

  const validateValue = (val: string) => {
    if (editVariable.dataType === 'number' && !isNumber(val)) {
      return Promise.reject('Values of a number variable can only be numbers.');
    }
  };

  const canHaveDefault = () => {
    if (!editVariable?.dataType) return false;
    const types = ['number', 'string', 'boolean'];
    return types.includes(editVariable.dataType);
  };
  const canHaveAllowedValues = () => {
    if (!editVariable?.dataType) return false;
    const types = ['number', 'string'];
    return types.includes(editVariable.dataType);
  };

  return (
    <Modal
      title={originalVariable ? `Edit Variable ${originalVariable.name}` : 'Add a new Variable'}
      open={open}
      onClose={onCancel}
      onCancel={onCancel}
      okText={originalVariable ? 'Update' : 'Add'}
      onOk={handleSubmit}
      destroyOnClose
      maskClosable={false}
    >
      <Form layout="vertical" form={form} clearOnDestroy>
        <Form.Item
          name="name"
          label="Name"
          initialValue={editVariable.name}
          rules={[
            { required: true, message: 'Please enter a name for the variable' },
            () => ({
              validator(_, value) {
                const sameNameVariable = variables.find((v) => v.name === value);
                if (sameNameVariable && sameNameVariable !== originalVariable) {
                  return Promise.reject(
                    new Error(
                      'This name is already used by another variable please choose a different one',
                    ),
                  );
                }

                return Promise.resolve();
              },
            }),
          ]}
        >
          <Input onChange={getChangeHandler('name')} />
        </Form.Item>
        <Form.Item
          name="type"
          initialValue={editVariable.dataType}
          label="Type"
          rules={[{ required: true, message: 'Every variabel needs to have a type' }]}
        >
          <Select
            options={Object.entries(typeLabelMap)
              .filter(([value]) => allowedTypes.includes(value))
              .map(([value, label]) => ({ value, label }))}
            onChange={(value) => {
              setEditVariable({
                ...editVariable,
                dataType: value,
                textFormat: undefined,
                defaultValue: undefined,
                enum: undefined,
              });
              form.setFieldValue('enum', undefined);
            }}
          />
        </Form.Item>
        {editVariable.dataType === 'string' && (
          <Form.Item name="format" label="Format" initialValue={editVariable.textFormat}>
            <Select
              options={[{ value: '', label: 'None' }].concat(
                Object.entries(textFormatMap).map(([value, label]) => ({ value, label })),
              )}
              onChange={(value) => {
                setEditVariable({
                  ...editVariable,
                  textFormat: value ? value : undefined,
                });
              }}
            />
          </Form.Item>
        )}
        <Form.Item name="description" label="Description" initialValue={editVariable.description}>
          <Input onChange={getChangeHandler('description')} />
        </Form.Item>
        <Form.Item
          name="requiredAtInstanceStartup"
          initialValue={editVariable.requiredAtInstanceStartup}
          label="Required at Startup"
        >
          <Checkbox
            checked={editVariable.requiredAtInstanceStartup}
            onChange={getChangeHandler('requiredAtInstanceStartup', 'checked')}
          />
        </Form.Item>
        <Form.Item name="const" initialValue={editVariable.const} label="Unchangeable Value">
          <Checkbox checked={editVariable.const} onChange={getChangeHandler('const', 'checked')} />
        </Form.Item>
        {canHaveDefault() && (
          <Form.Item
            name="default"
            label="Default Value"
            initialValue={editVariable.defaultValue}
            rules={[
              {
                validator(_, value) {
                  if (value) {
                    const error = validateValue(value);
                    if (error) return error;
                    if (editVariable.enum && !editVariable.enum.split(';').includes(value)) {
                      return Promise.reject(
                        new Error(
                          'If allowed values are defined the default value has to be one of them.',
                        ),
                      );
                    }
                  }

                  return Promise.resolve();
                },
              },
            ]}
          >
            <DefaultValueInput
              variable={editVariable}
              onChange={(newValue) => {
                setEditVariable({ ...editVariable, defaultValue: newValue });
              }}
            />
          </Form.Item>
        )}
        {canHaveAllowedValues() && (
          <Form.Item
            name="enum"
            label={
              <div style={{ display: 'flex', alignItems: 'center', gap: '.3rem' }}>
                Allowed Values{' '}
                <Tooltip
                  placement="right"
                  title="To define multiple values enter them one after another with a ';' between them (e.g. 123;456;789)"
                >
                  <FaRegQuestionCircle style={{ verticalAlign: 'center' }} />
                </Tooltip>
              </div>
            }
            initialValue={editVariable.enum}
            rules={[
              {
                validator(_, value: string) {
                  if (value) {
                    for (const num of value.split(';')) {
                      const error = validateValue(num);
                      if (error) return error;
                    }
                  }

                  return Promise.resolve();
                },
              },
            ]}
          >
            <Input
              onChange={(e) => {
                getChangeHandler('enum')(e);
                if (canHaveDefault()) form.validateFields();
              }}
              placeholder="value1;value2;..."
            />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
};

export default ProcessVariableForm;
