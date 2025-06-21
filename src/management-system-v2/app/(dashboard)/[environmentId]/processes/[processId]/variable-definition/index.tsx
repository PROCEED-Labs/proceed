import React, { useState } from 'react';
import { Button, Space, Table } from 'antd';

import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  CheckOutlined,
  CloseOutlined,
} from '@ant-design/icons';

import type { Variable as ProcessVariable } from '@proceed/bpmn-helper/src/getters';
import useProcessVariables from '../use-process-variables';
import ProcessVariableForm, { typeLabelMap } from './process-variable-form';

type VariableDefinitionProps = {};

const VariableDefinition: React.FC<VariableDefinitionProps> = () => {
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
    <Space direction="vertical" style={{ width: '100%' }}>
      {variables.length > 0 && (
        <Table
          scroll={{ x: true }}
          pagination={{ pageSize: 5, position: ['bottomCenter'] }}
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
              render: (_, record) => (
                <Space>{typeLabelMap[record.dataType as keyof typeof typeLabelMap]}</Space>
              ),
            },
            {
              title: 'Default Value',
              dataIndex: 'default',
              key: 'default',
              render: (_, record) => (
                <Space size="small">
                  {record.defaultValue === 'true'
                    ? 'On'
                    : record.defaultValue === 'false'
                      ? 'Off'
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
                  <EditOutlined
                    onClick={() => {
                      setShowVariableModal(true);
                      setEditVariable(record);
                    }}
                  />
                  <DeleteOutlined
                    onClick={() => {
                      removeVariable(record.name);
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
            setShowVariableModal(true);
          }}
          type="text"
          size="small"
          style={{ fontSize: '0.75rem' }}
          icon={<PlusOutlined />}
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
