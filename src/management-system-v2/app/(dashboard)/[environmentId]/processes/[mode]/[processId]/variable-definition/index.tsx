import React, { useState } from 'react';
import { Button, Divider, Space, Table } from 'antd';

import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  CheckOutlined,
  CloseOutlined,
} from '@ant-design/icons';

import useProcessVariables from '../use-process-variables';
import ProcessVariableForm from './process-variable-form';
import { ProcessVariable, textFormatMap, typeLabelMap } from '@/lib/process-variable-schema';

type VariableDefinitionProps = {
  readOnly?: boolean;
};

const VariableDefinition: React.FC<VariableDefinitionProps> = ({ readOnly = false }) => {
  const [showVariableModal, setShowVariableModal] = useState(false);
  // the original variable that is currently being edited
  // (when a user clicked the edit button of an existing variable)
  const [editVariable, setEditVariable] = useState<ProcessVariable | undefined>(undefined);

  const handleClose = () => {
    setShowVariableModal(false);
    setEditVariable(undefined);
  };

  const { variables, addVariable, updateVariable, removeVariable } = useProcessVariables();

  const handleSubmit = async (variable: ProcessVariable) => {
    if (editVariable) {
      updateVariable(variable, editVariable);
    } else {
      addVariable(variable);
    }

    handleClose();
  };

  return (
    <Space orientation="vertical" style={{ width: '100%' }}>
      <Divider style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem' }}>
        <span style={{ marginRight: '0.3em', marginBottom: '0.1rem' }}>Variables</span>
      </Divider>
      {variables.length > 0 && (
        <Table
          scroll={{ x: true }}
          pagination={{ pageSize: 5, placement: ['bottomCenter'] }}
          rowKey="name"
          columns={[
            {
              title: 'Name',
              dataIndex: 'name',
              key: 'name',
              sorter: (a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }),
            },
            {
              title: 'Description',
              dataIndex: 'description',
              key: 'description',
            },
            {
              title: 'Data Type',
              dataIndex: 'dataType',
              key: 'type',
              render: (_, record) => {
                let label = typeLabelMap[record.dataType];
                if (record.textFormat) {
                  label += ` (${textFormatMap[record.textFormat]})`;
                }
                return <Space>{label}</Space>;
              },
            },
            {
              title: 'Default Value',
              dataIndex: 'default',
              key: 'default',
              render: (_, record) => (
                <Space size="small">
                  {record.defaultValue === 'true'
                    ? 'On/True'
                    : record.defaultValue === 'false'
                      ? 'Off/False'
                      : record.defaultValue}
                </Space>
              ),
            },
            {
              title: 'Allowed Values',
              dataIndex: 'enum',
              key: 'enum',
            },
            {
              title: 'Required',
              dataIndex: 'requiredAtInstanceStartup',
              key: 'requiredAtInstanceStartup',
              render: (_, record) => (
                <Space size="small">
                  {record.requiredAtInstanceStartup ? <CheckOutlined /> : <CloseOutlined />}
                </Space>
              ),
            },
            {
              title: 'Const',
              dataIndex: 'const',
              key: 'const',
              render: (_, record) => (
                <Space size="small">{record.const ? <CheckOutlined /> : <CloseOutlined />}</Space>
              ),
            },
            {
              title: '',
              dataIndex: 'edit',
              key: 'edit',
              render: (_, record) => (
                <Space size="small">
                  <Button
                    type="text"
                    icon={<EditOutlined />}
                    onClick={() => {
                      setShowVariableModal(true);
                      setEditVariable(record);
                    }}
                    disabled={readOnly}
                  />
                  <Button
                    type="text"
                    icon={<DeleteOutlined />}
                    onClick={() => {
                      removeVariable(record.name);
                    }}
                    disabled={readOnly}
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
            setShowVariableModal(true);
          }}
          type="text"
          size="small"
          style={{ fontSize: '0.75rem' }}
          icon={<PlusOutlined />}
          disabled={readOnly}
        >
          <span>Add Variable</span>
        </Button>
      </div>
      <ProcessVariableForm
        open={showVariableModal}
        originalVariable={editVariable}
        variables={variables}
        onSubmit={handleSubmit}
        onCancel={handleClose}
      />
    </Space>
  );
};

export default VariableDefinition;
