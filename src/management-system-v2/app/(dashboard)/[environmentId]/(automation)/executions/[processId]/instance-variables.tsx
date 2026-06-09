import React, { useState } from 'react';

import { EditOutlined } from '@ant-design/icons';

import {
  App,
  Button,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Space,
  Switch,
  Table,
  Typography,
} from 'antd';
import { updateVariables } from '@/lib/executions/instance-server-actions';
import { useEnvironment } from '@/components/auth-can';
import TextArea from 'antd/es/input/TextArea';
import { wrapServerCall } from '@/lib/wrap-server-call';
import useInstanceVariables, { Variable } from './use-instance-variables';
import { textFormatMap, typeLabelMap } from '@/lib/process-variable-schema';
import { ExtendedInstanceInfo } from '@/lib/data/instance';
import { EntryText } from './entry-text';

type InstanceVariableProps = {
  processId: string;
  version: { bpmn: string };
  instance: ExtendedInstanceInfo | undefined;
  refetch: () => void;
};

type FieldTitleProps = React.ComponentProps<typeof Typography.Text>;
const FormFieldTitle = (props: FieldTitleProps) => (
  <EntryText style={{ fontWeight: 600, color: '#777' }} {...props} />
);

const InstanceVariables: React.FC<InstanceVariableProps> = ({
  processId,
  version,
  instance,
  refetch,
}) => {
  const [updatedValue, setUpdatedValue] = useState<any>(undefined);
  const [submitting, setSubmitting] = useState(false);

  const { message } = App.useApp();

  const { spaceId } = useEnvironment();

  const [form] = Form.useForm();

  const { variables } = useInstanceVariables({ version, instance });

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

  if (instance) {
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
        okText={'Save value'}
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
              return await updateVariables(spaceId, processId, instance!.processInstanceId, {
                [variableToEdit!.name]: value,
              });
            },
            onSuccess: () => {
              message.success('Applied Changes');
              refetch();
              setSubmitting(false);
              handleClose();
            },
            onError: (err) => {
              if ('type' in err) {
                message.error(err.message);
              } else {
                message.error('Could not apply changes');
              }
              setSubmitting(false);
            },
          });
        }}
      >
        <div
          style={{
            border: 'solid 1px rgb(118, 193, 255)',
            borderRadius: 12,
            padding: 15,
            backgroundColor: 'rgba(118, 193, 255, 0.15)',
          }}
        >
          <EntryText
            style={{
              display: 'block',
              margin: '0 0 5px 0',
              fontWeight: 600,
              color: '#777',
              fontSize: '.95em',
            }}
          >
            Current Value
          </EntryText>
          <Form form={form} clearOnDestroy>
            <Form.Item
              name="value"
              initialValue={updatedValue}
              style={{ margin: 0 }}
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
        </div>
        <div>
          <Row>
            <Col span={12}>
              <div style={{ marginBlock: 10 }}>
                <FormFieldTitle>Type</FormFieldTitle>
                <br />
                <EntryText missingTextOverride="— not set">Text</EntryText>
              </div>
            </Col>
            <Col span={12}>
              <div style={{ marginBlock: 10 }}>
                <FormFieldTitle>Format</FormFieldTitle>
                <br />
                <EntryText missingTextOverride="— not set">{}</EntryText>
              </div>
            </Col>
          </Row>
          <Row>
            <Col span={12}>
              <div style={{ marginBlock: 10 }}>
                <FormFieldTitle>Required at start</FormFieldTitle>
                <br />
                <EntryText missingTextOverride="— not set">Yes</EntryText>
              </div>
            </Col>
            <Col span={12}>
              <div style={{ marginBlock: 10 }}>
                <FormFieldTitle>Can be changed</FormFieldTitle>
                <br />
                <EntryText missingTextOverride="— not set">Yes</EntryText>
              </div>
            </Col>
          </Row>
          <Row>
            <Col span={12}>
              <div style={{ marginBlock: 10 }}>
                <FormFieldTitle>Default value</FormFieldTitle>
                <br />
                <EntryText missingTextOverride="— not set">{}</EntryText>
              </div>
            </Col>
            <Col span={12}>
              <div style={{ marginBlock: 10 }}>
                <FormFieldTitle>Allowed values</FormFieldTitle>
                <br />
                <EntryText missingTextOverride="— not set">{}</EntryText>
              </div>
            </Col>
          </Row>
          <Row>
            <Col span={24} style={{ margin: '10px 0 0 0' }}>
              <FormFieldTitle>desc</FormFieldTitle>
            </Col>
          </Row>
          <Row>
            <Col span={24}>
              <EntryText missingTextOverride="— not set">
                Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod
                tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero
                eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea
                takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet,
                consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et
                dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo
                dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem
                ipsum dolor sit amet.
              </EntryText>
            </Col>
          </Row>
        </div>
      </Modal>
    </>
  );
};

export default InstanceVariables;
