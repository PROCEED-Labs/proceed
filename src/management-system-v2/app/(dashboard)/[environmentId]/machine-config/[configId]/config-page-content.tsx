'use client';

import { ParentConfig, TargetConfig } from '@/lib/data/machine-config-schema';

import { MenuUnfoldOutlined, MenuFoldOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { Button, Layout } from 'antd';
import ConfigEditor from './config-editor';
import ConfigurationTreeView from './config-tree-view';
import { useRouter } from 'next/navigation';
import { TreeFindParameterStruct, TreeFindStruct } from '../configuration-helper';
// TODO
// @ts-ignore
import { ResizableBox, ResizeEvent, ResizeCallbackData } from 'react-resizable';
import React from 'react';
import Content from './config-content';
import styles from './page.module.scss';

const initialWidth = 300;
const collapsedWidth = 70;

type VariablesEditorProps = {
  configId: string;
  originalParentConfig: ParentConfig;
  backendSaveParentConfig: Function;
};

const ConfigContent: React.FC<VariablesEditorProps> = ({
  configId,
  originalParentConfig,
  backendSaveParentConfig,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();

  const [selectedConfig, setSelectedConfig] = useState<TreeFindStruct | TreeFindParameterStruct>({
    selection: originalParentConfig,
    parent: originalParentConfig,
  });

  const [parentConfig, setParentConfig] = useState<ParentConfig>(originalParentConfig);
  const [isClient, setIsClient] = useState(false);

  const save = async (...args: any[]) => {
    await backendSaveParentConfig(...args);
    router.refresh();
  };

  useEffect(() => {
    setIsClient(true);
  }, []);
  const onSelectConfig = (relation: TreeFindStruct | TreeFindParameterStruct) => {
    setSelectedConfig(relation);
  };

  const treeOnUpdate = (editedConfig: ParentConfig) => {
    router.refresh();
    setParentConfig(editedConfig);
  };
  const [editable, setEditable] = useState(false);

  const onChangeMode = (_editable: boolean) => {
    setEditable(_editable);
  };
  const [width, setWidth] = useState(initialWidth);

  const handleCollapse = () => {
    if (collapsed) {
      setWidth(initialWidth);
    } else {
      setWidth(collapsedWidth);
    }
    setCollapsed(!collapsed);
  };
  if (!isClient) {
    return null;
  }
  return (
    <Layout className={styles.ConfigEditor}>
      <ResizableBox
        className={styles.CustomBox}
        width={collapsed ? collapsedWidth : width}
        axis="x"
        minConstraints={[collapsedWidth, 0]}
        maxConstraints={[window.innerWidth / 2, Infinity]}
        resizeHandles={['e']}
        handle={!collapsed && <div className={styles.CustomHandle} />}
        onResizeStop={(event: ResizeEvent, { size }: ResizeCallbackData) => {
          setWidth(size.width);
          if (size.width <= collapsedWidth) {
            setCollapsed(true); // Collapse when the width is less than or equal to collapsedWidth
          } else {
            setCollapsed(false); // Ensure tree is visible when expanded via handle
          }
        }}
        style={{
          border: !collapsed ? '1px solid #ddd' : undefined,
          background: !collapsed ? '#fff' : undefined,
        }}
      >
        <Button
          className={styles.CustomBoxButton}
          type="default"
          onClick={handleCollapse}
          style={{
            right: 10,
          }}
        >
          {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        </Button>
        {!collapsed && (
          <div className={styles.CustomBoxContentWrapper}>
            <ConfigurationTreeView
              editable={editable}
              onUpdate={treeOnUpdate}
              onSelectConfig={onSelectConfig}
              backendSaveParentConfig={save}
              configId={configId}
              parentConfig={parentConfig}
            />
          </div>
        )}
      </ResizableBox>
      {selectedConfig?.selection && !('content' in selectedConfig?.selection) ? (
        <ConfigEditor
          onChangeMode={onChangeMode}
          backendSaveParentConfig={save}
          configId={configId}
          parentConfig={parentConfig}
          selectedConfig={selectedConfig as TreeFindStruct}
        />
      ) : (
        <Content
          backendSaveParentConfig={save}
          configId={configId}
          contentType="parameters"
          editingEnabled={editable}
          parentConfig={parentConfig}
          selectedMachineConfig={undefined}
          customConfig={selectedConfig?.selection as TargetConfig}
        />
      )}
    </Layout>
  );
};

export default ConfigContent;
