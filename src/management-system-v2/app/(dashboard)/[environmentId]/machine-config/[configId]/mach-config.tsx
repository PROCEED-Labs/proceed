'use client';

import { MachineConfig, ParentConfig } from '@/lib/data/machine-config-schema';
import { useRouter, useSearchParams } from 'next/navigation';

import { KeyOutlined, UserOutlined, DeleteOutlined, CaretRightOutlined } from '@ant-design/icons';
import TextArea from 'antd/es/input/TextArea';
import { useEffect, useRef, useState } from 'react';
import { Button, Input, Space, Col, Row, Tooltip, Collapse, Dropdown, theme } from 'antd';
import useMobileModeler from '@/lib/useMobileModeler';
import { useEnvironment } from '@/components/auth-can';
import { TreeFindStruct, defaultConfiguration, findConfig } from '../configuration-helper';
import Parameters from './parameter';
import getTooltips from './getTooltips';
import MetaData from './metadata';

type MachineDataViewProps = {
  configId: string;
  selectedConfig: TreeFindStruct;
  parentConfig: ParentConfig;
  backendSaveParentConfig: Function;
  editingEnabled: boolean;
};

const LATEST_VERSION = { version: -1, name: 'Latest Version', description: '' };

export default function MachineConfigurations(props: MachineDataViewProps) {
  const router = useRouter();
  const environment = useEnvironment();
  const query = useSearchParams();

  const firstRender = useRef(true);
  const parentConfig = { ...props.parentConfig };
  const saveParentConfig = props.backendSaveParentConfig;
  const configId = props.configId;
  const editingConfig = props.selectedConfig
    ? { ...props.selectedConfig.selection }
    : defaultConfiguration();

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
  }, [props.selectedConfig]);

  const showMobileView = useMobileModeler();

  const editable = props.editingEnabled;

  const childConfigContent = (machineConfigData: MachineConfig) => (
    <div>
      <MetaData
        editingEnabled={editable}
        backendSaveMachineConfig={saveParentConfig}
        customConfig={machineConfigData}
        configId={configId}
        selectedMachineConfig={undefined}
        rootMachineConfig={parentConfig}
      />
      <Parameters
        backendSaveParentConfig={saveParentConfig}
        configId={configId}
        parentConfig={parentConfig}
        selectedConfig={{ parent: parentConfig, selection: machineConfigData }}
        editingEnabled={editable}
      />
    </div>
  );

  const { token } = theme.useToken();
  const panelStyle = {
    marginBottom: 24,
    background: token.colorFillAlter,
    borderRadius: token.borderRadiusLG,
    border: 'none',
  };

  const getItems = (panelStyle: {
    marginBottom: number;
    background: string;
    borderRadius: number;
    border: string;
  }): any => {
    let list = [];
    for (let machineConfig of parentConfig.machineConfigs) {
      list.push({
        key: machineConfig.id,
        label: machineConfig.name,
        children: [childConfigContent(machineConfig)],
        extra: getTooltips(editable, ['edit', 'copy', 'delete']),
        style: panelStyle,
      });
    }
    return list;
  };

  return (
    <Collapse
      bordered={false}
      expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} />}
      style={{
        background: 'none',
      }}
      items={getItems(panelStyle)}
    />
  );
}
