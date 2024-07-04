'use client';

import { ParentConfig, ConfigParameter } from '@/lib/data/machine-config-schema';
import { useRouter, useSearchParams } from 'next/navigation';

import { PlusOutlined, DeleteOutlined, CaretRightOutlined } from '@ant-design/icons';
import { useEffect, useRef, useState } from 'react';
import {
  Button,
  Input,
  Dropdown,
  Space,
  Col,
  Row,
  Tag,
  Tooltip,
  Collapse,
  theme,
  Flex,
} from 'antd';
import { spaceURL } from '@/lib/utils';
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
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState<string | undefined>('');
  const [description, setDescription] = useState<string | undefined>('');

  const parentConfig = { ...props.parentConfig };
  const editingConfig = props.selectedConfig
    ? { ...props.selectedConfig.selection }
    : defaultConfiguration();
  let refEditingMachineConfig = findConfig(editingConfig.id, parentConfig);
  const saveMachineConfig = props.backendSaveParentConfig;
  const configId = props.configId;
  const selectedVersionId = query.get('version');
  const [nestedParameters, setNestedParameters] = useState<ConfigParameter[]>([]); // State for nested parameters

  //Added by Antoni
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const editable = props.editingEnabled;

  const changeNestedParameter = (index: number, key: string, value: string) => {
    const newNestedParameters = [...nestedParameters];
    if (key === 'key') newNestedParameters[index].key = value;
    else if (key === 'value') newNestedParameters[index].value = value;
    else if (key === 'unit') newNestedParameters[index].unit = value;
    else if (key === 'language') newNestedParameters[index].language = value;
    setNestedParameters(newNestedParameters);
  };

  const saveParameters = () => {
    if (refEditingMachineConfig) {
      refEditingMachineConfig.selection.parameters = nestedParameters;
      saveMachineConfig(configId, parentConfig).then(() => {});
      router.refresh();
    }
  };

  const removeNestedParameter = (index: number) => {
    setNestedParameters(nestedParameters.filter((_, i) => i !== index));
  };

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setName(editingConfig.name);
    setDescription(editingConfig.description?.value);
    if (refEditingMachineConfig) setNestedParameters(refEditingMachineConfig.selection.parameters);
  }, [props.selectedConfig]);

  const showMobileView = useMobileModeler();

  const parameterItemHeader = (parameter: ConfigParameter) => (
    <Space.Compact block size="small">
      <Flex align="center" justify="space-between" style={{ width: '100%' }}>
        <Space>
          <Text>{parameter.key}: </Text>
          <Text>{parameter.value}</Text>
          <Text>{parameter.unit}</Text>
          <Text type="secondary">({parameter.language})</Text>
        </Space>
        {getTooltips(editable, true, true, editable)}
        {/* <Space align="center">
          <Tooltip title="Copy">
            <Button icon={<CopyOutlined />} type="text" style={{ margin: '0 10px' }} />
          </Tooltip>
          <Tooltip title="Edit">
            <Button icon={<EditOutlined />} type="text" style={{ margin: '0 10px' }} />
          </Tooltip>
          <Tooltip title="Delete">
            <Button
              disabled={!editable}
              icon={<DeleteOutlined />}
              type="text"
              style={{ margin: '0 10px' }}
            />
          </Tooltip>
        </Space> */}
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

  const getNestedParameters = () => {
    if (nestedParameters && nestedParameters.length > 0) {
      return (
        <Collapse
          bordered={false}
          expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} />}
          items={nestedParameters}
          style={{ display: nestedParameters.length > 0 ? 'block' : 'none' }}
        />
      );
    }
    return getAddButton('Add Nested Parameter', undefined, () => {});
  };

  const parameterContent = (parameter: ConfigParameter) => (
    <div>
      <Row gutter={[24, 24]} align="middle" style={{ margin: '10px 0' }}>
        <Col span={3} className="gutter-row">
          {' '}
          Key{' '}
        </Col>
        <Col span={20} className="gutter-row">
          <Input disabled={!editable} value={parameter.key} />
        </Col>
      </Row>
      <Row gutter={[24, 24]} align="middle" style={{ margin: '10px 0' }}>
        <Col span={3} className="gutter-row">
          {' '}
          Value{' '}
        </Col>
        <Col span={20} className="gutter-row">
          <Input disabled={!editable} value={parameter.value} />
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
          <Input disabled={!editable} value={parameter.unit} />
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
          <Input disabled={!editable} value={parameter.language} />
        </Col>
        <Col span={1} className="gutter-row">
          <Tooltip title="Delete">
            <Button disabled={!editable} icon={<DeleteOutlined />} type="text" />
          </Tooltip>
        </Col>
      </Row>
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
          {getNestedParameters()}
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
    for (let parameter of editingConfig.parameters) {
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
      <Row gutter={[24, 24]} style={{ margin: '16px 0' }}>
        <Col span={2} className="gutter-row">
          {(editable || parameterItems.length > 0) && 'Parameters'}
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
    </>
  );
}
