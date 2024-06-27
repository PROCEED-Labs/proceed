'use client';

import { ParentConfig } from '@/lib/data/machine-config-schema';

import { MenuUnfoldOutlined, MenuFoldOutlined } from '@ant-design/icons';
import { useEffect, useRef, useState } from 'react';
import { Button, Layout, Typography } from 'antd';
import ConfigurationTreeView from './machine-tree-view';
import MachineDataEditor from './machine-metadata-editor';

const { Sider } = Layout;

type VariablesEditorProps = {
  configId: string;
  originalParentConfig: ParentConfig;
  backendSaveParentConfig: Function;
  backendCreateParentConfig: Function;
};

export default function ParentConfigEditor(props: VariablesEditorProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<
    { parent: ParentConfig; selection: ParentConfig } | undefined
  >(undefined);

  const configId = props.configId;
  const saveParentConfig = props.backendSaveParentConfig;
  const machineConfig = { ...props.originalParentConfig };

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
                backendSaveParentConfig={saveParentConfig}
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
      <MachineDataEditor
        backendSaveConfig={saveParentConfig}
        configId={configId}
        parentConfig={machineConfig}
        selectedConfig={selectedConfig}
      />
    </Layout>
  );
}
