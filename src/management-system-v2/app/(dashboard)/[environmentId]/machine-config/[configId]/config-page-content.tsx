'use client';

import { AbstractConfig, ParentConfig } from '@/lib/data/machine-config-schema';

import { MenuUnfoldOutlined, MenuFoldOutlined } from '@ant-design/icons';
import { useEffect, useMemo, useState } from 'react';
import { Button, Col, Layout, Row } from 'antd';
import ConfigEditor from './config-editor';
import ConfigurationTreeView from './config-tree-view';
import { findConfig, findParameter } from '../configuration-helper';
// TODO
// @ts-ignore
import { ResizableBox, ResizeEvent, ResizeCallbackData } from 'react-resizable';
import React from 'react';
import styles from './page.module.scss';
import CustomField from './custom-field';
import { useUserPreferences } from '@/lib/user-preferences';

const collapsedWidth = 70;

type VariablesEditorProps = {
  originalParentConfig: ParentConfig;
};

const ConfigContent: React.FC<VariablesEditorProps> = ({ originalParentConfig }) => {
  const [selectionId, setSelectionId] = useState('');
  const [selectionType, setSelectionType] = useState<AbstractConfig['type'] | 'parameter'>(
    'config',
  );

  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const [editable, setEditable] = useState(false);

  const setPreferences = useUserPreferences.use.addPreferences();
  const { siderOpen, siderWidth } = useUserPreferences.use['tech-data-editor']();

  const handleCollapse = () => {
    setPreferences({
      'tech-data-editor': { siderOpen: !siderOpen, siderWidth: !siderOpen ? 300 : collapsedWidth },
    });
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
        width={!siderOpen ? collapsedWidth : siderWidth}
        axis="x"
        minConstraints={[collapsedWidth, 0]}
        maxConstraints={[window.innerWidth / 2, Infinity]}
        resizeHandles={['e']}
        handle={siderOpen && <div className={styles.CustomHandle} />}
        onResizeStop={(_: ResizeEvent, { size }: ResizeCallbackData) => {
          // Collapse when the width is less than or equal to collapsedWidth
          setPreferences({
            'tech-data-editor': { siderOpen: size.width > collapsedWidth, siderWidth: size.width },
          });
        }}
        style={{
          border: siderOpen ? '1px solid #ddd' : undefined,
          background: siderOpen ? '#fff' : undefined,
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
          {!siderOpen ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        </Button>
        {siderOpen && (
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
