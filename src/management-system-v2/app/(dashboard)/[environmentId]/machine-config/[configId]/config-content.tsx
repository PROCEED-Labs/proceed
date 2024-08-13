'use client';

import {
  AbstractConfig,
  Parameter,
  ParentConfig,
  TargetConfig,
} from '@/lib/data/machine-config-schema';
import { useRouter } from 'next/navigation';

import { KeyOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
import { useEffect, useRef, useState } from 'react';
import { Button, Input, Col, Row, Tooltip } from 'antd';
import {
  TreeFindParameterStruct,
  TreeFindStruct,
  defaultConfiguration,
  defaultParameter,
  deleteLinks,
  deleteParameter,
  findConfig,
  findParameter,
} from '../configuration-helper';
import AddButton from './add-button';
import CreateParameterModal, { CreateParameterModalReturnType } from './create-parameter-modal';
import CustomField from './custom-field';

type FieldType = 'main' | 'nested';

type MachineDataViewProps = {
  configId: string;
  selectedMachineConfig: TreeFindStruct;
  customConfig?: AbstractConfig;
  parentConfig: ParentConfig;
  backendSaveParentConfig: Function;
  editingEnabled: boolean;
  contentType: 'metadata' | 'parameters';
};

const Content: React.FC<MachineDataViewProps> = ({
  configId,
  selectedMachineConfig,
  customConfig,
  parentConfig,
  backendSaveParentConfig: saveParentConfig,
  editingEnabled,
  contentType,
}) => {
  const router = useRouter();

  const [createFieldOpen, setCreateFieldOpen] = useState<boolean>(false);
  const [updating, setUpdating] = useState<boolean>(false);
  const [idVisible, setIdVisible] = useState<boolean>(true);

  const [parentNestedSelection, setParentNestedSelection] = useState<Parameter>();

  const editingConfig = selectedMachineConfig
    ? { ...selectedMachineConfig.selection }
    : customConfig
      ? { ...customConfig }
      : defaultConfiguration();

  let refEditingConfig = findConfig(editingConfig.id, parentConfig);

  const [editingContent, setEditingContent] = useState<TargetConfig['parameters']>(
    contentType === 'metadata'
      ? editingConfig.metadata
      : 'parameters' in editingConfig
        ? (editingConfig as TargetConfig).parameters
        : {},
  );

  const onContentDelete = (param: Parameter) => {
    if (param.content.length <= 0 && param.id) {
      deleteParameter(param.id, parentConfig);
      let copyContent = { ...editingContent };
      for (let prop in copyContent) {
        if (param.id === copyContent[prop].id) {
          delete copyContent[prop];
          break;
        }
      }
      // Fix links
      deleteLinks(param, parentConfig);
      setEditingContent(copyContent);
      setUpdating(true);
    }
  };

  const onClickAddField = (parent: Parameter | undefined, type: FieldType) => {
    if (type === 'nested') {
      // setEditingContent({ ...parent.parameters });
      setParentNestedSelection(parent);
    }
    setCreateFieldOpen(true);
  };

  const saveAll = async () => {
    if (refEditingConfig) {
      if (contentType === 'metadata') {
        refEditingConfig.selection.metadata = editingContent;
      } else {
        (refEditingConfig.selection as TargetConfig).parameters = editingContent;
      }
    }
    await saveParentConfig(configId, parentConfig);
    console.log('Saving');
    router.refresh();
  };

  useEffect(() => {
    if (updating) {
      saveAll();
      setUpdating(false);
      setParentNestedSelection(undefined);
    }
  }, [updating]);

  useEffect(() => {
    setEditingContent(
      contentType === 'metadata'
        ? editingConfig.metadata
        : 'parameters' in editingConfig
          ? (editingConfig as TargetConfig).parameters
          : {},
    );
  });

  const editable = editingEnabled;

  const createField = (values: CreateParameterModalReturnType[]): Promise<void> => {
    if (refEditingConfig) {
      const valuesFromModal = values[0];
      const field = defaultParameter(
        valuesFromModal.displayName,
        valuesFromModal.value,
        valuesFromModal.language,
        valuesFromModal.unit,
      );
      let copyContent = { ...editingContent };
      if (parentNestedSelection && parentNestedSelection.id) {
        let ref: TreeFindParameterStruct = undefined;
        for (let prop in copyContent) {
          if (copyContent[prop].id === parentNestedSelection.id) {
            ref = { selection: copyContent[prop], parent: editingConfig, type: 'parameter' };
          } else {
            ref = findParameter(parentNestedSelection.id, copyContent[prop], 'parameter');
          }
          if (ref) {
            break;
          }
        }
        if (!ref) return Promise.resolve();
        (ref.selection as Parameter).parameters[
          valuesFromModal.key ?? valuesFromModal.displayName
        ] = field;
      } else {
        copyContent[valuesFromModal.key ?? valuesFromModal.displayName] = field;
      }
      setEditingContent(copyContent);
      setUpdating(true);
    }
    setCreateFieldOpen(false);
    return Promise.resolve();
  };

  const addButtonTitle = contentType == 'metadata' ? 'Add Meta Data' : 'Add Parameter';

  return (
    <>
      {idVisible && contentType === 'metadata' && (
        <Row gutter={[24, 24]} align="middle" style={{ margin: '10px 0' }}>
          <Col span={3} className="gutter-row">
            Internal ID
          </Col>
          <Col span={20} className="gutter-row">
            <Input value={editingConfig.id} disabled prefix={<KeyOutlined />} />
          </Col>
          <Col span={1}>
            <Tooltip title="Hide Internal ID">
              <Button
                size="small"
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
      {Object.entries(editingContent).map(([key, val]) => (
        <CustomField
          configId={configId}
          parentConfig={parentConfig}
          key={key}
          keyId={key}
          field={val}
          fieldType="main"
          editable={editable}
          parentNestedSelection={parentNestedSelection}
          onNestedSelectionChange={setParentNestedSelection}
          onContentDelete={onContentDelete}
          refEditingConfig={refEditingConfig}
          onClickAddField={onClickAddField}
          selectedMachineConfig={selectedMachineConfig}
          backendSaveParentConfig={saveParentConfig}
          onEditingContentChange={(content) => {
            setEditingContent(content);
            setUpdating(true);
          }}
        />
      ))}
      {editable && (
        <Row gutter={[24, 24]} align="middle" style={{ margin: '10px 0' }}>
          {/* <Col span={3} className="gutter-row" /> */}
          <Col span={21} className="gutter-row">
            <AddButton
              label={addButtonTitle}
              items={undefined}
              onClick={() => onClickAddField(undefined, 'main')}
            />
          </Col>
        </Row>
      )}
      <CreateParameterModal
        title={contentType == 'metadata' ? 'Create Meta Data' : 'Create Parameter'}
        open={createFieldOpen}
        onCancel={() => setCreateFieldOpen(false)}
        onSubmit={createField}
        okText="Create"
        showKey
      />
    </>
  );
};

export default Content;
