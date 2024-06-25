'use client';

import { ParentConfig, MachineConfigParameter } from '@/lib/data/machine-config-schema';
import { useRouter, useSearchParams } from 'next/navigation';

import {
  PlusOutlined,
  MinusOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  ArrowUpOutlined,
  EditOutlined,
  KeyOutlined,
  UserOutlined,
  DeleteOutlined,
  CopyOutlined,
  CaretRightOutlined,
  CaretDownOutlined,
} from '@ant-design/icons';
import TextArea from 'antd/es/input/TextArea';
import { useEffect, useRef, useState } from 'react';
import {
  Button,
  Input,
  Select,
  Space,
  Divider,
  Col,
  Row,
  Tag,
  Tooltip,
  Layout,
  SelectProps,
  Collapse,
  theme,
  Card,
  Dropdown,
} from 'antd';
import { spaceURL } from '@/lib/utils';
import useMobileModeler from '@/lib/useMobileModeler';
import { useEnvironment } from '@/components/auth-can';
import { defaultMachineConfig, findInTree } from './machine-tree-view';
import Parameters from './parameter';

type MachineDataViewProps = {
  configId: string;
  selectedMachineConfig: { parent: ParentConfig; selection: ParentConfig } | undefined;
  rootMachineConfig: ParentConfig;
  backendSaveMachineConfig: Function;
};

const LATEST_VERSION = { version: -1, name: 'Latest Version', description: '' };

export default function MachineConfigurations(props: MachineDataViewProps) {
  const router = useRouter();
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

  const changeDescription = (e: any) => {
    let newDescription = e.target.value;
    setDescription(newDescription);
  };

  const saveDescription = (e: any) => {
    if (refEditingMachineConfig) {
      refEditingMachineConfig.selection.description = description ? description : '';
      saveMachineConfig(configId, rootMachineConfig).then(() => {});
      router.refresh();
    }
  };

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setName(editingMachineConfig.name);
    setDescription(editingMachineConfig.description);
  }, [props.selectedMachineConfig]);

  const showMobileView = useMobileModeler();

  const items = [
    {
      key: '1',
      label: 'Custom Field',
    },
    {
      key: '2',
      label: 'Attachment',
    },
    {
      key: '3',
      label: 'Machine',
    },
    {
      key: '4',
      label: 'Picture',
    },
    {
      key: '5',
      label: 'ID',
    },
    {
      key: '6',
      label: 'Owner',
    },
    {
      key: '7',
      label: 'Description',
    },
  ];

  const childConfigContent = (
    <div>
      <Row gutter={[24, 24]} style={{ margin: '16px 0' }}>
        <Col span={2} className="gutter-row">
          {' '}
          ID{' '}
        </Col>
        <Col span={21} className="gutter-row">
          <Input disabled prefix={<KeyOutlined />} />
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
          Owner{' '}
        </Col>
        <Col span={21} className="gutter-row">
          <Input disabled prefix={<UserOutlined />} />
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
          Description{' '}
        </Col>
        <Col span={21} className="gutter-row">
          <TextArea />
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
                <CaretDownOutlined />
              </Space>
            </Button>
          </Dropdown>
        </Col>
      </Row>
      <Row gutter={[24, 24]} style={{ margin: '16px 0' }}>
        <Col span={23} className="gutter-row">
          <Parameters />
        </Col>
      </Row>
    </div>
  );

  const { token } = theme.useToken();
  const panelStyle = {
    marginBottom: 24,
    background: token.colorFillAlter,
    borderRadius: token.borderRadiusLG,
    border: 'none',
  };

  const getItems = (panelStyle: {
    marginBottom: number;
    background: string;
    borderRadius: number;
    border: string;
  }) => [
    {
      key: '1',
      label: 'Machine Configuration Name',
      children: [childConfigContent],
      style: panelStyle,
    },
    {
      key: '2',
      label: 'Machine Configuration Name',
      children: [childConfigContent],
      style: panelStyle,
    },
  ];

  return (
    <Collapse
      bordered={false}
      expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} />}
      style={{
        background: 'none',
      }}
      items={getItems(panelStyle)}
    />
  );
}
