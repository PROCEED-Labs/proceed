'use client';

import { ParentConfig } from '@/lib/data/machine-config-schema';
import { useRouter, useSearchParams } from 'next/navigation';

import { Collapse, theme } from 'antd';
import { CaretRightOutlined } from '@ant-design/icons';
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

  const { token } = theme.useToken();
  const panelStyle = {
    marginBottom: 20,
    background: token.colorFillAlter,
    borderRadius: token.borderRadiusLG,
    //border: 'none',
  };

  const getContentItems = (panelStyle: {
    marginBottom: number;
    background: string;
    borderRadius: number;
    //border: string;
  }): any => {
    const contentItems = [];
    if (
      parentConfig.targetConfig &&
      (editable ||
        (parentConfig.targetConfig.metadata &&
          Object.keys(parentConfig.targetConfig.metadata).length > 0))
    ) {
      contentItems.push({
        key: 'meta',
        label: 'Meta Data',
        children: [
          <Content
            contentType="metadata"
            editingEnabled={editable}
            backendSaveParentConfig={saveParentConfig}
            customConfig={parentConfig.targetConfig}
            configId={configId}
            selectedMachineConfig={undefined}
            rootMachineConfig={parentConfig}
          />,
        ],
        style: { ...panelStyle, border: '1px solid #87e8de' }, //cyan-3
      });
    }
    if (
      parentConfig.targetConfig &&
      (editable ||
        (parentConfig.targetConfig.parameters &&
          Object.keys(parentConfig.targetConfig.parameters).length > 0))
    ) {
      contentItems.push({
        key: 'param',
        label: 'Parameters',
        children: [
          <Content
            contentType="parameters"
            editingEnabled={editable}
            backendSaveParentConfig={saveParentConfig}
            customConfig={parentConfig.targetConfig}
            configId={configId}
            selectedMachineConfig={undefined}
            rootMachineConfig={parentConfig}
          />,
        ],
        style: { ...panelStyle, border: '1px solid #b7eb8f' }, //green-3
      });
    }
    return contentItems;
  };

  const activeKeys = [];
  if (
    parentConfig.targetConfig &&
    (editable ||
      (parentConfig.targetConfig.metadata &&
        Object.keys(parentConfig.targetConfig.metadata).length > 0))
  ) {
    activeKeys.push('meta');
  }
  if (
    parentConfig.targetConfig &&
    (editable ||
      (parentConfig.targetConfig.parameters &&
        Object.keys(parentConfig.targetConfig.parameters).length > 0))
  ) {
    activeKeys.push('param');
  }

  return (
    <Collapse
      bordered={false}
      expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} />}
      defaultActiveKey={activeKeys}
      style={{
        background: 'none',
      }}
      items={getContentItems(panelStyle)}
    />
  );
}
