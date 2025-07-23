import React, { useEffect, useMemo, useState } from 'react';
import { RelevantInstanceInfo } from './instance-info-panel';

import { EditOutlined } from '@ant-design/icons';

import type { Variable as ProcessVariable } from '@proceed/bpmn-helper/src/getters';
import { getProcessIds, getVariablesFromElementById } from '@proceed/bpmn-helper';
import { Button, Form, Input, InputNumber, Modal, Switch, Table } from 'antd';
import { typeLabelMap } from '../../../processes/[processId]/variable-definition/process-variable-form';
import { updateVariables } from '@/lib/engines/server-actions';
import { useEnvironment } from '@/components/auth-can';
import TextArea from 'antd/es/input/TextArea';

type InstanceVariableProps = {
  info: RelevantInstanceInfo;
};

const InstanceVariables: React.FC<InstanceVariableProps> = ({ info }) => {
  const [variableDefinitions, setVariableDefinitions] = useState<ProcessVariable[]>([]);
  const [variableToEdit, setVariableToEdit] = useState('');
  const [updatedValue, setUpdatedValue] = useState<any>(undefined);

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
    // TODO: also show variables that are not defined in the BPMN but set by a script task
    return variableDefinitions.map((v) => {
      let value = instance && instance.variables[v.name]?.value;

      if (v.dataType === 'object' || v.dataType === 'array') {
        value = value || '';
      }

      if (typeof value !== 'string') {
        value = value !== undefined ? JSON.stringify(value, null, 2) : undefined;
      }
      return {
        name: v.name,
        type: v.dataType,
        allowed: v.enum,
        value,
      };
    });
  }, [variableDefinitions, info.instance]);

  const columns: React.ComponentProps<typeof Table>['columns'] = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Value', dataIndex: 'value', key: 'value' },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (variable) => typeLabelMap[variable],
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
              setVariableToEdit(variable.name);
              switch (variable.type) {
                case 'object':
                case 'array':
                case 'string':
                  setUpdatedValue(variable.value || '');
                  break;
                case 'number':
                  setUpdatedValue(variable.value ? parseFloat(variable.value) : 0);
                  break;
                case 'boolean':
                  setUpdatedValue(variable.value === 'true' ? true : false);
              }
            }}
          />
        );
      },
    });
  }

  let updatedValueInput = <></>;

  const editVariable = variables.find((v) => v.name === variableToEdit);
  switch (editVariable?.type) {
    case 'object':
    case 'array':
      updatedValueInput = <TextArea rows={6} onChange={(e) => setUpdatedValue(e.target.value)} />;
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

  return (
    <>
      <Table pagination={false} columns={columns} dataSource={variables} />
      <Modal
        open={!!variableToEdit}
        title={`Change value of ${variableToEdit}`}
        onClose={() => setVariableToEdit('')}
        onCancel={() => setVariableToEdit('')}
        destroyOnClose
        onOk={async () => {
          await form.validateFields();

          let value = updatedValue;

          switch (editVariable?.type) {
            case 'object':
            case 'array':
              value = value ? JSON.parse(value) : null;
              break;
          }

          updateVariables(spaceId, info.process.definitionId, info.instance!.processInstanceId, {
            [variableToEdit]: value,
          });
          setVariableToEdit('');
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
                    const editVariable = variables.find((v) => v.name === variableToEdit);
                    switch (editVariable?.type) {
                      case 'number':
                        value = JSON.stringify(value);
                      case 'string':
                        {
                          value = (value as string).trim();
                          if (editVariable.allowed) {
                            const allowedValues = editVariable.allowed.split(';');

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
                      case 'object':
                      case 'array':
                        {
                          try {
                            const parsed = JSON.parse(value);
                            if (
                              (editVariable.type === 'array' && Array.isArray(parsed)) ||
                              (editVariable.type === 'object' && !Array.isArray(parsed))
                            ) {
                              return Promise.resolve();
                            }
                          } catch (err) {}

                          return Promise.reject(
                            new Error(
                              `Input is not a valid JS ${editVariable.type === 'object' ? 'Object' : 'List'}.`,
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
