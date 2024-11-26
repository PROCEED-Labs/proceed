'use client';

import {
  AbstractConfig,
  MachineConfig,
  Parameter,
  ParentConfig,
  TargetConfig,
} from '@/lib/data/machine-config-schema';

import { MenuUnfoldOutlined, MenuFoldOutlined } from '@ant-design/icons';
import { useEffect, useMemo, useState } from 'react';
import { Button, Col, Layout, Row, Space, Tag, Tooltip, TreeDataNode } from 'antd';
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
import { FaFolderTree } from 'react-icons/fa6';

const collapsedWidth = 70;

type VariablesEditorProps = {
  parentConfig: ParentConfig;
  editingAllowed: boolean;
};

const ParameterTreeNode: React.FC<{
  keyId: string;
  parameter: Parameter;
  type: 'parameter' | 'metadata';
}> = ({ keyId, parameter, type }) => {
  const colorMap = { parameter: 'green', metadata: 'cyan' };
  let node = (
    <>
      <Tag color={colorMap[type]}>P</Tag>
      {keyId}
    </>
  );

  if (parameter.content && parameter.content.length > 0) {
    const { displayName, value, unit, language } = parameter.content[0];
    node = (
      <Tooltip
        placement="right"
        title={
          <Space size={3}>
            {displayName}:{value} {unit}({language})
          </Space>
        }
      >
        {node}
      </Tooltip>
    );
  }

  return node;
};

const ConfigTreeNode: React.FC<{ config: AbstractConfig }> = ({ config }) => {
  const colorMap = { config: 'purple', 'machine-config': 'geekblue', 'target-config': 'blue' };
  const charMap = { config: 'C', 'machine-config': 'M', 'target-config': 'T' };

  return (
    <>
      <Tag color={colorMap[config.type]}>{charMap[config.type]}</Tag>
      {config.name}
    </>
  );
};

const ConfigContent: React.FC<VariablesEditorProps> = ({ parentConfig, editingAllowed }) => {
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
    if (!selectionId || selectionType === 'config') return parentConfig;

    let node;
    if (selectionType === 'parameter') {
      const ref = findParameter(selectionId, parentConfig, 'config');
      if (ref) node = ref.selection;
    } else {
      const ref = findConfig(selectionId, parentConfig);
      if (ref) node = ref.selection;
    }

    return node || parentConfig;
  }, [selectionId, selectionType, parentConfig]);

  const setUserPreferences = useUserPreferences.use.addPreferences();
  const openTreeItemsInConfigs = useUserPreferences.use['tech-data-open-tree-items']();
  const configOpenItems = openTreeItemsInConfigs.find(({ id }) => id === parentConfig.id);

  const expandedKeys = configOpenItems ? configOpenItems.open : [];

  const treeData = useMemo(() => {
    function parameterToTree(
      key: string,
      parameter: Parameter,
      type: 'parameter' | 'metadata',
    ): TreeDataNode {
      let children: TreeDataNode[] = Object.entries(parameter.parameters).map(
        ([key, childParameter]) => parameterToTree(key, childParameter, 'parameter'),
      );
      return {
        title: <ParameterTreeNode keyId={key} parameter={parameter} type={type} />,
        key: parameter.id + '|parameter',
        children,
      };
    }

    function configToTree(config: AbstractConfig): TreeDataNode {
      let children: TreeDataNode[] = Object.entries(config.metadata).map(([key, parameter]) =>
        parameterToTree(key, parameter, 'metadata'),
      );

      if (config.type !== 'config') {
        children = children.concat(
          Object.entries((config as TargetConfig | MachineConfig).parameters).map(
            ([key, parameter]) => parameterToTree(key, parameter, 'parameter'),
          ),
        );
      } else {
        const parentConfig = config as ParentConfig;
        if (parentConfig.targetConfig) children.push(configToTree(parentConfig.targetConfig));
        children = children.concat(
          parentConfig.machineConfigs.map((machineConfig) => configToTree(machineConfig)),
        );
      }

      return {
        title: <ConfigTreeNode config={config} />,
        key: config.id + '|' + config.type,
        children,
      };
    }

    return [configToTree(parentConfig)];
  }, [parentConfig]);

  const getAllKeys = (data: TreeDataNode[]): React.Key[] => {
    let keys: React.Key[] = [];
    data.forEach((item) => {
      keys.push(item.key);
      if (item.children) {
        keys = keys.concat(getAllKeys(item.children));
      }
    });
    return keys;
  };

  const expandAllNodes = () => {
    setUserPreferences({
      'tech-data-open-tree-items': [
        ...openTreeItemsInConfigs.filter(({ id }) => id !== parentConfig.id),
        { id: parentConfig.id, open: getAllKeys(treeData).map((key) => key.toString()) },
      ],
    });
  };

  const collapseAllNodes = () => {
    setUserPreferences({
      'tech-data-open-tree-items': openTreeItemsInConfigs.filter(
        ({ id }) => id !== parentConfig.id,
      ),
    });
  };

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
        <div className={styles.SiderActions}>
          <Button className={styles.CustomBoxButton} type="default" onClick={handleCollapse}>
            {!siderOpen ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </Button>

          {siderOpen && (
            <Button
              type="default"
              className={styles.CustomBoxButton}
              onClick={() => {
                if (expandedKeys.length === 0) {
                  expandAllNodes();
                } else {
                  collapseAllNodes();
                }
              }}
            >
              <FaFolderTree />
            </Button>
          )}
        </div>

        {siderOpen && (
          <div className={styles.CustomBoxContentWrapper}>
            <ConfigurationTreeView
              parentConfig={parentConfig}
              editable={editable && editingAllowed}
              treeData={treeData}
              expandedKeys={expandedKeys}
              onExpandedChange={(newExpanded) => {
                console.log(newExpanded);
                setUserPreferences({
                  'tech-data-open-tree-items': [
                    ...openTreeItemsInConfigs.filter(({ id }) => id !== parentConfig.id),
                    { id: parentConfig.id, open: newExpanded },
                  ],
                });
              }}
              onChangeSelection={(selection) => {
                setSelectionId(selection ? selection.id : '');
                setSelectionType(selection ? selection.type : 'config');
              }}
            />
          </div>
        )}
      </ResizableBox>
      <Row style={{ flexGrow: 1, flexShrink: 1 }}>
        <Col style={{ width: '100%', height: '100%' }}>
          {'content' in selectedNode ? (
            <>
              {Object.entries(selectedNode.parameters).map(([key, val]) => (
                <CustomField
                  parentConfig={parentConfig}
                  key={key}
                  keyId={key}
                  parameter={val}
                  editable={editable && editingAllowed}
                />
              ))}
            </>
          ) : (
            <ConfigEditor
              editable={editable && editingAllowed}
              editingAllowed={editingAllowed}
              onChangeEditable={setEditable}
              parentConfig={parentConfig}
              selectedConfig={selectedNode as AbstractConfig}
            />
          )}
        </Col>
      </Row>
    </Layout>
  );
};

export default ConfigContent;
