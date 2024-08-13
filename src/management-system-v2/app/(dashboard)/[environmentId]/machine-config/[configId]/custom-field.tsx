import { Col, Row, Typography, Card, Space, Select, theme, Tag, SelectProps } from 'antd';
import { EditOutlined, CheckOutlined } from '@ant-design/icons';

const { Paragraph } = Typography;

import {
  AbstractConfig,
  Parameter,
  ParentConfig,
  TargetConfig,
} from '@/lib/data/machine-config-schema';
import Param from './parameter';
import AddButton from './add-button';
import {
  defaultConfiguration,
  findParameter,
  getAllParameters,
  TreeFindParameterStruct,
  TreeFindStruct,
} from '../configuration-helper';
import { useMemo } from 'react';

type FieldType = 'main' | 'nested';

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
  field: Parameter;
  fieldType: FieldType;
  editable: boolean;
  customConfig?: AbstractConfig;
  selectedMachineConfig: TreeFindStruct;
  configId: string;
  parentConfig: ParentConfig;
  parentNestedSelection?: Parameter;
  onNestedSelectionChange: (field?: Parameter) => void;
  onContentDelete: (param: Parameter) => void;
  editingContent?: TargetConfig['parameters'];
  backendSaveParentConfig: Function;
  onEditingContentChange: (content: TargetConfig['parameters']) => void;
  onClickAddField: (parent: Parameter | undefined, type: FieldType) => void;
  refEditingConfig: TreeFindStruct;
};

