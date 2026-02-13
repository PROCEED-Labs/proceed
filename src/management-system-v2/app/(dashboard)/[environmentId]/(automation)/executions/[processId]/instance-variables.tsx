import React, { useState } from 'react';
import { RelevantInstanceInfo } from './instance-info-panel';

import { EditOutlined } from '@ant-design/icons';

import { App, Button, Form, Input, InputNumber, Modal, Switch, Table } from 'antd';
import { updateVariables } from '@/lib/engines/server-actions';
import { useEnvironment } from '@/components/auth-can';
import TextArea from 'antd/es/input/TextArea';
import { wrapServerCall } from '@/lib/wrap-server-call';
import useInstanceVariables, { Variable } from './use-instance-variables';
import { textFormatMap, typeLabelMap } from '@/lib/process-variable-schema';

type InstanceVariableProps = {
  info: RelevantInstanceInfo;
  refetch: () => void;
};

const InstanceVariables: React.FC<InstanceVariableProps> = ({ info, refetch }) => {
  const [updatedValue, setUpdatedValue] = useState<any>(undefined);
  const [submitting, setSubmitting] = useState(false);

  const { message } = App.useApp();

  const { spaceId } = useEnvironment();

  const [form] = Form.useForm();

  const { variables } = useInstanceVariables(info);

  const [variableToEdit, setVariableToEdit] = useState<Variable | undefined>(undefined);

  const columns: React.ComponentProps<typeof Table<Variable>>['columns'] = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    {
      title: 'Value',
      dataIndex: 'value',
      key: 'value',
      render: (value: Variable['value']) => {
        if (typeof value === 'boolean') {
          return value ? 'True' : 'False';
        }
        if (value && typeof value === 'object') return JSON.stringify(value);
        return value;
      },
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type: Variable['type'], variable: Variable) => {
        let label = type === 'unknown' ? '' : typeLabelMap[type];
        if (variable.format) label += ` (${textFormatMap[variable.format]})`;
        return label;
      },
    },
  ];

  if (info.instance) {
    columns.push({
      title: '',
      key: 'edit',
      render: (variable) => {
        return (
          <Button
            icon={<EditOutlined />}
            type="text"
            onClick={() => {
              setVariableToEdit(variable);
              switch (variable.type) {
                case 'object':
                case 'array':
                  setUpdatedValue(variable.value ? JSON.stringify(variable.value, null, 2) : '');
                  break;
                case 'string':
                  setUpdatedValue(variable.value || '');
                  break;
                case 'number':
                  setUpdatedValue(variable.value ? parseFloat(variable.value) : 0);
                  break;
                case 'boolean':
                  setUpdatedValue(variable.value || false);
              }
            }}
          />
        );
      },
    });
  }

  let updatedValueInput = <></>;

  switch (variableToEdit?.type) {
    case 'object':
    case 'array':
      updatedValueInput = <TextArea rows={10} onChange={(e) => setUpdatedValue(e.target.value)} />;
      break;
    case 'string':
      updatedValueInput = <Input onChange={(e) => setUpdatedValue(e.target.value)} />;
      break;
    case 'number':
      updatedValueInput = (
        <InputNumber style={{ width: '100%' }} onChange={(val) => setUpdatedValue(val || 0)} />
      );
      break;
    case 'boolean':
      updatedValueInput = <Switch onChange={(val) => setUpdatedValue(val)} />;
      break;
  }

  const handleClose = () => {
    setVariableToEdit(undefined);
  };

  return (
    <>
      <Table
        pagination={{ placement: ['bottomCenter'] }}
        rowKey="name"
        scroll={{ x: true }}
        columns={columns}
        dataSource={variables}
      />
      <Modal
        open={!!variableToEdit}
        title={`Change value of ${variableToEdit?.name}`}
        onCancel={handleClose}
        destroyOnHidden
        okButtonProps={{ loading: submitting }}
        onOk={async () => {
          await form.validateFields();

          let value = updatedValue;

          // we handle objects as string during the users change so we need to transform them back
          // here
          switch (variableToEdit?.type) {
            case 'object':
            case 'array':
              value = value ? JSON.parse(value) : null;
              break;
          }

          wrapServerCall({
            fn: async () => {
              setSubmitting(true);
              await updateVariables(
                spaceId,
                info.process.definitionId,
                info.instance!.processInstanceId,
                {
                  [variableToEdit!.name]: value,
                },
              );
            },
            onSuccess: () => {
              message.success('Applied Changes');
              refetch();
              setSubmitting(false);
              handleClose();
            },
            onError: () => {
              message.error('Could not apply changes');
              setSubmitting(false);
            },
          });
        }}
      >
        <Form form={form} clearOnDestroy>
          <Form.Item
            name="value"
            initialValue={updatedValue}
            rules={[
              {
                validator(_, value: any) {
                  if (value) {
                    switch (variableToEdit?.type) {
                      // for numbers and strings we have to check if the value is part of the
                      // optionally defined allowed values
                      case 'number':
                        value = JSON.stringify(value);
                      case 'string':
                        {
                          value = (value as string).trim();
                          if (variableToEdit.allowed) {
                            const allowedValues = variableToEdit.allowed.split(';');

                            if (!allowedValues.includes(value)) {
                              return Promise.reject(
                                new Error(
                                  `Invalid value. Expected one of: ${allowedValues.join(', ')}`,
                                ),
                              );
                            }
                          }
                        }
                        break;
                      // check if the entered text can be transformed to the respective object type
                      case 'object':
                      case 'array': {
                        try {
                          const parsed = JSON.parse(value);
                          if (
                            (variableToEdit.type === 'array' && Array.isArray(parsed)) ||
                            (variableToEdit.type === 'object' && !Array.isArray(parsed))
                          ) {
                            return Promise.resolve();
                          }
                        } catch (err) {}

                        return Promise.reject(
                          new Error(
                            `Input is not a valid JSON ${variableToEdit.type === 'object' ? 'Object' : 'List'}.`,
                          ),
                        );
                      }
                    }
                  }

                  return Promise.resolve();
                },
              },
            ]}
          >
            {updatedValueInput}
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default InstanceVariables;
