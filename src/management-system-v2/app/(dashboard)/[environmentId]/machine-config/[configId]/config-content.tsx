'use client';

import {
  AbstractConfig,
  Parameter,
  ParentConfig,
  TargetConfig,
} from '@/lib/data/machine-config-schema';
import { useRouter, useSearchParams } from 'next/navigation';

import {
  KeyOutlined,
  EyeInvisibleOutlined,
  CheckOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { useEffect, useRef, useState } from 'react';
import {
  Button,
  Input,
  Col,
  Row,
  Tooltip,
  theme,
  Tag,
  Space,
  Select,
  Card,
  SelectProps,
  message,
} from 'antd';
import useMobileModeler from '@/lib/useMobileModeler';
import { useEnvironment } from '@/components/auth-can';
import {
  TreeFindParameterStruct,
  TreeFindStruct,
  defaultConfiguration,
  defaultParameter,
  deleteLinks,
  deleteParameter,
  findConfig,
  findParameter,
  getAllParameters,
} from '../configuration-helper';
import getAddButton from './add-button';
import Param from './parameter';
import CreateParameterModal, { CreateParameterModalReturnType } from './create-parameter-modal';
import Paragraph from 'antd/es/typography/Paragraph';

type FieldType = 'main' | 'nested';

type MachineDataViewProps = {
  configId: string;
  selectedMachineConfig: TreeFindStruct;
  customConfig?: AbstractConfig;
  parentConfig: ParentConfig;
  backendSaveParentConfig: Function;
  editingEnabled: boolean;
  contentType: 'metadata' | 'parameters';
};

type TagRender = SelectProps['tagRender'];

export default function Content(props: MachineDataViewProps) {
  const router = useRouter();
  const environment = useEnvironment();
  const query = useSearchParams();
  const { token } = theme.useToken();

  const firstRenderEditing = useRef(true);
  const [createFieldOpen, setCreateFieldOpen] = useState<boolean>(false);
  const [updating, setUpdating] = useState<boolean>(false);
  const [idVisible, setIdVisible] = useState<boolean>(true);

  const [parentNestedSelection, setParentNestedSelection] = useState<Parameter>();

  const parentConfig = { ...props.parentConfig };
  const editingConfig = props.selectedMachineConfig
    ? { ...props.selectedMachineConfig.selection }
    : props.customConfig
      ? { ...props.customConfig }
      : defaultConfiguration();
  let refEditingConfig = findConfig(editingConfig.id, parentConfig);
  const saveParentConfig = props.backendSaveParentConfig;
  const configId = props.configId;
  const [editingContent, setEditingContent] = useState<TargetConfig['parameters']>(
    props.contentType === 'metadata'
      ? editingConfig.metadata
      : 'parameters' in editingConfig
        ? (editingConfig as TargetConfig).parameters
        : {},
  );

  let paramIdToName: { [key: string]: string } = {};
  const parametersList: { label: string; value: string }[] = getAllParameters(
    parentConfig,
    'config',
    '',
  ).map((item: { key: string; value: Parameter }) => {
    paramIdToName[item.value.id ?? ''] = item.key;
    return { label: item.key, value: item.value.id ?? '' };
  });

  const onContentDelete = (param: Parameter) => {
    if (param.content.length <= 0 && param.id) {
      deleteParameter(param.id, parentConfig);
      let copyContent = { ...editingContent };
      for (let prop in copyContent) {
        if (param.id === copyContent[prop].id) {
          delete copyContent[prop];
          break;
        }
      }
      // Fix links
      deleteLinks(param, parentConfig);
      setEditingContent(copyContent);
      setUpdating(true);
    }
  };

  const linkedParametersTagRender: TagRender = (props: any) => {
    const { label, value, closable, onClose } = props;
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

  const onClickAddField = (parent: Parameter | undefined, type: FieldType) => {
    if (type === 'nested') {
      // setEditingContent({ ...parent.parameters });
      setParentNestedSelection(parent);
    }
    setCreateFieldOpen(true);
  };

  const saveAll = () => {
    if (refEditingConfig) {
      if (props.contentType === 'metadata') {
        refEditingConfig.selection.metadata = editingContent;
      } else {
        (refEditingConfig.selection as TargetConfig).parameters = editingContent;
      }
    }
    saveParentConfig(configId, parentConfig).then(() => {});
    router.refresh();
  };

  useEffect(() => {
    if (firstRenderEditing.current) {
      firstRenderEditing.current = false;
      return;
    }
    if (updating) {
      saveAll();
      setUpdating(false);
      setParentNestedSelection(undefined);
    }
  }, [updating]);

  useEffect(() => {
    setEditingContent(
      props.contentType === 'metadata'
        ? editingConfig.metadata
        : 'parameters' in editingConfig
          ? (editingConfig as TargetConfig).parameters
          : {},
    );
  });

  const showMobileView = useMobileModeler();
  const editable = props.editingEnabled;

  let paramKey = '';
  const setParamKey = (e: string) => {
    paramKey = e;
  };

  const pushKey = (key: string, field: Parameter, fieldType: FieldType) => {
    if (fieldType === 'nested') {
      setParentNestedSelection(field);
    }
  };

  const restoreKey = () => {
    setParentNestedSelection(undefined);
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
      setEditingContent(copyContent);
      paramKey = '';
      setUpdating(true);
    }
  };

  const createField = (values: CreateParameterModalReturnType[]): Promise<void> => {
    if (refEditingConfig) {
      const valuesFromModal = values[0];
      const field = defaultParameter(
        valuesFromModal.displayName,
        valuesFromModal.value,
        valuesFromModal.language,
        valuesFromModal.unit,
      );
      let copyContent = { ...editingContent };
      if (parentNestedSelection && parentNestedSelection.id) {
        let ref: TreeFindParameterStruct = undefined;
        for (let prop in copyContent) {
          if (copyContent[prop].id === parentNestedSelection.id) {
            ref = { selection: copyContent[prop], parent: editingConfig, type: 'parameter' };
          } else {
            ref = findParameter(parentNestedSelection.id, copyContent[prop], 'parameter');
          }
          if (ref) {
            break;
          }
        }
        if (!ref) return Promise.resolve();
        ref.selection.parameters[valuesFromModal.key ?? valuesFromModal.displayName] = field;
      } else {
        copyContent[valuesFromModal.key ?? valuesFromModal.displayName] = field;
      }
      setEditingContent(copyContent);
      setUpdating(true);
    }
    setCreateFieldOpen(false);
    return Promise.resolve();
  };

  const getNestedParameters = (key: string, field: Parameter) => {
    return (
      <>
        {field.parameters &&
          Object.entries(field.parameters).map(([subFieldKey, subField]) => {
            return getCustomField(subFieldKey, subField, 'nested');
          })}
      </>
    );
  };

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
      setEditingContent(copyContent);
      setUpdating(true);
    }
  };

  const cardStyle = {
    background: token.colorFillAlter,
    borderRadius: token.borderRadiusLG,
    border: 'solid 1px #d9d9d9',
    margin: '10px 0 0 0',
  };

  const getCustomField = (key: string, field: Parameter, fieldType: FieldType) => {
    return (
      <>
        <Row gutter={[24, 24]} /* align="middle" */ style={{ margin: '10px 0 0 0' }}>
          <Col span={3} className="gutter-row">
            <Paragraph
              onBlur={() => saveKey(key)}
              editable={
                editable && {
                  icon: <EditOutlined style={{ color: 'rgba(0, 0, 0, 0.88)', margin: '0 10px' }} />,
                  tooltip: 'Edit Parameter Key',
                  onStart: () => pushKey(key, field, fieldType),
                  onCancel: () => restoreKey,
                  onChange: setParamKey,
                  onEnd: () => saveKey(key),
                  enterIcon: <CheckOutlined />,
                }
              }
            >
              {key[0].toUpperCase() + key.slice(1) /*TODO */}
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
              label={key[0].toUpperCase() + key.slice(1)}
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
                            linkedParametersChange(key, idList, field, fieldType)
                          }
                          options={parametersList}
                        />
                      </Space>
                    )}
                    {!editable &&
                      field.linkedParameters.map((paramId: string) => {
                        return (
                          <Space>
                            <Tag color="purple">{paramIdToName[paramId]}</Tag>
                          </Space>
                        );
                      })}
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
                    {getNestedParameters(key, field)}
                    {editable && (
                      <Space>
                        {getAddButton('Add Parameter', undefined, (_: any) =>
                          onClickAddField(field, 'nested'),
                        )}
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
      </>
    );
  };

  const addButtonTitle = props.contentType == 'metadata' ? 'Add Meta Data' : 'Add Parameter';

  return (
    <>
      {idVisible && props.contentType === 'metadata' && (
        <Row gutter={[24, 24]} align="middle" style={{ margin: '10px 0' }}>
          <Col span={3} className="gutter-row">
            {' '}
            Internal ID
          </Col>
          <Col span={20} className="gutter-row">
            <Input value={editingConfig.id} disabled prefix={<KeyOutlined />} />
          </Col>
          <Col span={1}>
            <Tooltip title="Hide Internal ID">
              <Button
                size="small"
                disabled={!editable}
                onClick={() => {
                  setIdVisible(false);
                }}
                icon={<EyeInvisibleOutlined />}
                type="text"
              />
            </Tooltip>
          </Col>
        </Row>
      )}
      {Object.entries(editingContent).map(([key, val]) => {
        return getCustomField(key, val, 'main');
      })}
      {editable && (
        <Row gutter={[24, 24]} align="middle" style={{ margin: '10px 0' }}>
          {/* <Col span={3} className="gutter-row" /> */}
          <Col span={21} className="gutter-row">
            {getAddButton(addButtonTitle, undefined, () => onClickAddField(undefined, 'main'))}
          </Col>
        </Row>
      )}
      <CreateParameterModal
        title={props.contentType == 'metadata' ? 'Create Meta Data' : 'Create Parameter'}
        open={createFieldOpen}
        onCancel={() => setCreateFieldOpen(false)}
        onSubmit={createField}
        okText="Create"
        showKey
      />
    </>
  );
}
