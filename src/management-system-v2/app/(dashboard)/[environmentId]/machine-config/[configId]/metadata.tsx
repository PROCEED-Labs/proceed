'use client';

import { AbstractConfig, ParentConfig } from '@/lib/data/machine-config-schema';
import { useRouter, useSearchParams } from 'next/navigation';

import { KeyOutlined, UserOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import TextArea from 'antd/es/input/TextArea';
import { useEffect, useRef, useState } from 'react';
import { Button, Input, Space, Col, Row, Tag, Tooltip, Dropdown, Flex } from 'antd';
import { spaceURL } from '@/lib/utils';
import useMobileModeler from '@/lib/useMobileModeler';
import { useEnvironment } from '@/components/auth-can';
import { TreeFindStruct, defaultConfiguration, findConfig } from '../configuration-helper';
import getAddButton from './add-button';

type MachineDataViewProps = {
  configId: string;
  selectedMachineConfig: TreeFindStruct;
  customConfig?: AbstractConfig;
  rootMachineConfig: ParentConfig;
  backendSaveMachineConfig: Function;
  editingEnabled: boolean;
};

const baseItems = [
  {
    key: '1',
    label: 'Custom Field',
  },
  {
    key: '2',
    label: 'ID',
  },
  {
    key: '3',
    label: 'Owner',
  },
  {
    key: '4',
    label: 'Description',
  },
  {
    key: '5',
    label: 'Picture',
  },
  {
    key: '6',
    label: 'Attachment',
  },
];

const machineItems = baseItems.concat([
  {
    key: '7',
    label: 'Machine',
  },
]);

const LATEST_VERSION = { version: -1, name: 'Latest Version', description: '' };

export default function MetaData(props: MachineDataViewProps) {
  const router = useRouter();
  const environment = useEnvironment();
  const query = useSearchParams();

  const firstRender = useRef(true);
  const [name, setName] = useState<string | undefined>('');
  const [owner, setOwner] = useState<string | undefined>('');
  const [description, setDescription] = useState<string | undefined>('');

  const rootMachineConfig = { ...props.rootMachineConfig };
  const editingMachineConfig = props.selectedMachineConfig
    ? { ...props.selectedMachineConfig.selection }
    : props.customConfig
      ? props.customConfig
      : defaultConfiguration();
  let refEditingMachineConfig = findConfig(editingMachineConfig.id, rootMachineConfig);
  const saveMachineConfig = props.backendSaveMachineConfig;
  const configId = props.configId;

  const changeDescription = (e: any) => {
    let newDescription = e.target.value;
    setDescription(newDescription);
  };
  const changeOwner = (e: any) => {
    let newOwner = e.target.value;
    setOwner(newOwner);
  };

  const saveAll = (e: any) => {
    if (refEditingMachineConfig) {
      if (refEditingMachineConfig.selection.name)
        refEditingMachineConfig.selection.name = name ? name : '';
      if (refEditingMachineConfig.selection.owner)
        refEditingMachineConfig.selection.owner.value = owner ? owner : '';
      if (refEditingMachineConfig.selection.description)
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
    setOwner(editingMachineConfig.owner?.value);
  }, [props.selectedMachineConfig]);

  const showMobileView = useMobileModeler();
  const editable = props.editingEnabled;

  const items = editingMachineConfig.type === 'machine-config' ? machineItems : baseItems;

  return (
    <>
      <Row gutter={[24, 24]} align="middle" style={{ margin: '16px 0' }}>
        <Col span={2} className="gutter-row">
          {' '}
          ID{' '}
        </Col>
        <Col span={21} className="gutter-row">
          <Input value={editingMachineConfig.id} disabled prefix={<KeyOutlined />} />
        </Col>
        <Col span={1} className="gutter-row">
          <Tooltip title="Delete">
            <Button disabled={!editable} icon={<DeleteOutlined />} type="text" />
          </Tooltip>
        </Col>
      </Row>
      <Row gutter={[24, 24]} align="middle" style={{ margin: '16px 0' }}>
        <Col span={2} className="gutter-row">
          {' '}
          Owner{' '}
        </Col>
        <Col span={21} className="gutter-row">
          <Input
            value={owner}
            onChange={changeOwner}
            onBlur={saveAll}
            disabled={!editable}
            prefix={<UserOutlined />}
          />
        </Col>
        <Col span={1} className="gutter-row">
          <Tooltip title="Delete">
            <Button disabled={!editable} icon={<DeleteOutlined />} type="text" />
          </Tooltip>
        </Col>
      </Row>
      <Row gutter={[24, 24]} align="middle" style={{ margin: '16px 0' }}>
        <Col span={2} className="gutter-row">
          {' '}
          Description{' '}
        </Col>
        <Col span={21} className="gutter-row">
          <TextArea
            disabled={!editable}
            value={description}
            onChange={changeDescription}
            onBlur={saveAll}
          />
        </Col>
        <Col span={1} className="gutter-row">
          <Tooltip title="Delete">
            <Button disabled={!editable} icon={<DeleteOutlined />} type="text" />
          </Tooltip>
        </Col>
      </Row>
      {editable && (
        <Row gutter={[24, 24]} align="middle" style={{ margin: '16px 0' }}>
          <Col span={2} className="gutter-row" />
          <Col span={21} className="gutter-row">
            {getAddButton('Add Field', items, '')}
          </Col>
        </Row>
      )}
    </>
  );
}
