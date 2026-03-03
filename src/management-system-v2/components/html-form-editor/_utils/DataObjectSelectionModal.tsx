import React, { useEffect, useState } from 'react';
import { Modal, Button, List, Tag, Tree, Tabs } from 'antd';
import type { DataNode } from 'antd/es/tree';
import { parseGlobalVariables, buildValueMap, GlobalVariableGroup } from '@/lib/helpers/global-data-objects';
import { getDeepConfigurationById } from '@/lib/data/db/machine-config';

import ProcessVariableForm from '@/app/(dashboard)/[environmentId]/processes/[mode]/[processId]/variable-definition/process-variable-form';
import { ProcessVariable, typeLabelMap } from '@/lib/process-variable-schema';
import useEditorStateStore from '../use-editor-state-store';
import { cachedValueMap } from '@/lib/helpers/global-data-objects';

type ScopeFilter = 'all' | '@worker' | '@process-initiator' | '@organization';

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (
    variable: string,
    isGlobal: boolean,
    variableType?: string,
    variableTextFormat?: string,
  ) => void;
};

// Build tree nodes from the raw config content
function buildTreeNodes(
  params: any[],
  pathPrefix: string,
  depth: number,
): DataNode[] {
  return params.map((param) => {
    const currentPath = pathPrefix ? `${pathPrefix}.${param.name}` : param.name;
    const hasChildren = param.subParameters?.length > 0;
    const isDataNode = param.name === 'data' && depth === 0;
    const isSelectable = !isDataNode;

    return {
      key: currentPath,
      title: param.displayName?.find((d: any) => d.language === 'en')?.text || param.name,
      selectable: isSelectable,
      children: hasChildren
        ? buildTreeNodes(param.subParameters, currentPath, depth + 1)
        : undefined,
    };
  });
}

function buildScopedTree(config: any, scope: ScopeFilter): DataNode[] {
  const content = config.content ?? [];
  const nodes: DataNode[] = [];

  for (const topLevel of content) {
    if (topLevel.name === 'organization') {
      if (scope !== 'all' && scope !== '@organization') continue;
      const children = buildTreeNodes(topLevel.subParameters, '@global.@organization', 0);
      if (scope === 'all') {
        nodes.push({
          key: '@global.@organization',
          title: 'Organization',
          selectable: false,
          children,
        });
      } else {
        nodes.push(...children);
      }
    } else if (topLevel.name === 'identity-and-access-management') {
      for (const iamChild of topLevel.subParameters) {
        if (iamChild.name === 'common-user-data') {
          if (scope !== 'all') continue;
          const children = buildTreeNodes(iamChild.subParameters, '@global.data', 0);
          nodes.push({
            key: '@global.data',
            title: 'data',
            selectable: false,
            children,
          });
        } else if (iamChild.name === 'user') {
          const userNode = iamChild.subParameters.find(
            (p: any) => p.name === '00000000-0000-0000-0000-000000000000',
          );
          if (!userNode) continue;

          if (scope === 'all' || scope === '@worker') {
            const children = buildTreeNodes(userNode.subParameters, '@global.@worker', 0);
            if (scope === 'all') {
              nodes.push({
                key: '@global.@worker',
                title: 'Worker',
                selectable: false,
                children,
              });
            } else {
              nodes.push(...children);
            }
          }

          if (scope === 'all' || scope === '@process-initiator') {
            const children = buildTreeNodes(userNode.subParameters, '@global.@process-initiator', 0);
            if (scope === 'all') {
              nodes.push({
                key: '@global.@process-initiator',
                title: 'Process Initiator',
                selectable: false,
                children,
              });
            } else {
              nodes.push(...children);
            }
          }
        }
      }
    }
  }

  return nodes;
}

