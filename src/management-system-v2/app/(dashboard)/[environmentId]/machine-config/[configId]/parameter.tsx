'use client';

import {
  ParentConfig,
  AbstractConfig,
  Parameter,
  ParameterContent,
} from '@/lib/data/machine-config-schema';
import { useRouter, useSearchParams } from 'next/navigation';

import { PlusOutlined, DeleteOutlined, CaretRightOutlined, ClearOutlined } from '@ant-design/icons';
import { useEffect, useRef, useState } from 'react';
import { Button, Input, Space, Col, Row, Tag, Tooltip, Collapse, theme, Flex, Select } from 'antd';
import useMobileModeler from '@/lib/useMobileModeler';
import { useEnvironment } from '@/components/auth-can';
import {
  TreeFindStruct,
  defaultConfiguration,
  findConfig,
  findParameter,
} from '../configuration-helper';
import Text from 'antd/es/typography/Text';
import getAddButton from './add-button';
import getTooltips from './tooltips';
import CreateParameterModal, { CreateParameterModalReturnType } from './create-parameter-modal';
import { Localization, languageItemsSelect } from '@/lib/data/locale';

type MachineDataViewProps = {
  configId: string;
  selectedConfig: TreeFindStruct;
  parentConfig: ParentConfig;
  backendSaveParentConfig: Function;
  customConfig?: AbstractConfig;
  editingEnabled: boolean;
  field: Parameter;
  onDelete: Function;
  label?: string;
};

