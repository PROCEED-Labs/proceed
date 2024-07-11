'use client';

import {
  ParentConfig,
  ConfigParameter,
  AbstractConfig,
  ConfigField,
  PropertyContent,
} from '@/lib/data/machine-config-schema';
import { useRouter, useSearchParams } from 'next/navigation';

import { PlusOutlined, DeleteOutlined, CaretRightOutlined } from '@ant-design/icons';
import { useEffect, useRef, useState } from 'react';
import { Button, Input, Space, Col, Row, Tag, Tooltip, Collapse, theme, Flex } from 'antd';
import useMobileModeler from '@/lib/useMobileModeler';
import { useEnvironment } from '@/components/auth-can';
import { TreeFindStruct, defaultConfiguration, findConfig } from '../configuration-helper';
import Text from 'antd/es/typography/Text';
import getAddButton from './add-button';
import getTooltips from './getTooltips';
import { Config } from 'winston/lib/winston/config';
import CreatePropertyModal, { CreatePropertyModalReturnType } from './create-property-modal';

type MachineDataViewProps = {
  configId: string;
  selectedConfig: TreeFindStruct;
  parentConfig: ParentConfig;
  backendSaveParentConfig: Function;
  customConfig?: AbstractConfig;
  editingEnabled: boolean;
  field: ConfigField | ConfigParameter;
  label?: string;
};

const LATEST_VERSION = { version: -1, name: 'Latest Version', description: '' };

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
  const selectedVersionId = query.get('version');
  const { token } = theme.useToken();

  const [openCreatePropertyModal, setOpenCreatePropertyModal] = useState<boolean>(false);
  const [propertyField, setPropertyField] = useState<ConfigField | ConfigParameter>(props.field);

  const editable = props.editingEnabled;

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      setPropertyField(props.field);
      return;
    }
  }, [propertyField]);

  const showMobileView = useMobileModeler();

  const deleteProperty = (propertyItem: PropertyContent) => {
    let copyPropertyContent = propertyField.content.filter((item: PropertyContent) => {
      return item !== propertyItem;
    });
    let propertyCopy = { ...propertyField };
    propertyCopy.content = copyPropertyContent;
    setPropertyField(propertyCopy);
    saveProperty();
  };

  const saveProperty = () => {
    if (refEditingMachineConfig) {
      if (propertyField.key === 'custom') {
        for (let [idx, customField] of refEditingMachineConfig.selection.customFields.entries()) {
          if (customField.id === propertyField.id) {
            refEditingMachineConfig.selection.customFields[idx] = propertyField;
          }
        }
      }
      // TODO: implement!!
      if (propertyField.key === 'param') {
      }
      saveMachineConfig(configId, parentConfig).then(() => {});
      router.refresh();
    }
  };

  const propertyItemHeader = (propertyItem: PropertyContent) => (
    <Space.Compact block size="small">
      <Flex align="center" justify="space-between" style={{ width: '100%' }}>
        <Space>
          <Text>{propertyItem.displayName}: </Text>
          <Text>{propertyItem.value}</Text>
          <Text>{propertyItem.unit}</Text>
          <Text type="secondary">({propertyItem.language})</Text>
        </Space>
        {getTooltips(editable, ['copy', 'edit', 'delete'], {
          delete: () => {
            deleteProperty(propertyItem);
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

  const propertyContent = (propertyItem: PropertyContent) => (
    <div>
      {editable && (
        <>
          <Row gutter={[24, 24]} align="middle" style={{ margin: '10px 0' }}>
            <Col span={3} className="gutter-row">
              {' '}
              Key{' '}
            </Col>
            <Col span={20} className="gutter-row">
              <Input disabled={!editable} value={propertyItem.displayName} />
            </Col>
          </Row>
          <Row gutter={[24, 24]} align="middle" style={{ margin: '10px 0' }}>
            <Col span={3} className="gutter-row">
              {' '}
              Value{' '}
            </Col>
            <Col span={20} className="gutter-row">
              <Input disabled={!editable} value={propertyItem.value} />
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
              <Input disabled={!editable} value={propertyItem.unit} />
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
              <Input disabled={!editable} value={propertyItem.language} />
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

  const createProperty = (values: CreatePropertyModalReturnType[]): Promise<void> => {
    let propertyCopy = { ...propertyField };
    const valuesFromModal = values[0];
    propertyCopy.content.push({
      displayName: valuesFromModal.displayName,
      language: valuesFromModal.language,
      unit: valuesFromModal.unit,
      value: valuesFromModal.value,
    });
    setPropertyField(propertyCopy);
    setOpenCreatePropertyModal(false);
    saveProperty();
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
  const addButtonTitle =
    'Add ' + propertyField.key[0].toUpperCase() + propertyField.key.slice(1) + ' Item';
  return (
    <>
      {(editable || propertyItems.length > 0) && (
        <>
          <Collapse
            expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} />}
            ghost
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
        title="Create Property Modal"
        open={openCreatePropertyModal}
        onCancel={() => setOpenCreatePropertyModal(false)}
        onSubmit={createProperty}
        okText="Create"
      />
    </>
  );
}