const DataObjectSelectionModal: React.FC<Props> = ({ open, onClose, onSelect }) => {
  const [scope, setScope] = useState<ScopeFilter>('all');
  const [treeData, setTreeData] = useState<DataNode[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | undefined>();
  const [config, setConfig] = useState<any>(null);
  const [showVariableForm, setShowVariableForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'process' | 'global'>('process');
  const [selectedProcessVar, setSelectedProcessVar] = useState<string | undefined>();

  const { variables, updateVariables } = useEditorStateStore((state: any) => state);

useEffect(() => {
  if (!open) return;
  getDeepConfigurationById('97b9c04b-2b62-4a70-91da-3eb934509dd4').then((cfg) => {
    setConfig(cfg);
    setTreeData(buildScopedTree(cfg, 'all'));
    Object.assign(cachedValueMap, buildValueMap(cfg));
  });
}, [open]);

  useEffect(() => {
    if (!config) return;
    setTreeData(buildScopedTree(config, scope));
    setSelectedKey(undefined);
  }, [scope, config]);

const handleOk = () => {
  if (activeTab === 'process' && selectedProcessVar) {
    const variable = variables?.find((v: { name: string; }) => v.name === selectedProcessVar);
    onSelect(selectedProcessVar, false, variable?.dataType, variable?.textFormat);
  } else if (activeTab === 'global' && selectedKey) {
    onSelect(selectedKey, true);
  }
  onClose();
  setSelectedKey(undefined);
  setSelectedProcessVar(undefined);
};

  const scopeFilters: { label: string; value: ScopeFilter }[] = [
    { label: 'All', value: 'all' },
    { label: '@worker', value: '@worker' },
    { label: '@process-initiator', value: '@process-initiator' },
    { label: '@organization', value: '@organization' },
  ];

  return (
    <>
      <Modal
        title="Add Variable"
        open={open}
        onCancel={() => {
          onClose();
          setSelectedKey(undefined);
          setSelectedProcessVar(undefined);
        }}
        onOk={handleOk}
        okText="OK"
        cancelText="Cancel"
        okButtonProps={{
          disabled:
            (activeTab === 'process' && !selectedProcessVar) ||
            (activeTab === 'global' && !selectedKey),
        }}
        width={500}
      >
        <Tabs
          activeKey={activeTab}
          onChange={(key) => {
            setActiveTab(key as 'process' | 'global');
            setSelectedKey(undefined);
            setSelectedProcessVar(undefined);
          }}
          items={[
            {
              key: 'process',
              label: 'Process Variables',
              children: (
                <>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                    <Button onClick={() => setShowVariableForm(true)}>Add Variable</Button>
                  </div>
                  <List
                    bordered
                    style={{ maxHeight: 300, overflowY: 'auto' }}
                    dataSource={variables ?? []}
                    renderItem={(v: ProcessVariable) => (
                      <List.Item
                        style={{
                          cursor: 'pointer',
                          backgroundColor:
                            selectedProcessVar === v.name ? '#e6f4ff' : undefined,
                        }}
                        onClick={() => setSelectedProcessVar(v.name)}
                      >
                        <span>{v.name}</span>
                        <Tag style={{ marginLeft: 8 }}>{typeLabelMap[v.dataType]}</Tag>
                      </List.Item>
                    )}
                  />
                </>
              ),
            },
            {
              key: 'global',
              label: 'Global Data Object',
              children: (
                <>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                    {scopeFilters.map((f) => (
                      <Button
                        key={f.value}
                        type={scope === f.value ? 'primary' : 'default'}
                        size="small"
                        onClick={() => setScope(f.value)}
                      >
                        {f.label}
                      </Button>
                    ))}
                  </div>
                  <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid #d9d9d9', borderRadius: 6, padding: 8 }}>
                    <Tree
                      treeData={treeData}
                      selectedKeys={selectedKey ? [selectedKey] : []}
                      onSelect={(keys) => {
                        setSelectedKey(keys[0] as string | undefined);
                      }}
                      defaultExpandAll
                    />
                  </div>
                </>
              ),
            },
          ]}
        />
      </Modal>

      <ProcessVariableForm
        open={showVariableForm}
        variables={variables ?? []}
        onSubmit={(newVar) => {
          updateVariables([...(variables ?? []), newVar]);
          setShowVariableForm(false);
        }}
        onCancel={() => setShowVariableForm(false)}
      />
    </>
  );
};

export default DataObjectSelectionModal;