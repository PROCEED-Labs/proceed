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
import styles from './page.module.scss';
import {
  addParameter as backendAddParameter,
  removeParameter,
  updateParameter,
} from '@/lib/data/db/machine-config';
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

  const handleKeyChange = async (newKey: string) => {
    if (!newKey) return;
    await updateParameter(parameter.id!, { key: newKey });
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
      valuesFromModal.key ?? '',
      valuesFromModal.value,
      valuesFromModal.displayName,
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
    // background: token.colorFillAlter,
    background: 'rgba(0,0,0,0)',
    borderRadius: token.borderRadiusLG,
    border: 'solid #d9d9d9',
    margin: '10px 0 0 0',
    borderWidth: '0 0 0 3px',
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

  /**pattern:
   *  row: meta/param-key
   *  row: entries
   *  row: linked params
   *  row: nested params*/
  return (
    <>
      <Row gutter={[24, 24]} /* align="middle" */ style={{ margin: '0rem 0 0 0', width: '100%' }}>
        <Col span={24} className="gutter-row">
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
            }}
          >
            <Text
              strong
              editable={
                editable && {
                  icon: <EditOutlined style={{ color: 'rgba(0, 0, 0, 0.88)', margin: '0 10px' }} />,
                  tooltip: 'Edit Parameter Key',
                  onChange: handleKeyChange,
                  enterIcon: <CheckOutlined />,
                }
              }
            >
              {keyId}
            </Text>
            {editable && (
              <Space.Compact size="small">
                <Tooltip title="Delete">
                  <Button
                    icon={<DeleteOutlined />}
                    type="text"
                    onClick={() => setDeleteFieldOpen(true)}
                  />
                </Tooltip>
              </Space.Compact>
            )}
          </div>
        </Col>
      </Row>

      <Row gutter={[24, 24]} /* align="middle" */ style={{ width: '100%' }}>
        <Col span={24} offset={0} className="gutter-row" style={{ paddingRight: '0' }}>
          <Param editingEnabled={editable} field={parameter} label={keyId} />

          {(editable || (parameter.linkedParameters && parameter.linkedParameters.length > 0)) && (
            <Space direction="vertical" style={{ margin: '10px 0 0 0', display: 'flex' }}>
              <Row gutter={[24, 24]} align="middle">
                <Col span={24} className="gutter-row">
                  <Text italic>Linked Parameters</Text>
                </Col>
              </Row>

              <Row gutter={[24, 24]} align="middle">
                <Col span={24} offset={0} className="gutter-row">
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
            </Space>
          )}

          {(editable || (parameter.parameters && Object.keys(parameter.parameters).length > 0)) && (
            <Space direction="vertical" style={{ display: 'flex' }}>
              <Row gutter={[24, 24]} align="middle">
                <Col span={24} className="gutter-row">
                  <Text italic>Nested Parameters</Text>
                </Col>
              </Row>
              <Card size="small" className={styles.NestingCard} style={cardStyle}>
                <Row gutter={[24, 24]} align="middle" style={{ paddingRight: '0' }}>
                  <Col span={24} offset={0} className="gutter-row" style={{ paddingRight: '0' }}>
                    <Space direction="vertical" style={{ display: 'flex' }}>
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
                    </Space>

                    {editable && (
                      <Row gutter={[24, 24]} align="middle" style={{ margin: '10px 0' }}>
                        <Col span={21} className="gutter-row">
                          <AddButton
                            label="Add Parameter"
                            onClick={() => setCreateFieldOpen(true)}
                          />
                        </Col>
                      </Row>
                    )}
                  </Col>
                </Row>
              </Card>
            </Space>
          )}
        </Col>
      </Row>

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
    </>
  );
};

export default CustomField;
