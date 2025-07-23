import React, { useEffect, useMemo, useState } from 'react';
import { RelevantInstanceInfo } from './instance-info-panel';

import { EditOutlined } from '@ant-design/icons';

import type { Variable as ProcessVariable } from '@proceed/bpmn-helper/src/getters';
import { getProcessIds, getVariablesFromElementById } from '@proceed/bpmn-helper';
import { App, Button, Form, Input, InputNumber, Modal, Switch, Table } from 'antd';
import { typeLabelMap } from '../../../processes/[processId]/variable-definition/process-variable-form';
import { updateVariables } from '@/lib/engines/server-actions';
import { useEnvironment } from '@/components/auth-can';
import TextArea from 'antd/es/input/TextArea';
import { wrapServerCall } from '@/lib/wrap-server-call';

type InstanceVariableProps = {
  info: RelevantInstanceInfo;
  refetch: () => void;
};

type Variable = {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'unknown';
  allowed?: string;
  value: any;
};

const InstanceVariables: React.FC<InstanceVariableProps> = ({ info, refetch }) => {
  const [variableDefinitions, setVariableDefinitions] = useState<ProcessVariable[]>([]);
  const [updatedValue, setUpdatedValue] = useState<any>(undefined);
  const [submitting, setSubmitting] = useState(false);

  const { message } = App.useApp();

  const { spaceId } = useEnvironment();

  const [form] = Form.useForm();

  useEffect(() => {
    const initVariables = async () => {
      const [processId] = await getProcessIds(info.version.bpmn);
      const variables = await getVariablesFromElementById(info.version.bpmn, processId);
      setVariableDefinitions(
        variables.map((v) => ({
          ...v,
        })),
      );
    };
    initVariables();
  }, [info.version]);

  const variables = useMemo(() => {
    const { instance } = info;

    const variables: Record<string, Variable> = {};

    if (instance) {
      const instanceVariables = instance.variables as Record<string, { value: any }>;

      Object.entries(instanceVariables).forEach(([name, { value }]) => {
        let type: Variable['type'] = 'unknown';
        const valueType = typeof value;
        switch (valueType) {
          case 'number':
          case 'boolean':
          case 'string':
            type = valueType;
            break;
          case 'object': {
            if (Array.isArray(value)) {
              type = 'array';
              break;
            } else if (value) {
              type = 'object';
              break;
            }
          }
        }

        variables[name] = { name, type, value };
      });
    }

    variableDefinitions.forEach((def) => {
      if (!variables[def.name]) {
        variables[def.name] = {
          name: def.name,
          type: def.dataType as Variable['type'],
          value: undefined,
        };
      }
      if (variables[def.name].type === 'unknown') {
        variables[def.name].type = def.dataType as Variable['type'];
      }
      variables[def.name].allowed = def.enum;
    });

    return Object.values(variables);
  }, [variableDefinitions, info.instance]);

  const [variableToEdit, setVariableToEdit] = useState<(typeof variables)[number] | undefined>(
    undefined,
  );

  const columns: React.ComponentProps<typeof Table>['columns'] = [
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
      render: (type: Variable['type']) => (type === 'unknown' ? '' : typeLabelMap[type]),
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
        pagination={{ position: ['bottomCenter'] }}
        rowKey="name"
        scroll={{ x: true }}
        columns={columns}
        dataSource={variables}
      />
      <Modal
        open={!!variableToEdit}
        title={`Change value of ${variableToEdit?.name}`}
        onClose={handleClose}
        onCancel={handleClose}
        destroyOnClose
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
                      case 'array':
                        {
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
                        break;
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
