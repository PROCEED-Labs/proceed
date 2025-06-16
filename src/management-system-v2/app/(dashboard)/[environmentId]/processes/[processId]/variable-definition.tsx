import React, { useMemo, useState } from 'react';
import { Button, Space, Table, Modal, Form, Input, Select, InputNumber, Checkbox } from 'antd';

import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';

import { v4 } from 'uuid';

type VariableDefinitionProps = {};

type Variable = {
  id: string;
  name: string;
};

type TextVariable = {
  type: 'Text';
  default?: string;
};
type NumberVariable = {
  type: 'Number';
  default?: number;
};
type OnOffVariable = {
  type: 'On/Off';
  default?: boolean;
};
type ProcessVariable = (TextVariable | NumberVariable | OnOffVariable) & Variable;

type DefaultValueInputProps = {
  variable?: Partial<ProcessVariable>;
  onChange: (newValue: any) => void;
};

const DefaultValueInput: React.FC<DefaultValueInputProps> = ({ variable, onChange }) => {
  if (!variable?.type) return <></>;

  switch (variable.type) {
    case 'Text':
      return (
        <Input value={variable.default} onChange={(e) => onChange(e.target.value || undefined)} />
      );
    case 'Number':
      return (
        <InputNumber
          style={{ width: '100%' }}
          value={variable.default}
          onChange={(value) => onChange(value ?? undefined)}
        />
      );
    case 'On/Off':
      return <Checkbox checked={variable.default} onChange={(e) => onChange(e.target.checked)} />;
  }
};

const VariableDefinition: React.FC<VariableDefinitionProps> = () => {
  const [editVariable, setEditVariable] = useState<Partial<ProcessVariable> | undefined>(undefined);
  const [variables, setVariables] = useState<ProcessVariable[]>([]);

  const [form] = Form.useForm();

  const addOrEditVariable = async () => {
    if (!editVariable) return;
    try {
      await form.validateFields();
      const newVariables = variables
        .filter((v) => v.id !== editVariable.id)
        .concat([editVariable as ProcessVariable]);
      setVariables(newVariables);
      setEditVariable(undefined);
    } catch (err) { }
  };
  const removeVariable = (variableId: string) => {
    setVariables(variables.filter((v) => v.id !== variableId));
  };

  const existingVariableInEditing = useMemo(() => {
    if (!editVariable) return undefined;

    return variables.find((v) => v.id === editVariable.id);
  }, [variables, editVariable]);

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      {variables.length > 0 && (
        <Table
          pagination={{ pageSize: 5, position: ['bottomCenter'] }}
          rowKey="id"
          columns={[
            {
              title: 'Name',
              dataIndex: 'name',
              key: 'name',
              sorter: (a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }),
            },
            {
              title: 'Data Type',
              dataIndex: 'type',
              key: 'type',
            },
            {
              title: 'Default Value',
              dataIndex: 'default',
              key: 'default',
              render: (_, record) => (
                <Space size="small">
                  {record.default === true
                    ? 'On'
                    : record.default === false
                      ? 'Off'
                      : record.default}
                </Space>
              ),
            },
            {
              title: '',
              dataIndex: 'edit',
              key: 'edit',
              render: (_, record) => (
                <Space size="small">
                  <EditOutlined
                    onClick={() => {
                      setEditVariable(record);
                    }}
                  />
                  <DeleteOutlined
                    onClick={() => {
                      removeVariable(record.id);
                    }}
                  />
                </Space>
              ),
            },
          ]}
          dataSource={variables}
        />
      )}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <Button
          onClick={() => {
            setEditVariable({ id: v4(), type: 'Text' });
          }}
          type="text"
          size="small"
          style={{ fontSize: '0.75rem' }}
          icon={<PlusOutlined />}
        >
          <span>Add Variable</span>
        </Button>
      </div>
      <Modal
        title={
          existingVariableInEditing
            ? `Edit Variable ${existingVariableInEditing.name}`
            : 'Add a new Variable'
        }
        open={!!editVariable}
        onClose={() => setEditVariable(undefined)}
        onCancel={() => setEditVariable(undefined)}
        okText={existingVariableInEditing ? 'Update' : 'Add'}
        onOk={() => addOrEditVariable()}
        destroyOnClose
      >
        {editVariable && (
          <Form layout="vertical" form={form} clearOnDestroy>
            <Form.Item
              name="name"
              label="Name"
              initialValue={editVariable.name}
              rules={[{ required: true, message: 'Please enter a name for the variable' }]}
            >
              <Input
                value={editVariable.name}
                onChange={(e) => setEditVariable({ ...editVariable, name: e.target.value })}
              />
            </Form.Item>
            <Form.Item name="type" initialValue={editVariable.type} label="Type">
              <Select
                value={editVariable.type}
                options={[
                  { value: 'Text', label: 'Text' },
                  { value: 'Number', label: 'Number' },
                  { value: 'On/Off', label: 'On/Off' },
                ]}
                onChange={(value?: ProcessVariable['type']) =>
                  setEditVariable({ ...editVariable, type: value, default: undefined })
                }
              />
            </Form.Item>
            <Form.Item name="default" label="Default Value" initialValue={editVariable.default}>
              <DefaultValueInput
                variable={editVariable}
                onChange={(newValue) => setEditVariable({ ...editVariable, default: newValue })}
              />
            </Form.Item>
          </Form>
        )}
      </Modal>
    </Space>
  );
};

export default VariableDefinition;
