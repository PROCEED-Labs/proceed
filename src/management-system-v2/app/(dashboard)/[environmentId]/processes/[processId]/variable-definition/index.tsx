import React, { useEffect, useState } from 'react';
import { Button, Space, Table, Modal, Form, Input, Select, InputNumber, Checkbox } from 'antd';

import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  CheckOutlined,
  CloseOutlined,
} from '@ant-design/icons';

import { is as bpmnIs } from 'bpmn-js/lib/util/ModelUtil';
import {
  deepCopyElementById,
  getVariablesFromElement,
  setProceedElement,
} from '@proceed/bpmn-helper';

import useModelerStateStore from '../use-modeler-state-store';
import { ElementLike } from 'diagram-js/lib/model/Types';

type VariableDefinitionProps = {};

type ProcessVariable = ReturnType<typeof getVariablesFromElement>[number];

type DefaultValueInputProps = {
  variable?: Partial<ProcessVariable>;
  onChange: (newValue: any) => void;
};

// maps from the data types to what we want to display to the user
const typeLabelMap = {
  string: 'Text',
  number: 'Number',
  integer: 'Integer',
  boolean: 'On/Off',
  object: 'Complex Structure',
  array: 'List',
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

const VariableDefinition: React.FC<VariableDefinitionProps> = () => {
  // the current state of the variable in the creation/editing form
  const [editVariable, setEditVariable] = useState<Partial<ProcessVariable> | undefined>(undefined);
  // the original variable that is currently being edited
  // (when a user clicked the edit button of an existing variable)
  const [originalEditVariable, setOriginalEditVariable] = useState<ProcessVariable | undefined>(
    undefined,
  );
  // the variables currently in the process
  const [variables, setVariables] = useState<ProcessVariable[]>([]);
  // the process element that contains the variables
  const [processElement, setProcessElement] = useState<ElementLike | undefined>(undefined);

  const [form] = Form.useForm();

  const modeler = useModelerStateStore((state) => state.modeler);

  useEffect(() => {
    if (modeler) {
      const elements = modeler.getAllElements();
      const processEl = elements.find((el) => bpmnIs(el, 'bpmn:Process'));

      if (processEl) {
        setProcessElement(processEl);
        setVariables(getVariablesFromElement(processEl.businessObject));
      }
    }
    return () => {
      setProcessElement(undefined);
      setVariables([]);
    };
  }, [modeler]);

  const handleClose = () => {
    setEditVariable(undefined);
    setOriginalEditVariable(undefined);
  };

  const addOrEditVariable = async () => {
    if (!editVariable || !processElement) return;
    try {
      await form.validateFields();

      // update the data in the component
      let newVariables = variables
        .filter((v) => v.name !== originalEditVariable?.name)
        .concat([editVariable as ProcessVariable]);
      setVariables(newVariables);

      // update the data in the bpmn
      const modeling = modeler!.getModeling();
      const bpmn = await modeler!.getXML();
      const selectedElementCopy = (await deepCopyElementById(bpmn!, processElement.id)) as any;
      if (originalEditVariable && originalEditVariable.name !== editVariable.name) {
        // remove the old variable entry if the name of an existing variable has been changed
        // setProceedElement can only identify changes when the name is the same
        setProceedElement(selectedElementCopy, 'Variable', null, {
          name: originalEditVariable.name,
        });
      }
      setProceedElement(selectedElementCopy, 'Variable', undefined, editVariable);
      modeling.updateProperties(processElement as any, {
        extensionElements: selectedElementCopy.extensionElements,
      });

      handleClose();
    } catch (err) { }
  };
  const removeVariable = async (variableName: string) => {
    // remove from this components data
    setVariables(variables.filter((v) => v.name !== variableName));

    if (processElement) {
      // remove from the bpmn
      const modeling = modeler!.getModeling();
      const bpmn = await modeler!.getXML();
      const selectedElementCopy = (await deepCopyElementById(bpmn!, processElement.id)) as any;
      setProceedElement(selectedElementCopy, 'Variable', null, {
        name: variableName,
      });
      modeling.updateProperties(processElement as any, {
        extensionElements: selectedElementCopy.extensionElements,
      });
    }
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
                      setEditVariable(record);
                      setOriginalEditVariable(record);
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
            setEditVariable({ dataType: 'string' });
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
          originalEditVariable ? `Edit Variable ${originalEditVariable.name}` : 'Add a new Variable'
        }
        open={!!editVariable}
        onClose={() => handleClose()}
        onCancel={() => handleClose()}
        okText={originalEditVariable ? 'Update' : 'Add'}
        onOk={() => addOrEditVariable()}
        destroyOnClose
      >
        {editVariable && (
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
                    if (sameNameVariable && sameNameVariable !== originalEditVariable) {
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
              <Input
                value={editVariable.name}
                onChange={(e) => setEditVariable({ ...editVariable, name: e.target.value })}
              />
            </Form.Item>
            <Form.Item
              name="description"
              label="Description"
              initialValue={editVariable.description}
            >
              <Input
                value={editVariable.description}
                onChange={(e) => setEditVariable({ ...editVariable, description: e.target.value })}
              />
            </Form.Item>
            <Form.Item
              name="requiredAtInstanceStartup"
              initialValue={editVariable.requiredAtInstanceStartup}
              label="Required at Startup"
            >
              <Checkbox
                checked={editVariable.requiredAtInstanceStartup}
                onChange={(e) =>
                  setEditVariable({ ...editVariable, requiredAtInstanceStartup: e.target.checked })
                }
              />
            </Form.Item>
            <Form.Item name="const" initialValue={editVariable.const} label="Unchangeable Value">
              <Checkbox
                checked={editVariable.const}
                onChange={(e) => setEditVariable({ ...editVariable, const: e.target.checked })}
              />
            </Form.Item>
            <Form.Item
              name="type"
              initialValue={typeLabelMap[editVariable.dataType as keyof typeof typeLabelMap]}
              label="Type"
            >
              <Select
                value={editVariable.dataType}
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
                    console.log(value, editVariable.dataType);
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
                    if (
                      value &&
                      editVariable.enum &&
                      !editVariable.enum.split(';').includes(value)
                    ) {
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
                  console.log(newValue);
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
                              new Error(
                                'All values defined here have to be integers (whole numbers).',
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
                <Input
                  value={editVariable.enum}
                  onChange={(e) => setEditVariable({ ...editVariable, enum: e.target.value })}
                />
              </Form.Item>
            )}
          </Form>
        )}
      </Modal>
    </Space>
  );
};

export default VariableDefinition;
