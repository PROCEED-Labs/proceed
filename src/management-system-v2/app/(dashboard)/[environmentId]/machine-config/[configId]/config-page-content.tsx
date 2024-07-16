'use client';

import { ParentConfig, AbstractConfig } from '@/lib/data/machine-config-schema';

import { MenuUnfoldOutlined, MenuFoldOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { Button, Layout } from 'antd';
import ConfigEditor from './config-editor';
import ConfigurationTreeView from './config-tree-view';
import { useRouter } from 'next/navigation';
import { TreeFindParameterStruct, TreeFindStruct } from '../configuration-helper';
import { ResizableBox, ResizeEvent, ResizeCallbackData } from 'react-resizable';
import React from 'react';
import './ConfigContent.css';

const initialWidth = 300; // Initial width
const collapsedWidth = 70; // Width when collapsed

type VariablesEditorProps = {
  configId: string;
  originalParentConfig: ParentConfig;
  backendSaveParentConfig: Function;
};

export default function ConfigContent(props: VariablesEditorProps) {
  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();
  const [selectedConfig, setSelectedConfig] = useState<TreeFindStruct | TreeFindParameterStruct>({
    selection: props.originalParentConfig,
    parent: props.originalParentConfig,
  });

  const configId = props.configId;
  const saveConfig = props.backendSaveParentConfig;
  const [parentConfig, setParentConfig] = useState<ParentConfig>(props.originalParentConfig);

  useEffect(() => {
    setSelectedConfig({ parent: parentConfig, selection: parentConfig });
  }, [parentConfig]);

  const onSelectConfig = (relation: TreeFindStruct | TreeFindParameterStruct) => {
    setSelectedConfig(relation);
  };

  const treeOnUpdate = (editedConfig: ParentConfig) => {
    router.refresh();
    setParentConfig(editedConfig);
  };
  const [width, setWidth] = useState(initialWidth);

  const handleResize = (delta: number) => {
    setWidth((prevWidth: number) => {
      const newWidth = prevWidth + delta;
      const maxWidth = window.innerWidth / 2;
      const minWidth = 200;
      if (newWidth > collapsedWidth) {
        setCollapsed(false);
      }
      return Math.min(Math.max(newWidth, minWidth), maxWidth);
    });
  };

  const handleCollapse = () => {
    if (collapsed) {
      setWidth(initialWidth);
    } else {
      setWidth(collapsedWidth);
    }
    setCollapsed(!collapsed);
  };

  return (
    <Layout style={{ height: '100vh', display: 'flex', flexDirection: 'row' }}>
      <ResizableBox
        className="custom-box"
        width={collapsed ? collapsedWidth : width}
        height={Infinity}
        axis="x"
        minConstraints={[collapsedWidth, 0]}
        maxConstraints={[window.innerWidth / 2, Infinity]}
        resizeHandles={['e']}
        handle={
          !collapsed && (
            <div
              className="custom-handle"
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '8px',
                height: '100%',
                cursor: 'col-resize',
                zIndex: 1,
              }}
              onMouseDown={(e) => {
                let startX = e.clientX;
                const onMouseMove = (event: { clientX: number }) => {
                  const delta = event.clientX - startX;
                  handleResize(delta);
                  startX = event.clientX;
                };
                const onMouseUp = () => {
                  document.removeEventListener('mousemove', onMouseMove);
                  document.removeEventListener('mouseup', onMouseUp);
                };
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
              }}
            />
          )
        }
        onResizeStop={(event: ResizeEvent, { size }: ResizeCallbackData) => {
          setWidth(size.width);
          if (size.width <= collapsedWidth) {
            setCollapsed(true); // Collapse when the width is less than or equal to collapsedWidth
          } else {
            setCollapsed(false); // Ensure tree is visible when expanded via handle
          }
        }}
        style={{
          border: collapsed ? 'none' : '1px solid #ddd',
          padding: '0',
          background: collapsed ? 'none' : '#fff',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'auto',
          height: '100vh',
        }}
      >
        <Button
          type="default"
          onClick={handleCollapse}
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            zIndex: 2,
          }}
        >
          {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        </Button>
        {!collapsed && (
          <div className="content-wrapper">
            <ConfigurationTreeView
              onUpdate={treeOnUpdate}
              onSelectConfig={onSelectConfig}
              backendSaveParentConfig={saveConfig}
              configId={configId}
              parentConfig={parentConfig}
            />
          </div>
        )}
      </ResizableBox>
      {selectedConfig?.selection && !('content' in selectedConfig?.selection) ? (
        <ConfigEditor
          backendSaveParentConfig={saveConfig}
          configId={configId}
          parentConfig={parentConfig}
          selectedConfig={selectedConfig as TreeFindStruct}
        />
      ) : (
        <div></div>
      )}
    </Layout>
  );
}
