'use client';

import {
  AbstractConfig,
  Parameter,
  ParentConfig,
  TargetConfig,
} from '@/lib/data/machine-config-schema';
import { useRouter, useSearchParams } from 'next/navigation';

import { KeyOutlined, EyeInvisibleOutlined, CheckOutlined, EditOutlined } from '@ant-design/icons';
import { useEffect, useRef, useState } from 'react';
import { Button, Input, Col, Row, Tooltip, Collapse, theme } from 'antd';
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
import Param from './parameter';
import CreateParameterModal, { CreateParameterModalReturnType } from './create-parameter-modal';
import Paragraph from 'antd/es/typography/Paragraph';

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
  contentType: 'metadata' | 'parameters';
};

export default function Content(props: MachineDataViewProps) {
  const router = useRouter();
  const environment = useEnvironment();
  const query = useSearchParams();
  const { token } = theme.useToken();

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
    props.contentType === 'metadata'
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
      if (props.contentType === 'metadata') {
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

  const createField = (values: CreateParameterModalReturnType[]): Promise<void> => {
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
          <Paragraph
            editable={
              editable && {
                icon: <EditOutlined style={{ color: 'rgba(0, 0, 0, 0.88)', margin: '0 10px' }} />,
                tooltip: 'Edit Parameter Key',
                onChange: () => {}, //TODO
                enterIcon: <CheckOutlined />,
              }
            }
          >
            {key[0].toUpperCase() + key.slice(1)}
          </Paragraph>
        </Col>
        <Col span={21} className="gutter-row">
          <Param
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

  const addButtonTitle = props.contentType == 'metadata' ? 'Add Meta Data' : 'Add Parameter';

  return (
    <>
      {idVisible && props.contentType === 'metadata' && (
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
            {getAddButton(addButtonTitle, undefined, onClickAddField)}
          </Col>
        </Row>
      )}
      <CreateParameterModal
        title={props.contentType == 'metadata' ? 'Create Meta Data' : 'Create Parameter'}
        open={createFieldOpen}
        onCancel={() => setCreateFieldOpen(false)}
        onSubmit={createField}
        okText="Create"
        showKey
      />
    </>
  );
}

/*const { token } = theme.useToken();
  const panelStyle = {
    marginBottom: 20,
    background: token.colorFillAlter,
    borderRadius: token.borderRadiusLG,
    border: 'none',
  };

  const getItems = (panelStyle: {
    marginBottom: number;
    background: string;
    borderRadius: number;
    border: string;
  }): any => [
    {
      key: '1',
      label: props.contentType === 'metadata' ? 'Meta Data' : 'Parameters',
      children: [
        <>
          {idVisible && props.contentType === 'metadata' && (
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
                {getAddButton(addButtonTitle, undefined, onClickAddField)}
              </Col>
            </Row>
          )}
          <CreateParameterModal
            title={props.contentType == 'metadata' ? 'Create Meta Data' : 'Create Parameter'}
            open={createFieldOpen}
            onCancel={() => setCreateFieldOpen(false)}
            onSubmit={createField}
            okText="Create"
            showKey
          />
        </>,
      ],
      style: panelStyle,
    },
  ];

  return (
    <Collapse
      bordered={false}
      expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} />}
      defaultActiveKey={['1']}
      style={{
        background: 'none',
      }}
      items={getItems(panelStyle)}
    />
  );
}
*/