export default function Param(props: MachineDataViewProps) {
  const router = useRouter();
  const environment = useEnvironment();
  const query = useSearchParams();

  const firstRender = useRef(true);
  const parentConfig = { ...props.parentConfig };
  const editingConfig = props.selectedConfig
    ? { ...props.selectedConfig.selection }
    : defaultConfiguration();
  let refEditingConfig = findConfig(editingConfig.id, parentConfig);
  const saveParentConfig = props.backendSaveParentConfig;
  const configId = props.configId;
  const { token } = theme.useToken();

  const [deleted, setDeleted] = useState<boolean>(false);
  const [created, setCreated] = useState<boolean>(false);
  const [openCreateParameterModal, setOpenCreateParameterModal] = useState<boolean>(false);
  const [parameterField, setParameterField] = useState<Parameter>(props.field);

  const editable = props.editingEnabled;

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    } else {
      saveParameter();
    }
  }, [deleted, created]);

  useEffect(() => {}, [parameterField]);

  const showMobileView = useMobileModeler();

  const deleteContent = (parameterItem: ParameterContent) => {
    let copyParameterContent = parameterField.content.filter((item: ParameterContent) => {
      return item !== parameterItem;
    });
    let parameterCopy = { ...parameterField };
    parameterCopy.content = copyParameterContent;
    setParameterField(parameterCopy);
    setDeleted(!deleted);
    props.onDelete(parameterField);
  };

  const saveParameter = () => {
    if (refEditingConfig && parameterField.id) {
      let paramRef = findParameter(parameterField.id, parentConfig, 'config');
      if (paramRef) {
        paramRef.selection.linkedParameters = parameterField.linkedParameters;
        paramRef.selection.parameters = parameterField.parameters;
        paramRef.selection.content = parameterField.content;
        saveParentConfig(configId, parentConfig).then(() => {});
        router.refresh();
      }
    }
  };

  const onChangeParameterField = (e: any, parameterContent: ParameterContent) => {
    let index = parameterField.content.indexOf(parameterContent as any);
    let parameterCopy = { ...parameterField };
    if (typeof e !== 'string') {
      const newValue = e.target.value;
      if (e.target.id === 'parameterValue') {
        parameterCopy.content[index].value = newValue;
      } else if (e.target.id === 'parameterName') {
        parameterCopy.content[index].displayName = newValue;
      } else if (e.target.id === 'parameterUnit') {
        parameterCopy.content[index].unit = newValue;
      }
    } else {
      const newValue = e;
      parameterCopy.content[index].language = newValue as Localization;
    }
    setParameterField(parameterCopy);
  };

  const parameterItemHeader = (parameterContent: ParameterContent) => (
    <Space.Compact block size="small">
      <Flex align="center" justify="space-between" style={{ width: '100%' }}>
        <Space>
          <Text>{parameterContent.displayName}: </Text>
          <Text>{parameterContent.value}</Text>
          <Text>{parameterContent.unit}</Text>
          {parameterContent.language && <Text type="secondary">({parameterContent.language})</Text>}
        </Space>
        {getTooltips(editable, [/* 'copy', 'edit',  //TODO */ 'delete'], {
          delete: () => {
            deleteContent(parameterContent);
          },
        })}
      </Flex>
    </Space.Compact>
  );

  const panelStyle = {
    margin: '0 0 10px 0',
    background: token.colorFillAlter,
    borderRadius: token.borderRadiusLG,
    border: 'solid 1px #d9d9d9',
  };

  const parameterContent = (parameterItem: ParameterContent) => (
    <div>
      {editable && (
        <>
          <Row gutter={[24, 24]} align="middle" style={{ margin: '10px 0' }}>
            <Col span={3} className="gutter-row">
              {' '}
              Display Name{' '}
            </Col>
            <Col span={20} className="gutter-row">
              <Input
                id="parameterName"
                disabled={!editable}
                onChange={(e) => onChangeParameterField(e, parameterItem)}
                value={parameterItem.displayName}
                onBlur={saveParameter}
              />
            </Col>
          </Row>
          <Row gutter={[24, 24]} align="middle" style={{ margin: '10px 0' }}>
            <Col span={3} className="gutter-row">
              {' '}
              Value{' '}
            </Col>
            <Col span={20} className="gutter-row">
              <Input
                id="parameterValue"
                disabled={!editable}
                onChange={(e) => onChangeParameterField(e, parameterItem)}
                onBlur={saveParameter}
                value={parameterItem.value}
              />
            </Col>
            <Col span={1} className="gutter-row">
              <Tooltip title="Clear">
                <Button
                  size="small"
                  disabled={!editable}
                  onClick={() => {
                    onChangeParameterField(
                      { target: { value: '', id: 'parameterValue' } },
                      parameterItem,
                    );
                  }}
                  icon={<ClearOutlined />}
                  type="text"
                />
              </Tooltip>
            </Col>
          </Row>
          <Row gutter={[24, 24]} align="middle" style={{ margin: '10px 0' }}>
            <Col span={3} className="gutter-row">
              {' '}
              Unit{' '}
            </Col>
            <Col span={20} className="gutter-row">
              <Input
                id="parameterUnit"
                disabled={!editable}
                onChange={(e) => onChangeParameterField(e, parameterItem)}
                onBlur={saveParameter}
                value={parameterItem.unit}
              />
            </Col>
            <Col span={1} className="gutter-row">
              <Tooltip title="Clear">
                <Button
                  size="small"
                  disabled={!editable}
                  onClick={() => {
                    onChangeParameterField(
                      { target: { value: '', id: 'parameterUnit' } },
                      parameterItem,
                    );
                  }}
                  icon={<ClearOutlined />}
                  type="text"
                />
              </Tooltip>
            </Col>
          </Row>
          <Row gutter={[24, 24]} align="middle" style={{ margin: '10px 0' }}>
            <Col span={3} className="gutter-row">
              {' '}
              Language{' '}
            </Col>
            <Col span={20} className="gutter-row">
              <Select
                showSearch
                disabled={!editable}
                value={parameterItem.language}
                style={{ minWidth: 250 }}
                placeholder="Search to Select"
                optionFilterProp="label"
                filterSort={(optionA, optionB) =>
                  (optionA?.label ?? '')
                    .toLowerCase()
                    .localeCompare((optionB?.label ?? '').toLowerCase())
                }
                onChange={(e) => onChangeParameterField(e, parameterItem)}
                onBlur={saveParameter}
                options={languageItemsSelect}
              />
            </Col>
            <Col span={1} className="gutter-row">
              <Tooltip title="Clear">
                <Button
                  size="small"
                  disabled={!editable}
                  onClick={() => {
                    onChangeParameterField('', parameterItem);
                  }}
                  icon={<ClearOutlined />}
                  type="text"
                />
              </Tooltip>
            </Col>
          </Row>
        </>
      )}
    </div>
  );

  const createContent = (values: CreateParameterModalReturnType[]): Promise<void> => {
    let parameterCopy = { ...parameterField };
    const valuesFromModal = values[0];
    parameterCopy.content.push({
      displayName: valuesFromModal.displayName,
      language: valuesFromModal.language,
      unit: valuesFromModal.unit,
      value: valuesFromModal.value,
    });
    setParameterField(parameterCopy);
    setCreated(true);
    setOpenCreateParameterModal(false);
    return Promise.resolve();
  };

  const getParameterItems = (): any => {
    let list = [];
    if (parameterField.content) {
      for (let parameterItem of parameterField.content) {
        list.push({
          key: parameterField.content.indexOf(parameterItem),
          label: parameterItemHeader(parameterItem),
          children: [parameterContent(parameterItem)],
          style: panelStyle,
        });
      }
    }
    return list;
  };
  const parameterItems = getParameterItems();
  const addButtonTitle = 'Add ' + props.label + ' Entry';
  return (
    <>
      {(editable || parameterItems.length > 0) && (
        <>
          <Collapse
            expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} />}
            ghost
            collapsible={
              editable || ('parameters' in parameterField && parameterField.parameters.length > 0)
                ? 'icon'
                : 'disabled'
            }
            size="small"
            items={parameterItems}
          />
          {editable && (
            <Space>
              {getAddButton(addButtonTitle, undefined, () => {
                setOpenCreateParameterModal(true);
              })}
            </Space>
          )}
        </>
      )}
      <CreateParameterModal
        title={'Create ' + props.label + ' Entry'}
        open={openCreateParameterModal}
        onCancel={() => setOpenCreateParameterModal(false)}
        onSubmit={createContent}
        okText="Create"
        showKey={false}
      />
    </>
  );
}
