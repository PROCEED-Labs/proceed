'use client';

import { AbstractConfig, ParentConfig, StoredParameter } from '@/lib/data/machine-config-schema';
import { useRouter } from 'next/navigation';

import { KeyOutlined, EyeInvisibleOutlined, EyeOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { Button, Input, Col, Row, Tooltip } from 'antd';
import { defaultParameter } from '../configuration-helper';
import AddButton from './add-button';
import CreateParameterModal, { CreateParameterModalReturnType } from './create-parameter-modal';
import CustomField from './custom-field';

import { addParameter as backendAddParameter } from '@/lib/data/legacy/machine-config';

type MachineDataViewProps = {
  configId: string;
  configType: Exclude<StoredParameter['parentType'], 'parameter'>;
  data: AbstractConfig['metadata'];
  parentConfig: ParentConfig;
  editingEnabled: boolean;
  contentType: 'metadata' | 'parameters';
};

const Content: React.FC<MachineDataViewProps> = ({
  configId,
  configType,
  data,
  parentConfig,
  editingEnabled: editable,
  contentType,
}) => {
  const router = useRouter();

  const [createFieldOpen, setCreateFieldOpen] = useState<boolean>(false);
  const [idVisible, setIdVisible] = useState<boolean>(true);

  const addParameter = async (values: CreateParameterModalReturnType[]) => {
    const valuesFromModal = values[0];
    const newParameter = defaultParameter(
      valuesFromModal.displayName,
      valuesFromModal.value,
      valuesFromModal.language,
      valuesFromModal.unit,
    );

    await backendAddParameter(
      configId,
      configType,
      contentType,
      valuesFromModal.key || '',
      newParameter,
    );

    setCreateFieldOpen(false);
    router.refresh();
  };

  const addButtonTitle = contentType == 'metadata' ? 'Add Meta Data' : 'Add Parameter';

  return (
    <>
      {(idVisible || editable) && contentType === 'metadata' && (
        <Row gutter={[24, 24]} align="middle" style={{ margin: '10px 0' }}>
          <Col span={3} className="gutter-row">
            Internal ID
          </Col>
          <Col span={editable ? 20 : 21} className="gutter-row">
            <Input value={configId} disabled prefix={<KeyOutlined />} />
          </Col>
          {editable && (
            <Col span={1}>
              <Tooltip title="Hide Internal ID">
                <Button
                  size="small"
                  disabled={!editable}
                  onClick={() => {
                    setIdVisible(!idVisible);
                  }}
                  icon={idVisible ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                  type="text"
                />
              </Tooltip>
            </Col>
          )}
        </Row>
      )}
      {Object.entries(data).map(([key, val]) => (
        <CustomField
          parentConfig={parentConfig}
          key={key}
          keyId={key}
          parameter={val}
          editable={editable}
        />
      ))}
      {editable && (
        <Row gutter={[24, 24]} align="middle" style={{ margin: '10px 0' }}>
          {/* <Col span={3} className="gutter-row" /> */}
          <Col span={21} className="gutter-row">
            <AddButton label={addButtonTitle} onClick={() => setCreateFieldOpen(true)} />
          </Col>
        </Row>
      )}
      <CreateParameterModal
        title={contentType == 'metadata' ? 'Create Meta Data' : 'Create Parameter'}
        open={createFieldOpen}
        onCancel={() => setCreateFieldOpen(false)}
        onSubmit={addParameter}
        okText="Create"
        showKey
      />
    </>
  );
};

export default Content;
