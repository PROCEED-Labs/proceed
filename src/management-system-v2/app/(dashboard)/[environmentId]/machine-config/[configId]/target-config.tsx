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

  const parentConfig = { ...props.parentConfig };
  const editingConfig = props.parentConfig.targetConfig
    ? { ...props.parentConfig.targetConfig }
    : defaultConfiguration();
  let refEditingConfig = findConfig(editingConfig.id, parentConfig);
  const saveParentConfig = props.backendSaveParentConfig;
  const configId = props.configId;
  const selectedVersionId = query.get('version');

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
  }, [props.selectedConfig]);

  const showMobileView = useMobileModeler();

  const editable = props.editingEnabled;

  return (
    <div>
      <MetaData
        editingEnabled={editable}
        backendSaveMachineConfig={saveParentConfig}
        customConfig={parentConfig.targetConfig}
        configId={configId}
        selectedMachineConfig={undefined}
        rootMachineConfig={parentConfig}
      />
      <Parameters
        parentConfig={parentConfig}
        backendSaveParentConfig={saveParentConfig}
        configId={configId}
        selectedConfig={{ parent: parentConfig, selection: editingConfig }}
        editingEnabled={editable}
      />
    </div>
  );
}
