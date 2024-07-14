'use client';

import { ParentConfig } from '@/lib/data/machine-config-schema';
import { useRouter, useSearchParams } from 'next/navigation';

import { useEffect, useRef, useState } from 'react';
import useMobileModeler from '@/lib/useMobileModeler';
import { useEnvironment } from '@/components/auth-can';
import { TreeFindStruct, defaultConfiguration, findConfig } from '../configuration-helper';
import Content from './config-content';

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
      <Content
        contentType="metadata"
        editingEnabled={editable}
        backendSaveMachineConfig={saveParentConfig}
        customConfig={parentConfig.targetConfig}
        configId={configId}
        selectedMachineConfig={undefined}
        rootMachineConfig={parentConfig}
      />
      <Content
        contentType="parameters"
        editingEnabled={editable}
        backendSaveMachineConfig={saveParentConfig}
        customConfig={parentConfig.targetConfig}
        configId={configId}
        selectedMachineConfig={undefined}
        rootMachineConfig={parentConfig}
      />
    </div>
  );
}
