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

type MachineDataViewProps = {
  configId: string;
  selectedConfig: TreeFindStruct;
  parentConfig: ParentConfig;
  backendSaveParentConfig: Function;
  customConfig?: AbstractConfig;
  editingEnabled: boolean;
  field: ConfigField | ConfigParameter;
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

  const propertyField = props.field;

  const editable = props.editingEnabled;

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
  }, [props.selectedConfig]);

  const showMobileView = useMobileModeler();

  const propertyItemHeader = (propertyItem: PropertyContent) => (
    <Space.Compact block size="small">
      <Flex align="center" justify="space-between" style={{ width: '100%' }}>
        <Space>
          <Text>{propertyItem.displayName}: </Text>
          <Text>{propertyItem.value}</Text>
          <Text>{propertyItem.unit}</Text>
          <Text type="secondary">({propertyItem.language})</Text>
        </Space>
        {getTooltips(editable, ['copy', 'edit', 'delete'])}
      </Flex>
    </Space.Compact>
  );

  const { token } = theme.useToken();
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

  const getPropertyItems = (): any => {
    let list = [];
    for (let propertyItem of propertyField.content) {
      //TODO
      list.push({
        key: propertyField.content.indexOf(propertyItem),
        label: propertyItemHeader(propertyItem),
        children: [propertyContent(propertyItem)],
        style: panelStyle,
      });
    }
    return list;
  };

  const propertyItems = getPropertyItems();

  return (
    <>
      {(editable || propertyItems.length > 0) && (
        <Row gutter={[24, 24]} style={{ margin: '16px 0' }}>
          <Col span={3} className="gutter-row">
            {
              //TODO
              propertyField.key[0].toUpperCase() + propertyField.key.slice(1) ||
                propertyField.content[0].displayName
            }
          </Col>
          <Col span={21} className="gutter-row">
            <Collapse
              expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} />}
              ghost
              size="small"
              items={propertyItems}
            />
            {editable && <Space>{getAddButton('Add Property Item', undefined, () => {})}</Space>}
          </Col>
        </Row>
      )}
    </>
  );
}
