'use client';

import { AbstractConfig, Parameter, ParentConfig } from '@/lib/data/machine-config-schema';
import { useRouter, useSearchParams } from 'next/navigation';

import {
  KeyOutlined,
  DeleteOutlined,
  EyeInvisibleOutlined,
  EditOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import TextArea from 'antd/es/input/TextArea';
import { useEffect, useRef, useState } from 'react';
import { Button, Input, Space, Col, Row, Tag, Tooltip, Dropdown, Flex, Modal } from 'antd';
import useMobileModeler from '@/lib/useMobileModeler';
import { useEnvironment } from '@/components/auth-can';
import { TreeFindStruct, defaultConfiguration, findConfig } from '../configuration-helper';
import getAddButton from './add-button';
import Text from 'antd/es/typography/Text';
import { v4 } from 'uuid';
import Property from './property';

const ConfigPredefinedLiterals = [
  'description',
  'owner',
  'userIdentification',
  'machine',
  'picture',
];

type MachineDataViewProps = {
  configId: string;
  selectedMachineConfig: TreeFindStruct;
  customConfig?: AbstractConfig;
  rootMachineConfig: ParentConfig;
  backendSaveMachineConfig: Function;
  editingEnabled: boolean;
};

const getDropdownAddField = (config: AbstractConfig) => {
  let items = [
    {
      key: 'custom-field',
      label: 'Custom Field',
    },
  ];
  for (let field of ConfigPredefinedLiterals) {
    if (config.type !== 'machine-config' && field === 'machine') continue;
    if (!(field in config.metadata))
      items.push({
        key: field,
        label: field[0].toUpperCase() + field.slice(1),
      });
  }
  return items;
};

export default function MetaData(props: MachineDataViewProps) {
  const router = useRouter();
  const environment = useEnvironment();
  const query = useSearchParams();

  const firstRender = useRef(true);
  const [createDisplayName, setCreateDisplayName] = useState<string>('');
  const [createValue, setCreateValue] = useState<string>('');
  const [createFieldOpen, setCreateFieldOpen] = useState<boolean>(false);
  const [idVisible, setIdVisible] = useState<boolean>(true);

  const rootMachineConfig = { ...props.rootMachineConfig };
  const editingMachineConfig = props.selectedMachineConfig
    ? { ...props.selectedMachineConfig.selection }
    : props.customConfig
      ? { ...props.customConfig }
      : defaultConfiguration();
  let refEditingMachineConfig = findConfig(editingMachineConfig.id, rootMachineConfig);
  const saveMachineConfig = props.backendSaveMachineConfig;
  const configId = props.configId;

  const onClickAddField = (e: any) => {
    const clickedButton = e.key;
    if (clickedButton === 'custom-field') {
      setCreateFieldOpen(true);
    } else {
      // changeHiding(clickedButton, false);
    }
  };

  const saveAll = () => {
    if (refEditingMachineConfig) {
      saveMachineConfig(configId, rootMachineConfig).then(() => {});
      router.refresh();
    }
  };

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
  }, [props.selectedMachineConfig]);

  const showMobileView = useMobileModeler();
  const editable = props.editingEnabled;

  const createField = () => {
    if (refEditingMachineConfig) {
      setCreateFieldOpen(false);
    }
  };

  const getCustomField = (key: string, field: Parameter, idx: number) => {
    return (
      <Row gutter={[24, 24]} /* align="middle" */ style={{ margin: '16px 0' }}>
        <Col span={3} className="gutter-row">
          {key[0].toUpperCase() + key.slice(1)}
        </Col>
        <Col span={21} className="gutter-row">
          <Property
            backendSaveParentConfig={saveMachineConfig}
            configId={configId}
            editingEnabled={editable}
            parentConfig={rootMachineConfig}
            selectedConfig={props.selectedMachineConfig}
            field={field}
            label={key[0].toUpperCase() + key.slice(1)}
          />
        </Col>
      </Row>
    );
  };

  return (
    <>
      {idVisible && (
        <Row gutter={[24, 24]} align="middle" style={{ margin: '16px 0' }}>
          <Col span={3} className="gutter-row">
            {' '}
            Internal ID
          </Col>
          <Col span={20} className="gutter-row">
            <Input value={editingMachineConfig.id} disabled prefix={<KeyOutlined />} />
          </Col>
          <Col span={1}>
            <Tooltip title="Hide Internal ID">
              <Button
                disabled={!editable}
                onClick={() => {
                  setIdVisible(false);
                }}
                icon={<EyeInvisibleOutlined />}
                type="text"
              />
            </Tooltip>
          </Col>
        </Row>
      )}
      {Object.entries(editingMachineConfig.metadata).map(([key, val], idx: number) => {
        return getCustomField(key, val, idx);
      })}
      {editable && (
        <Row gutter={[24, 24]} align="middle" style={{ margin: '16px 0' }}>
          <Col span={3} className="gutter-row" />
          <Col span={21} className="gutter-row">
            {getAddButton('Add Field', getDropdownAddField(editingMachineConfig), onClickAddField)}
          </Col>
        </Row>
      )}
      <Modal
        open={createFieldOpen}
        title={'Create Custom Field'}
        onOk={createField}
        onCancel={() => {
          setCreateFieldOpen(false);
        }}
      >
        Name:
        <Input
          required
          value={createDisplayName}
          onChange={(e) => setCreateDisplayName(e.target.value)}
        />
        Value:
        <Input required value={createValue} onChange={(e) => setCreateValue(e.target.value)} />
      </Modal>
    </>
  );
}
