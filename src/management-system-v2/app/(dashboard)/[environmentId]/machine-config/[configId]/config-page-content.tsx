'use client';

import { AbstractConfig, ParentConfig } from '@/lib/data/machine-config-schema';

import { MenuUnfoldOutlined, MenuFoldOutlined } from '@ant-design/icons';
import { useEffect, useMemo, useState } from 'react';
import { Button, Col, Layout, Row } from 'antd';
import ConfigEditor from './config-editor';
import ConfigurationTreeView from './config-tree-view';
import { useRouter } from 'next/navigation';
import { findConfig, findParameter } from '../configuration-helper';
// TODO
// @ts-ignore
import { ResizableBox, ResizeEvent, ResizeCallbackData } from 'react-resizable';
import React from 'react';
import styles from './page.module.scss';
import CustomField from './custom-field';

const initialWidth = 300;
const collapsedWidth = 70;

type VariablesEditorProps = {
  originalParentConfig: ParentConfig;
};

const ConfigContent: React.FC<VariablesEditorProps> = ({ originalParentConfig }) => {
  const [collapsed, setCollapsed] = useState(false);

  const [selectionId, setSelectionId] = useState('');
  const [selectionType, setSelectionType] = useState<AbstractConfig['type'] | 'parameter'>(
    'config',
  );

  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const [editable, setEditable] = useState(false);

  const [width, setWidth] = useState(initialWidth);

  const handleCollapse = () => {
    if (collapsed) {
      setWidth(initialWidth);
    } else {
      setWidth(collapsedWidth);
    }
    setCollapsed(!collapsed);
  };

  const selectedNode = useMemo(() => {
    if (!selectionId || selectionType === 'config') return originalParentConfig;

    let node;
    if (selectionType === 'parameter') {
      const ref = findParameter(selectionId, originalParentConfig, 'config');
      if (ref) node = ref.selection;
    } else {
      const ref = findConfig(selectionId, originalParentConfig);
      if (ref) node = ref.selection;
    }

    return node || originalParentConfig;
  }, [selectionId, selectionType, originalParentConfig]);

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
        onResizeStop={(_: ResizeEvent, { size }: ResizeCallbackData) => {
          setWidth(size.width);
          // Collapse when the width is less than or equal to collapsedWidth
          setCollapsed(size.width <= collapsedWidth);
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
              onChangeSelection={(selection) => {
                setSelectionId(selection ? selection.id : '');
                setSelectionType(selection ? selection.type : 'config');
              }}
              parentConfig={originalParentConfig}
            />
          </div>
        )}
      </ResizableBox>
      <Row style={{ flexGrow: 1, flexShrink: 1 }}>
        <Col style={{ width: '100%' }}>
          {'content' in selectedNode ? (
            <>
              {Object.entries(selectedNode.parameters).map(([key, val]) => (
                <CustomField
                  parentConfig={originalParentConfig}
                  key={key}
                  keyId={key}
                  parameter={val}
                  editable={editable}
                />
              ))}
            </>
          ) : (
            <ConfigEditor
              editable={editable}
              onChangeEditable={setEditable}
              parentConfig={originalParentConfig}
              selectedConfig={selectedNode as AbstractConfig}
            />
          )}
        </Col>
      </Row>
    </Layout>
  );
};

export default ConfigContent;
