'use client';

import { MachineConfig } from '@/lib/data/machine-config-schema';

import { MenuUnfoldOutlined, MenuFoldOutlined } from '@ant-design/icons';
import { useEffect, useRef, useState } from 'react';
import { Button, Layout, Typography } from 'antd';
import MachineTreeView from './machine-tree-view';
import MachineDataEditor from './machine-metadata-editor';

const { Sider } = Layout;

type VariablesEditorProps = {
  configId: string;
  originalMachineConfig: MachineConfig;
  backendSaveMachineConfig: Function;
  backendCreateMachineConfig: Function;
};

export default function MachineConfigEditor(props: VariablesEditorProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<
    { parent: MachineConfig; selection: MachineConfig } | undefined
  >(undefined);

  const configId = props.configId;
  const saveMachineConfig = props.backendSaveMachineConfig;
  const machineConfig = { ...props.originalMachineConfig };

  useEffect(() => {
    setSelectedConfig({ parent: machineConfig, selection: machineConfig });
  }, []);

  const onSelectConfig = (relation: { parent: MachineConfig; selection: MachineConfig }) => {
    setSelectedConfig(relation);
  };

  return (
    <Layout style={{ height: '100vh' }}>
      <Sider
        collapsed={collapsed}
        onCollapse={setCollapsed}
        width={300}
        trigger={null}
        style={{ background: '#fff', display: collapsed ? 'none' : 'block' }}
      >
        <div style={{ width: '100%', padding: '0' }}>
          {!collapsed && (
            <>
              <MachineTreeView
                onSelectConfig={onSelectConfig}
                backendSaveMachineConfig={saveMachineConfig}
                configId={configId}
                originalMachineConfig={machineConfig}
              />
            </>
          )}
        </div>
      </Sider>
      <Button
        type="text"
        icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        onClick={() => setCollapsed(!collapsed)}
        style={{ fontSize: '24px' }}
      />
      <MachineDataEditor
        backendSaveMachineConfig={saveMachineConfig}
        configId={configId}
        rootMachineConfig={machineConfig}
        selectedMachineConfig={selectedConfig}
      />
    </Layout>
  );
}
