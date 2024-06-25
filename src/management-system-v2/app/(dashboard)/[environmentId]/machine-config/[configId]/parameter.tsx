'use client';

import { ParentConfig, MachineConfigParameter } from '@/lib/data/machine-config-schema';
import { useRouter, useSearchParams } from 'next/navigation';

import {
  PlusOutlined,
  MinusOutlined,
  EditOutlined,
  KeyOutlined,
  UserOutlined,
  DeleteOutlined,
  CopyOutlined,
  CaretRightOutlined,
  DownOutlined,
} from '@ant-design/icons';
import { useEffect, useRef, useState } from 'react';
import {
  Button,
  Input,
  Dropdown,
  Select,
  Space,
  Col,
  Row,
  Tag,
  Tooltip,
  Collapse,
  theme,
  Card,
} from 'antd';
import { spaceURL } from '@/lib/utils';
import useMobileModeler from '@/lib/useMobileModeler';
import { useEnvironment } from '@/components/auth-can';
import { defaultMachineConfig, findInTree } from './machine-tree-view';
import Title from 'antd/es/typography/Title';
import Text from 'antd/es/typography/Text';

type MachineDataViewProps = {
  configId: string;
  selectedMachineConfig: { parent: ParentConfig; selection: ParentConfig } | undefined;
  rootMachineConfig: ParentConfig;
  backendSaveMachineConfig: Function;
};

const LATEST_VERSION = { version: -1, name: 'Latest Version', description: '' };

