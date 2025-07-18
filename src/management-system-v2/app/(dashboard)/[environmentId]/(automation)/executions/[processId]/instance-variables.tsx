import React, { useEffect, useMemo, useState } from 'react';
import { RelevantInstanceInfo } from './instance-info-panel';

import { EditOutlined } from '@ant-design/icons';

import type { Variable as ProcessVariable } from '@proceed/bpmn-helper/src/getters';
import { getProcessIds, getVariablesFromElementById } from '@proceed/bpmn-helper';
import { Button, Input, InputNumber, Modal, Switch, Table } from 'antd';
import { typeLabelMap } from '../../../processes/[processId]/variable-definition/process-variable-form';
import { updateVariables } from '@/lib/engines/server-actions';
import { useEnvironment } from '@/components/auth-can';

type InstanceVariableProps = {
  info: RelevantInstanceInfo;
};

const InstanceVariables: React.FC<InstanceVariableProps> = ({ info }) => {
  const [variableDefinitions, setVariableDefinitions] = useState<ProcessVariable[]>([]);
  const [variableToEdit, setVariableToEdit] = useState('');
  const [updatedValue, setUpdatedValue] = useState<any>(undefined);

  const { spaceId } = useEnvironment();

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
      if (typeof value !== 'string') {
        value = value !== undefined ? JSON.stringify(value) : undefined;
      }
      return {
        name: v.name,
        type: v.dataType,
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
                case 'string':
                case 'array':
                case 'object':
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

  switch (typeof updatedValue) {
    case 'string':
      updatedValueInput = (
        <Input value={updatedValue} onChange={(e) => setUpdatedValue(e.target.value)} />
      );
      break;
    case 'number':
      updatedValueInput = (
        <InputNumber
          style={{ width: '100%' }}
          value={updatedValue}
          onChange={(val) => setUpdatedValue(val)}
        />
      );
      break;
    case 'boolean':
      updatedValueInput = <Switch value={updatedValue} onChange={(val) => setUpdatedValue(val)} />;
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
        onOk={() => {
          // TODO: check if the value is allowed
          updateVariables(spaceId, info.process.definitionId, info.instance!.processInstanceId, {
            [variableToEdit]: updatedValue,
          });
          setVariableToEdit('');
        }}
      >
        {updatedValueInput}
      </Modal>
    </>
  );
};

export default InstanceVariables;
