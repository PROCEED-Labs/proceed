'use client';

import { ParentConfig } from '@/lib/data/machine-config-schema';
import { useRouter, useSearchParams } from 'next/navigation';

import { useEffect, useRef, useState } from 'react';
import { Col, Row } from 'antd';
import useMobileModeler from '@/lib/useMobileModeler';
import { useEnvironment } from '@/components/auth-can';
import { TreeFindStruct, defaultConfiguration, findConfig } from '../configuration-helper';
import Parameters from './parameter';
import MetaData from './metadata';

type MachineDataViewProps = {
  configId: string;
  selectedConfig: TreeFindStruct;
  parentConfig: ParentConfig;
  backendSaveParentConfig: Function;
  editingEnabled: boolean;
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

  const editable = props.editingEnabled;

  return (
    <div>
      <MetaData
        editingEnabled={editable}
        backendSaveMachineConfig={saveParentConfig}
        customConfig={editingConfig}
        configId={configId}
        selectedMachineConfig={undefined}
        rootMachineConfig={parentConfig}
        configType="target"
      />
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
            editingEnabled={editable}
          />
        </Col>
      </Row>
    </div>
  );
}
