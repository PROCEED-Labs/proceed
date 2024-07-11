'use client';

import {
  ParentConfig,
  Parameter,
  TargetConfig,
  MachineConfig,
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

type MachineDataViewProps = {
  configId: string;
  selectedConfig: TreeFindStruct;
  parentConfig: ParentConfig;
  backendSaveParentConfig: Function;
  editingEnabled: boolean;
};

const LATEST_VERSION = { version: -1, name: 'Latest Version', description: '' };

export default function Parameters(props: MachineDataViewProps) {
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
  const [nestedParameters, setNestedParameters] = useState<object>({}); // State for nested parameters

  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const editable = props.editingEnabled;

  const saveParameters = () => {
    if (refEditingMachineConfig) {
      // refEditingMachineConfig.selection.metadata = nestedParameters;
      saveMachineConfig(configId, parentConfig).then(() => {});
      router.refresh();
    }
  };

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    // if (refEditingMachineConfig)
    //   setNestedParameters(
    //     (refEditingMachineConfig.selection as TargetConfig | MachineConfig).parameters,
    //   );
  }, [props.selectedConfig]);

  const showMobileView = useMobileModeler();

  const parameterItemHeader = (parameter: Parameter) => (
    <Space.Compact block size="small">
      <Flex align="center" justify="space-between" style={{ width: '100%' }}>
        <Space>
          <Text>{parameter.content[0].displayName}: </Text>
          <Text>{parameter.content[0].value}</Text>
          <Text>{parameter.content[0].unit}</Text>
          <Text type="secondary">({parameter.content[0].language})</Text>
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

  // const getNestedParameters = () => {
  //   if (nestedParameters && nestedParameters.length > 0) {
  //     return (
  //       <Collapse
  //         bordered={false}
  //         expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} />}
  //         items={nestedParameters}
  //         style={{ display: nestedParameters.length > 0 ? 'block' : 'none' }}
  //       />
  //     );
  //   }
  //   return getAddButton('Add Nested Parameter', undefined, () => {});
  // };

  const parameterContent = (parameter: Parameter) => (
    <div>
      {editable && (
        <>
          <Row gutter={[24, 24]} align="middle" style={{ margin: '10px 0' }}>
            <Col span={3} className="gutter-row">
              {' '}
              Key{' '}
            </Col>
            <Col span={20} className="gutter-row">
              <Input disabled={!editable} value={parameter.content[0].displayName} />
            </Col>
          </Row>
          <Row gutter={[24, 24]} align="middle" style={{ margin: '10px 0' }}>
            <Col span={3} className="gutter-row">
              {' '}
              Value{' '}
            </Col>
            <Col span={20} className="gutter-row">
              <Input disabled={!editable} value={parameter.content[0].value} />
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
              <Input disabled={!editable} value={parameter.content[0].unit} />
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
              <Input disabled={!editable} value={parameter.content[0].language} />
            </Col>
            <Col span={1} className="gutter-row">
              <Tooltip title="Delete">
                <Button disabled={!editable} icon={<DeleteOutlined />} type="text" />
              </Tooltip>
            </Col>
          </Row>
        </>
      )}
      <Row gutter={[24, 24]} align="middle" style={{ margin: '10px 0' }}>
        <Col span={3} className="gutter-row">
          Linked Parameters
        </Col>
        <Col span={20} className="gutter-row">
          <Space>
            <Tag color="purple">Key XY</Tag>
            <Tag color="blue">Key AB</Tag>
            <Tooltip title="Add Parameter Link">
              <Button disabled={!editable} icon={<PlusOutlined />} size="small" />
            </Tooltip>
          </Space>
        </Col>
        <Col span={1} className="gutter-row">
          <Tooltip title="Delete">
            <Button disabled={!editable} icon={<DeleteOutlined />} type="text" />
          </Tooltip>
        </Col>
      </Row>
      <Row gutter={[24, 24]} align="middle" style={{ margin: '10px 0' }}>
        <Col span={3} className="gutter-row">
          Nested Parameters
        </Col>
        <Col span={20} className="gutter-row">
          {/* {getNestedParameters()} */}
          {editable && (
            <Space style={{ margin: '10px 0 0 0' }}>
              {getAddButton('Add Nested Parameter', undefined, () => {})}
            </Space>
          )}
        </Col>
        <Col span={1} className="gutter-row">
          <Tooltip title="Delete">
            <Button disabled={!editable} icon={<DeleteOutlined />} type="text" />
          </Tooltip>
        </Col>
      </Row>
    </div>
  );

  const getParameterItems = (): any => {
    let list = [];
    let _editingConfig = editingConfig as TargetConfig | MachineConfig;
    for (let prop in _editingConfig.parameters) {
      let parameter = _editingConfig.parameters[prop];
      list.push({
        key: parameter.id,
        label: parameterItemHeader(parameter),
        children: [parameterContent(parameter)],
        style: panelStyle,
      });
    }
    return list;
  };

  const parameterItems = getParameterItems();

  return (
    <>
      {(editable || parameterItems.length > 0) && (
        <Row gutter={[24, 24]} style={{ margin: '16px 0' }}>
          <Col span={3} className="gutter-row">
            Parameters
          </Col>
          <Col span={21} className="gutter-row">
            <Collapse
              expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} />}
              ghost
              size="small"
              items={parameterItems}
            />
            {editable && <Space>{getAddButton('Add Parameter', undefined, () => {})}</Space>}
          </Col>
        </Row>
      )}
    </>
  );
}
