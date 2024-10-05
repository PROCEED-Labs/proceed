import {
  Col,
  Row,
  Typography,
  Card,
  Space,
  Select,
  theme,
  Tag,
  SelectProps,
  Modal,
  Tooltip,
  Button,
} from 'antd';
import { EditOutlined, CheckOutlined, DeleteOutlined } from '@ant-design/icons';

const { Paragraph, Text } = Typography;

import { Parameter, ParentConfig } from '@/lib/data/machine-config-schema';
import Param from './parameter';
import AddButton from './add-button';
import { defaultParameter, findParameter, getAllParameters } from '../configuration-helper';
import { useEffect, useMemo, useRef, useState } from 'react';
import CreateParameterModal, { CreateParameterModalReturnType } from './create-parameter-modal';

import {
  addParameter as backendAddParameter,
  removeParameter,
  updateParameter,
} from '@/lib/data/legacy/machine-config';
import { useRouter } from 'next/navigation';

type TagRender = SelectProps['tagRender'];

const linkedParametersTagRender: TagRender = ({ label, closable, onClose }) => {
  const onPreventMouseDown = (event: React.MouseEvent<HTMLSpanElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };
  return (
    <Tag
      color="purple"
      onMouseDown={onPreventMouseDown}
      closable={closable}
      onClose={onClose}
      style={{ marginInlineEnd: 4 }}
    >
      {label}
    </Tag>
  );
};

type CustomFieldProps = {
  keyId: string;
  parameter: Parameter;
  editable: boolean;
  parentConfig: ParentConfig;
};

