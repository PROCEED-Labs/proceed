'use client';

import {
  AbstractConfig,
  ParentConfig,
  ConfigField,
  ConfigPredefinedFields,
  ConfigPredefinedLiterals,
} from '@/lib/data/machine-config-schema';
import { useRouter, useSearchParams } from 'next/navigation';

import {
  KeyOutlined,
  UserOutlined,
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
    if (config[field]?.hiding)
      items.push({
        key: field,
        label: field[0].toUpperCase() + field.slice(1),
      });
  }
  return items;
};

type ConfigPredefinedFieldsObject = {
  [key in ConfigPredefinedFields]: string | undefined;
};

function defaultConfigPredefinedFieldsObject() {
  return {
    description: '',
    machine: '',
    owner: '',
    picture: '',
    userId: '',
  };
}

export default function MetaData(props: MachineDataViewProps) {
  const router = useRouter();
  const environment = useEnvironment();
  const query = useSearchParams();

  const firstRender = useRef(true);
  const firstRender2 = useRef(true);
  const [predefinedFieldsState, setPredefinedFieldsState] = useState<ConfigPredefinedFieldsObject>(
    defaultConfigPredefinedFieldsObject(),
  );
  const [predefinedDisplayNameState, setPredefinedDisplayNameState] =
    useState<ConfigPredefinedFieldsObject>(defaultConfigPredefinedFieldsObject());
  const [histPredefinedDisplayNameState, setHistPredefinedDisplayNameState] =
    useState<ConfigPredefinedFieldsObject>(defaultConfigPredefinedFieldsObject());

  const [customFieldState, setCustomFieldState] = useState<ConfigField[]>([]);
  const [histCustomFieldState, setHistCustomFieldState] = useState<ConfigField[]>([]);

  const [createDisplayName, setCreateDisplayName] = useState<string>('');
  const [createValue, setCreateValue] = useState<string>('');
  const [isOnChange, setIsOnChange] = useState<boolean>(false);
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

  const onChangeField = (fieldName: ConfigPredefinedFields, e: any) => {
    let newValue = e.target.value;
    let copyState = { ...predefinedFieldsState };
    copyState[fieldName] = newValue;
    setPredefinedFieldsState(copyState);
  };

  const onChangeDisplayName = (fieldName: ConfigPredefinedFields, newValue: string) => {
    let copyState = { ...predefinedDisplayNameState };
    copyState[fieldName] = newValue;
    setPredefinedDisplayNameState(copyState);
  };

  const onClickAddField = (e: any) => {
    const clickedButton = e.key;
    if (clickedButton === 'custom-field') {
      setCreateFieldOpen(true);
    } else {
      changeHiding(clickedButton, false);
    }
  };

  const saveAll = () => {
    if (refEditingMachineConfig) {
      for (let field of ConfigPredefinedLiterals) {
        if (refEditingMachineConfig.selection[field]) {
          refEditingMachineConfig.selection[field]!.content[0].value = predefinedFieldsState[field];
          refEditingMachineConfig.selection[field]!.content[0].displayName =
            predefinedDisplayNameState[field] ?? '';
        }
      }
      refEditingMachineConfig.selection.customFields = customFieldState;
      saveMachineConfig(configId, rootMachineConfig).then(() => {});
      router.refresh();
    }
  };

  const saveCustomFields = () => {
    if (refEditingMachineConfig) {
      refEditingMachineConfig.selection.customFields = customFieldState;
      saveMachineConfig(configId, rootMachineConfig).then(() => {});
      router.refresh();
    }
  };

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    let predefValues: ConfigPredefinedFieldsObject = defaultConfigPredefinedFieldsObject();
    let predefDisplayNames: ConfigPredefinedFieldsObject = defaultConfigPredefinedFieldsObject();

    for (let field of ConfigPredefinedLiterals) {
      predefValues[field] = editingMachineConfig[field]?.content[0].value;
      predefDisplayNames[field] = editingMachineConfig[field]?.content[0].displayName;
    }
    setCustomFieldState(editingMachineConfig.customFields);
    setPredefinedFieldsState(predefValues);
    setPredefinedDisplayNameState(predefDisplayNames);
  }, [props.selectedMachineConfig]);

  useEffect(() => {
    if (firstRender2.current) {
      firstRender2.current = false;
      return;
    }
    if (!isOnChange) saveCustomFields();
    setIsOnChange(false);
  }, [customFieldState]);

  const showMobileView = useMobileModeler();
  const editable = props.editingEnabled;

  const createField = () => {
    if (refEditingMachineConfig) {
      setCustomFieldState([
        ...customFieldState,
        {
          id: v4(),
          key: 'custom',
          content: [
            {
              displayName: createDisplayName,
              language: '',
              type: 'string',
              unit: '',
              value: createValue,
            },
          ],
        },
      ]);
      setCreateFieldOpen(false);
    }
  };

  const changeHiding = (fieldName: ConfigPredefinedFields, hide: boolean) => {
    if (refEditingMachineConfig) {
      if (refEditingMachineConfig.selection[fieldName])
        refEditingMachineConfig.selection[fieldName]!.hiding = hide;
      saveAll();
    }
  };

  const onChangeCustom = (idx: number, e: any) => {
    let aux = [...customFieldState];
    aux[idx].content[0].value = e.target.value;
    setIsOnChange(true);
    setCustomFieldState(aux);
  };

  const onChangeCustomDisplayName = (idx: number, newValue: string) => {
    let aux = [...customFieldState];
    aux[idx].content[0].displayName = newValue;
    setIsOnChange(true);
    setCustomFieldState(aux);
  };

  const deleteField = (idx: number) => {
    setCustomFieldState((oldValues) => {
      return oldValues.filter((_, i) => i !== idx);
    });
  };

  const getPredefinedField = (fieldName: ConfigPredefinedFields) => {
    return editingMachineConfig[fieldName]?.hiding ? (
      <></>
    ) : (
      <Row gutter={[24, 24]} align="middle" style={{ margin: '16px 0' }}>
        <Col span={3} className="gutter-row">
          {editable ? (
            <div onBlur={saveAll}>
              <Text
                editable={{
                  icon: (
                    <EditOutlined
                      style={{
                        margin: '0 10px',
                      }}
                    />
                  ),
                  tooltip: 'Edit',
                  onStart: () => setHistPredefinedDisplayNameState(predefinedDisplayNameState),
                  onCancel: () => setPredefinedDisplayNameState(histPredefinedDisplayNameState),
                  onChange: (newValue: string) => onChangeDisplayName(fieldName, newValue),
                  onEnd: () => saveAll(),
                  enterIcon: <CheckOutlined />,
                }}
              >
                {predefinedDisplayNameState[fieldName]}
              </Text>
            </div>
          ) : (
            editingMachineConfig[fieldName]?.content[0].displayName
          )}
        </Col>
        <Col span={20} className="gutter-row">
          <TextArea
            autoSize
            disabled={!editable}
            value={predefinedFieldsState[fieldName]}
            onChange={(e: any) => {
              return onChangeField(fieldName, e);
            }}
            onBlur={saveAll}
          />
        </Col>
        <Col span={1} className="gutter-row">
          <Tooltip title="Delete">
            <Button
              disabled={!editable}
              onClick={() => {
                changeHiding(fieldName, true);
              }}
              icon={<DeleteOutlined />}
              type="text"
            />
          </Tooltip>
        </Col>
      </Row>
    );
  };

  const getCustomField = (field: ConfigField, idx: number) => {
    return (
      <Row gutter={[24, 24]} /* align="middle" */ style={{ margin: '16px 0' }}>
        <Col span={3} className="gutter-row">
          {/* {editable ? (
            <div onBlur={saveCustomFields}>
              <Text
                editable={{
                  icon: (
                    <EditOutlined
                      style={{
                        margin: '0 10px',
                      }}
                    />
                  ),
                  tooltip: 'Edit',
                  onStart: () => setHistCustomFieldState(customFieldState),
                  onCancel: () => setCustomFieldState(histCustomFieldState),
                  onChange: (newValue: string) => onChangeCustomDisplayName(idx, newValue),
                  onEnd: saveCustomFields,
                  enterIcon: <CheckOutlined />,
                }}
              >
                {field.content[0].displayName}
              </Text>
            </div>
          ) : (
            field.content[0].displayName
          )} */}
          {field.key[0].toUpperCase() + field.key.slice(1)}
        </Col>
        <Col span={21} className="gutter-row">
          <Property
            backendSaveParentConfig={saveMachineConfig}
            configId={configId}
            editingEnabled={editable}
            parentConfig={rootMachineConfig}
            selectedConfig={props.selectedMachineConfig}
            field={field}
          />
        </Col>
        {/* <Col span={1} className="gutter-row">
          <Tooltip title="Delete">
            <Button
              disabled={!editable}
              onClick={() => {
                deleteField(idx);
              }}
              icon={<DeleteOutlined />}
              type="text"
            />
          </Tooltip>
        </Col> */}
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
      {ConfigPredefinedLiterals.map((field: ConfigPredefinedFields) => {
        return getPredefinedField(field);
      })}
      {customFieldState.map((field: ConfigField, idx: number) => {
        return getCustomField(field, idx);
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
