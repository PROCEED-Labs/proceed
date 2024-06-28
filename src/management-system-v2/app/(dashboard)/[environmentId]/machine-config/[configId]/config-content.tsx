'use client';

import { ParentConfig } from '@/lib/data/machine-config-schema';

import { MenuUnfoldOutlined, MenuFoldOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { Button, Layout } from 'antd';
import ConfigEditor from './config-editor';
import ConfigurationTreeView, { TreeFindStruct } from './machine-tree-view';
import { useRouter } from 'next/navigation';

const { Sider } = Layout;

type VariablesEditorProps = {
  configId: string;
  originalParentConfig: ParentConfig;
  backendSaveParentConfig: Function;
};

export default function ConfigContent(props: VariablesEditorProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const router = useRouter();
  const [selectedConfig, setSelectedConfig] = useState<TreeFindStruct>(undefined);

  const configId = props.configId;
  const saveConfig = props.backendSaveParentConfig;
  const [parentConfig, setParentConfig] = useState<ParentConfig>(props.originalParentConfig);

  useEffect(() => {
    setSelectedConfig({ parent: parentConfig, selection: parentConfig });
  }, []);

  const onSelectConfig = (relation: TreeFindStruct) => {
    setSelectedConfig(relation);
  };

  const treeOnUpdate = (editedConfig: ParentConfig) => {
    const date = new Date().toUTCString();
    router.refresh();
    setLastUpdate(date);
    setParentConfig(editedConfig);
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
                onUpdate={treeOnUpdate}
                onSelectConfig={onSelectConfig}
                backendSaveParentConfig={saveConfig}
                configId={configId}
                parentConfig={parentConfig}
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
        backendSaveParentConfig={saveConfig}
        configId={configId}
        parentConfig={parentConfig}
        selectedConfig={selectedConfig}
      />
    </Layout>
  );
}
