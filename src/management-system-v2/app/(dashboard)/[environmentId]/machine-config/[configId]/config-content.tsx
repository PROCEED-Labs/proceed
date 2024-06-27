'use client';

import { ParentConfig } from '@/lib/data/machine-config-schema';

import { MenuUnfoldOutlined, MenuFoldOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { Button, Layout } from 'antd';
import ConfigEditor from './config-editor';
import ConfigurationTreeView from './machine-tree-view';

const { Sider } = Layout;

type VariablesEditorProps = {
  configId: string;
  originalMachineConfig: ParentConfig;
  backendSaveMachineConfig: Function;
  backendCreateMachineConfig: Function;
};

export default function ConfigContent(props: VariablesEditorProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<
    { parent: ParentConfig; selection: ParentConfig } | undefined
  >(undefined);

  const configId = props.configId;
  const saveMachineConfig = props.backendSaveMachineConfig;
  const machineConfig = { ...props.originalMachineConfig };

  useEffect(() => {
    setSelectedConfig({ parent: machineConfig, selection: machineConfig });
  }, []);

  const onSelectConfig = (relation: { parent: ParentConfig; selection: ParentConfig }) => {
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
              <ConfigurationTreeView
                onSelectConfig={onSelectConfig}
                backendSaveParentConfig={saveMachineConfig}
                configId={configId}
                parentConfig={machineConfig}
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
      <ConfigEditor
        backendSaveMachineConfig={saveMachineConfig}
        configId={configId}
        rootMachineConfig={machineConfig}
        selectedMachineConfig={selectedConfig}
      />
    </Layout>
  );
}
