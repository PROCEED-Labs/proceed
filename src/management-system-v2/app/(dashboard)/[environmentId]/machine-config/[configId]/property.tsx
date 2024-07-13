'use client';

import {
  ParentConfig,
  AbstractConfig,
  Parameter,
  ParameterContent,
} from '@/lib/data/machine-config-schema';
import { useRouter, useSearchParams } from 'next/navigation';

import { PlusOutlined, DeleteOutlined, CaretRightOutlined } from '@ant-design/icons';
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
import getTooltips from './getTooltips';
import CreatePropertyModal, { CreatePropertyModalReturnType } from './create-property-modal';
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

export default function Property(props: MachineDataViewProps) {
  const router = useRouter();
  const environment = useEnvironment();
  const query = useSearchParams();

  const firstRender = useRef(true);
  const parentConfig = { ...props.parentConfig };
  const editingConfig = props.selectedConfig
    ? { ...props.selectedConfig.selection }
    : defaultConfiguration();
  let refEditingMachineConfig = findConfig(editingConfig.id, parentConfig);
  const saveMachineConfig = props.backendSaveParentConfig;
  const configId = props.configId;
  const { token } = theme.useToken();

  const [deleted, setDeleted] = useState<boolean>(false);
  const [created, setCreated] = useState<boolean>(false);
  const [openCreatePropertyModal, setOpenCreatePropertyModal] = useState<boolean>(false);
  const [propertyField, setPropertyField] = useState<Parameter>(props.field);

  const editable = props.editingEnabled;

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    } else {
      saveProperty();
    }
  }, [deleted, created]);

  useEffect(() => {}, [propertyField]);

  const showMobileView = useMobileModeler();

  const deleteContent = (propertyItem: ParameterContent) => {
    let copyPropertyContent = propertyField.content.filter((item: ParameterContent) => {
      return item !== propertyItem;
    });
    let propertyCopy = { ...propertyField };
    propertyCopy.content = copyPropertyContent;
    setPropertyField(propertyCopy);
    setDeleted(!deleted);
    props.onDelete(propertyField);
  };

  const saveProperty = () => {
    if (refEditingMachineConfig && propertyField.id) {
      let paramRef = findParameter(propertyField.id, parentConfig, 'config');
      if (paramRef) {
        paramRef.selection.linkedParameters = propertyField.linkedParameters;
        paramRef.selection.parameters = propertyField.parameters;
        paramRef.selection.content = propertyField.content;
        saveMachineConfig(configId, parentConfig).then(() => {});
        router.refresh();
      }
    }
  };

  const onChangePropertyField = (e: any, propertyContent: ParameterContent) => {
    let index = propertyField.content.indexOf(propertyContent as any);
    let propertyCopy = { ...propertyField };
    if (typeof e !== 'string') {
      const newValue = e.target.value;
      if (e.target.id === 'propertyValue') {
        propertyCopy.content[index].value = newValue;
      } else if (e.target.id === 'propertyName') {
        propertyCopy.content[index].displayName = newValue;
      } else if (e.target.id === 'propertyUnit') {
        propertyCopy.content[index].unit = newValue;
      }
    } else {
      const newValue = e;
      propertyCopy.content[index].language = newValue as Localization;
    }
    setPropertyField(propertyCopy);
  };

  const propertyItemHeader = (propertyContent: ParameterContent) => (
    <Space.Compact block size="small">
      <Flex align="center" justify="space-between" style={{ width: '100%' }}>
        <Space>
          <Text>{propertyContent.displayName}: </Text>
          <Text>{propertyContent.value}</Text>
          <Text>{propertyContent.unit}</Text>
          <Text type="secondary">({propertyContent.language})</Text>
        </Space>
        {getTooltips(editable, ['copy', 'edit', 'delete'], {
          delete: () => {
            deleteContent(propertyContent);
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

  const propertyContent = (propertyItem: ParameterContent) => (
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
                id="propertyName"
                disabled={!editable}
                onChange={(e) => onChangePropertyField(e, propertyItem)}
                value={propertyItem.displayName}
                onBlur={saveProperty}
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
                id="propertyValue"
                disabled={!editable}
                onChange={(e) => onChangePropertyField(e, propertyItem)}
                onBlur={saveProperty}
                value={propertyItem.value}
              />
            </Col>
            <Col span={1} className="gutter-row">
              <Tooltip title="Delete">
                <Button disabled={!editable} icon={<DeleteOutlined />} type="text" />
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
                id="propertyUnit"
                disabled={!editable}
                onChange={(e) => onChangePropertyField(e, propertyItem)}
                onBlur={saveProperty}
                value={propertyItem.unit}
              />
            </Col>
            <Col span={1} className="gutter-row">
              <Tooltip title="Delete">
                <Button disabled={!editable} icon={<DeleteOutlined />} type="text" />
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
                defaultValue={propertyItem.language}
                placeholder="Search to Select"
                optionFilterProp="label"
                filterSort={(optionA, optionB) =>
                  (optionA?.label ?? '')
                    .toLowerCase()
                    .localeCompare((optionB?.label ?? '').toLowerCase())
                }
                onChange={(e) => onChangePropertyField(e, propertyItem)}
                onBlur={saveProperty}
                options={languageItemsSelect}
              />
            </Col>
            <Col span={1} className="gutter-row">
              <Tooltip title="Delete">
                <Button disabled={!editable} icon={<DeleteOutlined />} type="text" />
              </Tooltip>
            </Col>
          </Row>
        </>
      )}
    </div>
  );

  const createContent = (values: CreatePropertyModalReturnType[]): Promise<void> => {
    let propertyCopy = { ...propertyField };
    const valuesFromModal = values[0];
    propertyCopy.content.push({
      displayName: valuesFromModal.displayName,
      language: valuesFromModal.language,
      unit: valuesFromModal.unit,
      value: valuesFromModal.value,
    });
    setPropertyField(propertyCopy);
    setCreated(true);
    setOpenCreatePropertyModal(false);
    return Promise.resolve();
  };

  const getPropertyItems = (): any => {
    let list = [];
    for (let propertyItem of propertyField.content) {
      //TODO
      list.push({
        key: propertyField.content.indexOf(propertyItem),
        label: propertyItemHeader(propertyItem),
        children: [propertyContent(propertyItem)],
        style: panelStyle,
        /* extra: getTooltips(editable, ['copy', 'edit', 'delete'], {
          delete: () => {
            deleteProperty(propertyItem);
          },
        }), */
      });
    }
    return list;
  };
  const propertyItems = getPropertyItems();
  const addButtonTitle = 'Add ' + props.label + ' Item';
  return (
    <>
      {(editable || propertyItems.length > 0) && (
        <>
          <Collapse
            expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} />}
            ghost
            collapsible={
              editable || ('parameters' in propertyField && propertyField.parameters.length > 0)
                ? 'icon'
                : 'disabled'
            }
            size="small"
            items={propertyItems}
          />
          {editable && (
            <Space>
              {getAddButton(addButtonTitle, undefined, () => {
                setOpenCreatePropertyModal(true);
              })}
            </Space>
          )}
        </>
      )}
      <CreatePropertyModal
        title="Create Property"
        open={openCreatePropertyModal}
        onCancel={() => setOpenCreatePropertyModal(false)}
        onSubmit={createContent}
        okText="Create"
        showKey={false}
      />
    </>
  );
}
