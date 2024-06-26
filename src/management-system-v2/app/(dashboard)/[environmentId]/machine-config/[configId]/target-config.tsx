'use client';

import { ParentConfig } from '@/lib/data/machine-config-schema';
import { useRouter, useSearchParams } from 'next/navigation';

import {
  KeyOutlined,
  UserOutlined,
  DeleteOutlined,
  CopyOutlined,
  CaretRightOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import TextArea from 'antd/es/input/TextArea';
import { useEffect, useRef, useState } from 'react';
import { Button, Input, Space, Col, Row, Tooltip, Collapse, theme, Dropdown } from 'antd';
import useMobileModeler from '@/lib/useMobileModeler';
import { useEnvironment } from '@/components/auth-can';
import { defaultConfiguration, findConfig } from './machine-tree-view';
import Parameters from './parameter';

type MachineDataViewProps = {
  configId: string;
  selectedMachineConfig: { parent: ParentConfig; selection: ParentConfig } | undefined;
  rootMachineConfig: ParentConfig;
  backendSaveMachineConfig: Function;
};

export default function TargetConfiguration(props: MachineDataViewProps) {
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
    : defaultConfiguration();
  const editingMachineConfig = props.rootMachineConfig.targetConfig
    ? { ...props.rootMachineConfig.targetConfig }
    : defaultConfiguration();
  let refEditingMachineConfig = findConfig(editingMachineConfig.id, rootMachineConfig);
  const saveMachineConfig = props.backendSaveMachineConfig;
  const configId = props.configId;
  const selectedVersionId = query.get('version');

  const changeDescription = (e: any) => {
    let newDescription = e.target.value;
    setDescription(newDescription);
  };

  const saveDescription = (e: any) => {
    if (refEditingMachineConfig && refEditingMachineConfig.selection.description) {
      refEditingMachineConfig.selection.description.value = description ? description : '';
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
    setDescription(editingMachineConfig.description?.value);
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
      label: 'Picture',
    },
    {
      key: '4',
      label: 'ID',
    },
    {
      key: '5',
      label: 'Owner',
    },
    {
      key: '6',
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
          <Input disabled value={editingMachineConfig.id} prefix={<KeyOutlined />} />
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
          <Input disabled value={editingMachineConfig.owner?.value} prefix={<UserOutlined />} />
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
                <PlusOutlined />
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
      label: editingMachineConfig.name,
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