const CustomField: React.FC<CustomFieldProps> = ({
  configId,
  keyId,
  field,
  selectedMachineConfig,
  fieldType,
  editable,
  customConfig,
  parentConfig,
  parentNestedSelection,
  onNestedSelectionChange,
  onContentDelete,
  editingContent,
  backendSaveParentConfig: saveParentConfig,
  onEditingContentChange,
  onClickAddField,
  refEditingConfig,
}) => {
  const { token } = theme.useToken();

  const editingConfig = selectedMachineConfig
    ? { ...selectedMachineConfig.selection }
    : customConfig
      ? { ...customConfig }
      : defaultConfiguration();

  let paramKey = '';
  const setParamKey = (e: string) => {
    paramKey = e;
  };

  const pushKey = (key: string, field: Parameter, fieldType: FieldType) => {
    if (fieldType === 'nested') {
      onNestedSelectionChange(field);
    }
  };

  const restoreKey = () => {
    onNestedSelectionChange(undefined);
    paramKey = '';
  };

  const saveKey = (key: string) => {
    if (paramKey !== '') {
      let copyContent = { ...editingContent };
      if (parentNestedSelection && parentNestedSelection.id) {
        let ref: TreeFindParameterStruct = undefined;
        for (let prop in copyContent) {
          if (copyContent[prop].id === parentNestedSelection.id) {
            ref = { selection: copyContent[prop], parent: copyContent[prop], type: 'parameter' };
          } else {
            ref = findParameter(parentNestedSelection.id, copyContent[prop], 'parameter');
          }
          if (ref) {
            break;
          }
        }
        if (!ref) return Promise.resolve();
        let copyParam = { ...(ref.parent as Parameter).parameters[key] };
        delete (ref.parent as Parameter).parameters[key];
        (ref.parent as Parameter).parameters[paramKey] = copyParam;
      } else {
        let copyParam = { ...copyContent[key] };
        delete copyContent[key];
        copyContent[paramKey] = copyParam;
      }
      onEditingContentChange(copyContent);
      paramKey = '';
    }
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

  const linkedParamsTwoWay = (
    idListFilter: (string | undefined)[],
    field: Parameter,
    operation: 'remove' | 'add',
  ) => {
    if (!field.id) return;
    for (let id of idListFilter) {
      if (id) {
        let ref = findParameter(id, parentConfig, 'config');
        if (ref) {
          if (operation === 'remove') {
            ref.selection.linkedParameters = ref.selection.linkedParameters.filter((item) => {
              return item !== field.id;
            });
          } else {
            if (ref.selection.linkedParameters.indexOf(field.id) === -1)
              ref.selection.linkedParameters.push(field.id);
          }
        }
      }
    }
  };

  const linkedParametersChange = (
    key: string,
    paramIdList: string[],
    field: Parameter,
    type: FieldType,
  ) => {
    if (refEditingConfig) {
      let copyContent = { ...editingContent };
      // Fix links in a two way method
      linkedParamsTwoWay(paramIdList, field, 'add');
      if (type === 'nested' && field.id) {
        let ref: TreeFindParameterStruct = undefined;
        for (let prop in copyContent) {
          if (copyContent[prop].id === field.id) {
            ref = { selection: copyContent[prop], parent: editingConfig, type: 'parameter' };
          } else {
            ref = findParameter(field.id, copyContent[prop], 'parameter');
          }
          if (ref) {
            break;
          }
        }
        if (!ref) return Promise.resolve();
        // Get removed Ids and make them two way again
        let removedIds: (string | undefined)[] = ref.selection.linkedParameters.map((item) => {
          if (paramIdList.indexOf(item) === -1) return item ?? '';
        });
        linkedParamsTwoWay(removedIds, field, 'remove');
        ref.selection.linkedParameters = paramIdList;
      } else {
        copyContent[key].linkedParameters = paramIdList;
      }
      onEditingContentChange(copyContent);
    }
  };

  return (
    <Row gutter={[24, 24]} /* align="middle" */ style={{ margin: '10px 0 0 0' }}>
      <Col span={3} className="gutter-row">
        <Paragraph
          onBlur={() => saveKey(keyId)}
          editable={
            editable && {
              icon: <EditOutlined style={{ color: 'rgba(0, 0, 0, 0.88)', margin: '0 10px' }} />,
              tooltip: 'Edit Parameter Key',
              onStart: () => pushKey(keyId, field, fieldType),
              onCancel: () => restoreKey,
              onChange: setParamKey,
              onEnd: () => saveKey(keyId),
              enterIcon: <CheckOutlined />,
            }
          }
        >
          {keyId[0].toUpperCase() + keyId.slice(1) /*TODO */}
        </Paragraph>
      </Col>
      <Col span={21} className="gutter-row">
        <Param
          backendSaveParentConfig={saveParentConfig}
          configId={configId}
          editingEnabled={editable}
          parentConfig={parentConfig}
          selectedConfig={refEditingConfig}
          field={field}
          onDelete={onContentDelete}
          label={keyId[0].toUpperCase() + keyId.slice(1)}
        />
        {(editable || (field.linkedParameters && field.linkedParameters.length > 0)) && (
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
                      value={field.linkedParameters}
                      onChange={(idList: string[]) =>
                        linkedParametersChange(keyId, idList, field, fieldType)
                      }
                      options={parametersList}
                    />
                  </Space>
                )}
                {!editable &&
                  field.linkedParameters.map((paramId: string) => (
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
        {(editable || (field.parameters && Object.keys(field.parameters).length > 0)) && (
          <Card style={cardStyle} size="small">
            <Row gutter={[24, 24]} align="middle">
              <Col span={4} className="gutter-row">
                Nested Parameters
              </Col>
              <Col span={20} className="gutter-row">
                {field.parameters &&
                  Object.entries(field.parameters).map(([subFieldKey, subField]) => (
                    <CustomField
                      configId={configId}
                      parentConfig={parentConfig}
                      key={subFieldKey}
                      keyId={subFieldKey}
                      field={subField}
                      fieldType="nested"
                      editable={editable}
                      selectedMachineConfig={selectedMachineConfig}
                      backendSaveParentConfig={saveParentConfig}
                      onClickAddField={onClickAddField}
                      onContentDelete={onContentDelete}
                      refEditingConfig={refEditingConfig}
                      editingContent={editingContent}
                      onNestedSelectionChange={onNestedSelectionChange}
                      onEditingContentChange={onEditingContentChange}
                    />
                  ))}
                {editable && (
                  <Space>
                    <AddButton
                      label="Add Parameter"
                      items={undefined}
                      onClick={(_: any) => onClickAddField(field, 'nested')}
                    />
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
    </Row>
  );
};

export default CustomField;