const CustomField: React.FC<CustomFieldProps> = ({ keyId, parameter, editable, parentConfig }) => {
  const router = useRouter();
  const { token } = theme.useToken();

  const [createFieldOpen, setCreateFieldOpen] = useState<boolean>(false);
  const [deleteFieldOpen, setDeleteFieldOpen] = useState<boolean>(false);

  // TODO: check if this actually works when given the newest data after refresh
  const currentKeyRef = useRef(keyId);
  useEffect(() => {
    if (keyId !== currentKeyRef.current) currentKeyRef.current = keyId;
  }, [keyId]);
  const restoreKey = () => {
    currentKeyRef.current = keyId;
  };
  const saveKey = async () => {
    if (!currentKeyRef.current) return;
    await updateParameter(parameter.id!, { key: currentKeyRef.current });
    router.refresh();
  };

  const handleDeleteConfirm = async () => {
    if (parameter.id) await removeParameter(parameter.id);

    setCreateFieldOpen(false);
    router.refresh();
  };

  const addParameter = async (values: CreateParameterModalReturnType[]) => {
    const valuesFromModal = values[0];
    const newParameter = defaultParameter(
      valuesFromModal.displayName,
      valuesFromModal.value,
      valuesFromModal.language,
      valuesFromModal.unit,
    );

    await backendAddParameter(
      parameter.id!,
      'parameter',
      'parameters',
      valuesFromModal.key || '',
      newParameter,
    );

    setCreateFieldOpen(false);
    router.refresh();
  };

  const cardStyle = {
    background: token.colorFillAlter,
    borderRadius: token.borderRadiusLG,
    border: 'solid 1px #d9d9d9',
    margin: '10px 0 0 0',
  };

  const [parametersList, paramIdToName] = useMemo(() => {
    let paramIdToName: { [key: string]: string } = {};
    const parametersList: { label: string; value: string }[] = getAllParameters(
      parentConfig,
      'config',
      '',
    ).map((item: { key: string; value: Parameter }) => {
      paramIdToName[item.value.id ?? ''] = item.key;
      return { label: item.key, value: item.value.id ?? '' };
    });
    return [parametersList, paramIdToName];
  }, [parentConfig]);

  const updateBacklinks = async (
    idListFilter: (string | undefined)[],
    field: Parameter,
    operation: 'remove' | 'add',
  ) => {
    if (!field.id) return;
    for (let id of idListFilter) {
      if (id) {
        // TODO: simplify the return value of findParameter to be the parameter or undefined
        let ref = findParameter(id, parentConfig, 'config');
        if (ref) {
          if (operation === 'remove') {
            await updateParameter(ref.selection.id!, {
              linkedParameters: ref.selection.linkedParameters.filter((item) => {
                return item !== field.id;
              }),
            });
          } else {
            if (!ref.selection.linkedParameters.includes(field.id))
              await updateParameter(ref.selection.id!, {
                linkedParameters: [...ref.selection.linkedParameters, field.id],
              });
          }
        }
      }
    }
  };

  const linkedParametersChange = async (paramIdList: string[], field: Parameter) => {
    // make sure to set backlinks
    await updateBacklinks(paramIdList, field, 'add');

    // make sure to remove backlinks from unlinked parameters
    const removedIds = field.linkedParameters.filter((id) => !paramIdList.includes(id));
    await updateBacklinks(removedIds, field, 'remove');

    // save the updated linked parameters
    await updateParameter(parameter.id!, { linkedParameters: paramIdList });

    router.refresh();
  };

  return (
    <Row gutter={[24, 24]} /* align="middle" */ style={{ margin: '10px 0 0 0', width: '100%' }}>
      <Col span={3} className="gutter-row">
        <div style={{ display: 'flex', alignItems: 'baseline' }}>
          <Paragraph
            editable={
              editable && {
                icon: <EditOutlined style={{ color: 'rgba(0, 0, 0, 0.88)', margin: '0 10px' }} />,
                tooltip: 'Edit Parameter Key',
                onCancel: restoreKey,
                onChange: (newValue) => (currentKeyRef.current = newValue),
                onEnd: saveKey,
                enterIcon: <CheckOutlined />,
              }
            }
          >
            {currentKeyRef.current}
          </Paragraph>
          {editable && (
            <Space.Compact size="small">
              <Tooltip title="Delete">
                <Button
                  /* disabled={!editable} */
                  icon={<DeleteOutlined />}
                  type="text"
                  onClick={() => setDeleteFieldOpen(true)}
                />
              </Tooltip>
            </Space.Compact>
          )}
        </div>
      </Col>

      <Col span={21} className="gutter-row">
        <Param
          editingEnabled={editable}
          field={parameter}
          label={keyId[0].toUpperCase() + keyId.slice(1)}
        />

        {(editable || (parameter.linkedParameters && parameter.linkedParameters.length > 0)) && (
          <Card style={cardStyle} size="small">
            <Row gutter={[24, 24]} align="middle">
              <Col span={4} className="gutter-row">
                Linked Parameters
              </Col>

              <Col span={20} className="gutter-row">
                {editable && (
                  <Space>
                    <Select
                      mode="multiple"
                      allowClear
                      tagRender={linkedParametersTagRender}
                      style={{ minWidth: 250 }}
                      placeholder="Select to Add"
                      value={parameter.linkedParameters}
                      onChange={(idList: string[]) => linkedParametersChange(idList, parameter)}
                      options={parametersList}
                    />
                  </Space>
                )}

                {!editable &&
                  parameter.linkedParameters.map((paramId: string) => (
                    <Space key={paramId}>
                      <Tag color="purple">{paramIdToName[paramId]}</Tag>
                    </Space>
                  ))}
              </Col>

              {/* <Col span={1} className="gutter-row">
                    <Tooltip title="Delete">
                      <Button
                        size="small"
                        disabled={!editable}
                        icon={<DeleteOutlined />}
                        type="text"
                      />
                    </Tooltip>
                  </Col> */}
            </Row>
          </Card>
        )}

        {(editable || (parameter.parameters && Object.keys(parameter.parameters).length > 0)) && (
          <Card style={cardStyle} size="small">
            <Row gutter={[24, 24]} align="middle">
              <Col span={4} className="gutter-row">
                Nested Parameters
              </Col>
              <Col span={20} className="gutter-row">
                {parameter.parameters &&
                  Object.entries(parameter.parameters).map(([subFieldKey, subField]) => (
                    <CustomField
                      parentConfig={parentConfig}
                      key={subFieldKey}
                      keyId={subFieldKey}
                      parameter={subField}
                      editable={editable}
                    />
                  ))}
                {editable && (
                  <Space>
                    <AddButton label="Add Parameter" onClick={() => setCreateFieldOpen(true)} />
                  </Space>
                )}
              </Col>
              {/* <Col span={1} className="gutter-row">
                    <Tooltip title="Delete">
                      <Button
                        size="small"
                        disabled={!editable}
                        icon={<DeleteOutlined />}
                        type="text"
                      />
                    </Tooltip>
                  </Col> */}
            </Row>
          </Card>
        )}
      </Col>

      <CreateParameterModal
        title="Create Parameter"
        open={createFieldOpen}
        onCancel={() => setCreateFieldOpen(false)}
        onSubmit={addParameter}
        okText="Create"
        showKey
      />
      <Modal
        open={deleteFieldOpen}
        title={'Deleting '}
        onOk={handleDeleteConfirm}
        onCancel={() => setDeleteFieldOpen(false)}
      >
        <Paragraph>
          Are you sure you want to delete the parameter <Text strong>{keyId}</Text> with ID{' '}
          <Text italic>{parameter.id}</Text>
        </Paragraph>
      </Modal>
    </Row>
  );
};

export default CustomField;
