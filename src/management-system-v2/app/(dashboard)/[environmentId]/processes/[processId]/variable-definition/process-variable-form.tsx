import React, { useEffect, useState } from 'react';
import { Checkbox, CheckboxChangeEvent, Form, Input, InputNumber, Modal, Select } from 'antd';

import { ProcessVariable } from '../use-process-variables';

type ProcessVariableFormProps = {
  open?: boolean;
  originalVariable?: ProcessVariable;
  variables: ProcessVariable[];
  onSubmit: (variable: ProcessVariable) => void;
  onCancel: () => void;
};

// maps from the data types to what we want to display to the user
export const typeLabelMap = {
  string: 'Text',
  number: 'Number',
  integer: 'Integer',
  boolean: 'On/Off',
  object: 'Complex Structure',
  array: 'List',
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
          onChange={(e) => onChange(e.target.value || undefined)}
        />
      );
    case 'integer':
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
        <Checkbox
          checked={variable.defaultValue === 'true' ? true : false}
          onChange={(e) => onChange(e.target.checked ? 'true' : 'false')}
        />
      );
  }
};

const ProcessVariableForm: React.FC<ProcessVariableFormProps> = ({
  open,
  variables,
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

  return (
    <Modal
      title={originalVariable ? `Edit Variable ${originalVariable.name}` : 'Add a new Variable'}
      open={open}
      onClose={onCancel}
      onCancel={onCancel}
      okText={originalVariable ? 'Update' : 'Add'}
      onOk={handleSubmit}
      destroyOnClose
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
        <Form.Item
          name="type"
          initialValue={typeLabelMap[editVariable.dataType as keyof typeof typeLabelMap]}
          label="Type"
        >
          <Select
            options={[
              { value: 'string', label: 'Text' },
              { value: 'number', label: 'Number' },
              { value: 'integer', label: 'Integer' },
              { value: 'boolean', label: 'On/Off' },
            ]}
            onChange={(value?: ProcessVariable['dataType']) =>
              setEditVariable({ ...editVariable, dataType: value, defaultValue: undefined })
            }
          />
        </Form.Item>
        <Form.Item
          name="default"
          label="Default Value"
          initialValue={editVariable.defaultValue}
          rules={[
            {
              validator(_, value) {
                if (
                  value &&
                  (editVariable.dataType === 'number' || editVariable.dataType === 'integer')
                ) {
                  if (!value.trim() || isNaN(+value.trim())) {
                    return Promise.reject(new Error('The default value has to be a number.'));
                  }
                  if (editVariable.dataType === 'integer' && value.includes('.')) {
                    return Promise.reject(
                      new Error('The default value has to be an integer (whole number).'),
                    );
                  }
                }
                if (value && editVariable.enum && !editVariable.enum.split(';').includes(value)) {
                  return Promise.reject(
                    new Error(
                      'If allowed values are defined the default value has to be one of them.',
                    ),
                  );
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
        {editVariable?.dataType !== 'boolean' && (
          <Form.Item
            name="enum"
            label="Allowed Values"
            initialValue={editVariable.enum}
            rules={[
              {
                validator(_, value: string) {
                  if (
                    value &&
                    (editVariable.dataType === 'number' || editVariable.dataType === 'integer')
                  ) {
                    for (const num of value.split(';')) {
                      if (!num.trim() || isNaN(+num.trim())) {
                        return Promise.reject(
                          new Error('All values defined here have to be numbers.'),
                        );
                      }
                      if (editVariable.dataType === 'integer' && num.includes('.')) {
                        return Promise.reject(
                          new Error('All values defined here have to be integers (whole numbers).'),
                        );
                      }
                    }
                  }

                  return Promise.resolve();
                },
              },
            ]}
          >
            <Input onChange={getChangeHandler('enum')} />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
};

export default ProcessVariableForm;
