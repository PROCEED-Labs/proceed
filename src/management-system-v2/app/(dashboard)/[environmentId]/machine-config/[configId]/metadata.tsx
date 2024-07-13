'use client';

import {
  AbstractConfig,
  AbstractConfigInputSchema,
  Parameter,
  ParentConfig,
  TargetConfig,
} from '@/lib/data/machine-config-schema';
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
import {
  TreeFindStruct,
  defaultConfiguration,
  defaultParameter,
  deleteParameter,
  findConfig,
} from '../configuration-helper';
import getAddButton from './add-button';
import Text from 'antd/es/typography/Text';
import { v4 } from 'uuid';
import Property from './property';
import CreatePropertyModal, { CreatePropertyModalReturnType } from './create-property-modal';

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
  editableConfigProperty: 'metadata' | 'parameters';
};

export default function MetaData(props: MachineDataViewProps) {
  const router = useRouter();
  const environment = useEnvironment();
  const query = useSearchParams();

  const firstRender = useRef(true);
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
  const [editingMetadata, setEditingMetadata] = useState<TargetConfig['parameters']>(
    props.editableConfigProperty === 'metadata'
      ? editingMachineConfig.metadata
      : 'parameters' in editingMachineConfig
        ? (editingMachineConfig as TargetConfig).parameters
        : {},
  );

  const onContentDelete = (param: Parameter) => {
    if (param.content.length <= 0 && param.id) {
      deleteParameter(param.id, rootMachineConfig);
      let copyMetadata = { ...editingMetadata };
      for (let prop in copyMetadata) {
        if (param.id === copyMetadata[prop].id) {
          delete copyMetadata[prop];
          break;
        }
      }
      setEditingMetadata(copyMetadata);
    }
  };

  const onClickAddField = (e: any) => {
    setCreateFieldOpen(true);
  };

  const saveAll = () => {
    if (refEditingMachineConfig) {
      if (props.editableConfigProperty === 'metadata') {
        refEditingMachineConfig.selection.metadata = editingMetadata;
      } else {
        (refEditingMachineConfig.selection as TargetConfig).parameters = editingMetadata;
      }
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

  useEffect(() => {
    saveAll();
  }, [editingMetadata]);

  const showMobileView = useMobileModeler();
  const editable = props.editingEnabled;

  const createField = (values: CreatePropertyModalReturnType[]): Promise<void> => {
    if (refEditingMachineConfig) {
      const valuesFromModal = values[0];
      const field = defaultParameter(
        valuesFromModal.displayName,
        valuesFromModal.value,
        valuesFromModal.language,
        valuesFromModal.unit,
      );
      let copyMetadata = { ...editingMetadata };
      copyMetadata[valuesFromModal.key ?? valuesFromModal.displayName] = field;
      setEditingMetadata(copyMetadata);
    }
    setCreateFieldOpen(false);
    return Promise.resolve();
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
            selectedConfig={refEditingMachineConfig}
            field={field}
            onDelete={onContentDelete}
            label={key[0].toUpperCase() + key.slice(1)}
          />
        </Col>
      </Row>
    );
  };

  return (
    <>
      {idVisible && props.editableConfigProperty === 'metadata' && (
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
      {Object.entries(editingMetadata).map(([key, val], idx: number) => {
        return getCustomField(key, val, idx);
      })}
      {editable && (
        <Row gutter={[24, 24]} align="middle" style={{ margin: '16px 0' }}>
          <Col span={3} className="gutter-row" />
          <Col span={21} className="gutter-row">
            {getAddButton('Add Field', undefined, onClickAddField)}
          </Col>
        </Row>
      )}
      <CreatePropertyModal
        title="Create Metadata"
        open={createFieldOpen}
        onCancel={() => setCreateFieldOpen(false)}
        onSubmit={createField}
        okText="Create"
        showKey
      />
    </>
  );
}
