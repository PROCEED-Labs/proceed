'use client';

import { ParentConfig } from '@/lib/data/machine-config-schema';
import { useRouter, useSearchParams } from 'next/navigation';

import { KeyOutlined, UserOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import TextArea from 'antd/es/input/TextArea';
import { useEffect, useRef, useState } from 'react';
import { Button, Input, Space, Col, Row, Tooltip, Collapse, theme, Dropdown } from 'antd';
import useMobileModeler from '@/lib/useMobileModeler';
import { useEnvironment } from '@/components/auth-can';
import { TreeFindStruct, defaultConfiguration, findConfig } from './machine-tree-view';
import Parameters from './parameter';
import getAddFieldDropdown from './add-field-dropdown-button';

type MachineDataViewProps = {
  configId: string;
  selectedConfig: TreeFindStruct;
  parentConfig: ParentConfig;
  backendSaveParentConfig: Function;
};

export default function TargetConfiguration(props: MachineDataViewProps) {
  const router = useRouter();
  const environment = useEnvironment();
  const query = useSearchParams();

  const firstRender = useRef(true);
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState<string | undefined>('');
  const [description, setDescription] = useState<string | undefined>('');

  const parentConfig = { ...props.parentConfig };
  const editingConfig = props.parentConfig.targetConfig
    ? { ...props.parentConfig.targetConfig }
    : defaultConfiguration();
  let refEditingConfig = findConfig(editingConfig.id, parentConfig);
  const saveParentConfig = props.backendSaveParentConfig;
  const configId = props.configId;
  const selectedVersionId = query.get('version');

  const changeDescription = (e: any) => {
    let newDescription = e.target.value;
    setDescription(newDescription);
  };

  const saveDescription = (e: any) => {
    if (refEditingConfig && refEditingConfig.selection.description) {
      refEditingConfig.selection.description.value = description ? description : '';
      saveParentConfig(configId, parentConfig).then(() => {});
      router.refresh();
    }
  };

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setName(editingConfig.name);
    setDescription(editingConfig.description?.value);
  }, [props.selectedConfig]);

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

  return (
    <div>
      <Row gutter={[24, 24]} style={{ margin: '16px 0' }}>
        <Col span={2} className="gutter-row">
          {' '}
          ID{' '}
        </Col>
        <Col span={21} className="gutter-row">
          <Input disabled value={editingConfig.id} prefix={<KeyOutlined />} />
        </Col>
        <Col span={1} className="gutter-row">
          <Tooltip title="Delete">
            <Button icon={<DeleteOutlined />} type="text" />
          </Tooltip>
        </Col>
      </Row>
      <Row gutter={[24, 24]} style={{ margin: '16px 0' }}>
        <Col span={2} className="gutter-row">
          {editingConfig.owner?.label}
        </Col>
        <Col span={21} className="gutter-row">
          <Input disabled value={editingConfig.owner?.value} prefix={<UserOutlined />} />
        </Col>
        <Col span={1} className="gutter-row">
          <Tooltip title="Delete">
            <Button icon={<DeleteOutlined />} type="text" />
          </Tooltip>
        </Col>
      </Row>
      <Row gutter={[24, 24]} style={{ margin: '16px 0' }}>
        <Col span={2} className="gutter-row">
          {editingConfig.description?.label}
        </Col>
        <Col span={21} className="gutter-row">
          <TextArea value={editingConfig.description?.value} />
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
                <PlusOutlined
                  style={{
                    margin: '0 0 0 6px',
                  }}
                />
              </Space>
            </Button>
          </Dropdown>
        </Col>
      </Row>
      <Row gutter={[24, 24]} style={{ margin: '16px 0' }} justify="start">
        <Col span={2} className="gutter-row">
          Parameters
        </Col>
        <Col span={21} className="gutter-row">
          <Parameters
            parentConfig={parentConfig}
            backendSaveParentConfig={saveParentConfig}
            configId={configId}
            selectedConfig={{ parent: parentConfig, selection: editingConfig }}
          />
        </Col>
      </Row>
    </div>
  );
}