export default function Parameters(/*props: MachineDataViewProps*/) {
  /*   const router = useRouter();
  const environment = useEnvironment();
  const query = useSearchParams();

  const firstRender = useRef(true);
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState<string | undefined>('');
  const [description, setDescription] = useState<string | undefined>('');

  const rootMachineConfig = { ...props.rootMachineConfig };
  const parentMachineConfig = props.selectedMachineConfig
    ? { ...props.selectedMachineConfig.parent }
    : defaultMachineConfig();
  const editingMachineConfig = props.selectedMachineConfig
    ? { ...props.selectedMachineConfig.selection }
    : defaultMachineConfig();
  let refEditingMachineConfig = findInTree(
    editingMachineConfig.id,
    rootMachineConfig,
    rootMachineConfig,
    0,
  );
  const saveMachineConfig = props.backendSaveMachineConfig;
  const configId = props.configId;
  const selectedVersionId = query.get('version');
  const [nestedParameters, setNestedParameters] = useState<MachineConfigParameter[]>([]); // State for nested parameters

  //Added by Antoni
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();
  const addNestedParameter = () => {
    setNestedParameters([
      ...nestedParameters,
      { key: '', value: '', unit: '', language: '', children: [] },
    ]);
  };

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
      saveMachineConfig(configId, rootMachineConfig).then(() => {});
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
    setName(editingMachineConfig.name);
    setDescription(editingMachineConfig.description);
    if (refEditingMachineConfig) setNestedParameters(refEditingMachineConfig.selection.parameters);
  }, [props.selectedMachineConfig]);

  const showMobileView = useMobileModeler();

  const toggleEditingName = () => {
    // if (editingName) {
    //   saveMachineConfig(configId, rootMachineConfig).then(() => {});
    // }
    setEditingName(!editingName);
  };

  const parameterContent = (
    <div>
      <Row gutter={[24, 24]} style={{ margin: '16px 0' }}>
        <Col span={2} className="gutter-row">
          {' '}
          Parameters{' '}
        </Col>
        <Col span={22} className="gutter-row">
          <Card>
            <Button
              icon={<PlusOutlined />}
              type="dashed"
              style={{ width: '100%', marginBottom: 16 }}
              onClick={addNestedParameter}
            >
              Add Parameter
            </Button>
            {nestedParameters.map((param, i) => (
              <Card
                key={i}
                type="inner"
                title={`Nested Parameter ${i + 1}`}
                extra={
                  <Button
                    icon={<MinusOutlined />}
                    type="dashed"
                    onClick={() => removeNestedParameter(i)}
                  />
                }
                style={{ marginBottom: 16 }}
              >
                <Row gutter={16} style={{ marginBottom: 16 }}>
                  <Col span={6}>
                    <Input
                      placeholder="Key"
                      value={param.key}
                      onChange={(e) => changeNestedParameter(i, 'key', e.target.value)}
                      onBlur={saveParameters}
                    />
                  </Col>
                  <Col span={6}>
                    <Input
                      placeholder="Value"
                      value={param.value}
                      onChange={(e) => changeNestedParameter(i, 'value', e.target.value)}
                      onBlur={saveParameters}
                    />
                  </Col>
                  <Col span={6}>
                    <Input
                      placeholder="Unit"
                      value={param.unit}
                      onChange={(e) => changeNestedParameter(i, 'unit', e.target.value)}
                      onBlur={saveParameters}
                    />
                  </Col>
                  <Col span={6}>
                    <Input
                      placeholder="Language"
                      value={param.language}
                      onChange={(e) => changeNestedParameter(i, 'language', e.target.value)}
                      onBlur={saveParameters}
                    />
                  </Col>
                </Row>
                <Row gutter={16} style={{ marginBottom: 16 }}>
                  <Col span={24}>
                    <Space>
                      <Tag color="purple">Key XY</Tag>
                      <Tag color="blue">Key AB</Tag>
                      <Button icon={<PlusOutlined />} type="dashed" />
                    </Space>
                  </Col>
                </Row>
              </Card>
            ))}
          </Card>
        </Col>
      </Row>
    </div>
  ); */

  const parametersHeader = (
    <Space.Compact block size="small">
      <Text>Parameters</Text>
      <Tooltip title="Add Parameter">
        <Button icon={<PlusOutlined />} type="text" style={{ margin: '0 16px' }} />
      </Tooltip>
    </Space.Compact>
  );

  const parameterItemHeader = (
    <Space.Compact block size="small">
      <Input style={{ margin: '0 16px' }} placeholder="Key" />
      <Space align="center">
        <Tooltip title="Copy">
          <Button icon={<CopyOutlined />} type="text" style={{ margin: '0 16px' }} />
        </Tooltip>
        <Tooltip title="Edit">
          <Button icon={<EditOutlined />} type="text" style={{ margin: '0 16px' }} />
        </Tooltip>
        <Tooltip title="Delete">
          <Button icon={<DeleteOutlined />} type="text" style={{ margin: '0 16px' }} />
        </Tooltip>
      </Space>
    </Space.Compact>
  );

  const { token } = theme.useToken();
  const panelStyle = {
    marginBottom: 24,
    background: token.colorFillAlter,
    borderRadius: token.borderRadiusLG,
    border: 'none',
  };

  const items = [
    {
      key: '1',
      label: 'Value',
    },
    {
      key: '2',
      label: 'Unit',
    },
    {
      key: '3',
      label: 'Language',
    },
  ];

  const parameterContent = (
    <div>
      <Row gutter={[24, 24]} style={{ margin: '16px 0' }}>
        <Col span={2} className="gutter-row">
          {' '}
          Value{' '}
        </Col>
        <Col span={21} className="gutter-row">
          <Input />
        </Col>
        <Col span={1} className="gutter-row">
          <Tooltip title="Delete">
            <Button icon={<DeleteOutlined />} type="text" />
          </Tooltip>
        </Col>
      </Row>
      <Row gutter={[24, 24]} style={{ margin: '16px 0' }}>
        <Col span={2} className="gutter-row">
          {' '}
          Unit{' '}
        </Col>
        <Col span={21} className="gutter-row">
          <Input />
        </Col>
        <Col span={1} className="gutter-row">
          <Tooltip title="Delete">
            <Button icon={<DeleteOutlined />} type="text" />
          </Tooltip>
        </Col>
      </Row>
      <Row gutter={[24, 24]} style={{ margin: '16px 0' }}>
        <Col span={2} className="gutter-row">
          {' '}
          Language{' '}
        </Col>
        <Col span={21} className="gutter-row">
          <Input />
        </Col>
        <Col span={1} className="gutter-row">
          <Tooltip title="Delete">
            <Button icon={<DeleteOutlined />} type="text" />
          </Tooltip>
        </Col>
      </Row>
      <Row gutter={[24, 24]} style={{ margin: '16px 0' }}>
        <Col span={2} className="gutter-row">
          {' '}
          Linked Parameters{' '}
        </Col>
        <Col span={21} className="gutter-row">
          <Input />
        </Col>
        <Col span={1} className="gutter-row">
          <Tooltip title="Delete">
            <Button icon={<DeleteOutlined />} type="text" />
          </Tooltip>
        </Col>
      </Row>
      <Row gutter={[24, 24]} style={{ margin: '16px 0' }}>
        <Col span={2} className="gutter-row">
          {' '}
          Nested Parameters{' '}
        </Col>
        <Col span={21} className="gutter-row">
          <Input />
        </Col>
        <Col span={1} className="gutter-row">
          <Tooltip title="Delete">
            <Button icon={<DeleteOutlined />} type="text" />
          </Tooltip>
        </Col>
      </Row>
      <Row gutter={[24, 24]} style={{ margin: '16px 0' }} justify="start">
        <Col span={2} className="gutter-row">
          <Dropdown menu={{ items }}>
            <Button>
              <Space>
                Add
                <DownOutlined />
              </Space>
            </Button>
          </Dropdown>
        </Col>
      </Row>
    </div>
  );

  const parameterItems = [
    {
      key: '1',
      label: parameterItemHeader,
      children: [parameterContent],
      style: panelStyle,
    },
    {
      key: '2',
      label: parameterItemHeader,
      children: [parameterContent],
      style: panelStyle,
    },
  ];

  const getItems = (panelStyle: {
    marginBottom: number;
    background: string;
    borderRadius: number;
    border: string;
  }) => [
    {
      key: '1',
      label: parametersHeader,
      children: (
        <Collapse
          bordered={false}
          expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} />}
          style={{
            background: 'none',
          }}
          items={parameterItems}
        />
      ),
      style: panelStyle,
    },
  ];

  return (
    <div>
      <Collapse
        bordered={false}
        expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} />}
        style={{
          background: token.colorBgContainer,
        }}
        items={getItems(panelStyle)}
      />
    </div>
  );
}
