import React, { useEffect, useState } from 'react';
import { Modal, Button, List, Tag, Tree, Tabs } from 'antd';
import type { DataNode } from 'antd/es/tree';
import { buildScopedTree, ScopeFilter } from '@/lib/helpers/global-data-tree';
import { getDeepConfigurationById } from '@/lib/data/db/machine-config';
import ProcessVariableForm from '@/app/(dashboard)/[environmentId]/processes/[mode]/[processId]/variable-definition/process-variable-form';
import { ProcessVariable, typeLabelMap } from '@/lib/process-variable-schema';
import useEditorStateStore from '../use-editor-state-store';
import { useEnvironment } from '@/components/auth-can';

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

const DataObjectSelectionModal: React.FC<Props> = ({ open, onClose, onSelect }) => {
  const environment = useEnvironment();
  const [scope, setScope] = useState<ScopeFilter>('@worker');
  const [treeData, setTreeData] = useState<DataNode[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | undefined>();
  const [config, setConfig] = useState<any>(null);
  const [showVariableForm, setShowVariableForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'process' | 'global'>('process');
  const [selectedProcessVar, setSelectedProcessVar] = useState<string | undefined>();
  const { variables, updateVariables } = useEditorStateStore((state: any) => state);

  useEffect(() => {
    if (!open) return;
    getDeepConfigurationById(environment.spaceId).then((cfg) => {
      setConfig(cfg);
      setTreeData(buildScopedTree(cfg, '@worker')); // default to @worker
    });
  }, [open]);

  useEffect(() => {
    if (!config) return;
    setTreeData(buildScopedTree(config, scope));
    setSelectedKey(undefined);
  }, [scope, config]);

  const handleOk = () => {
    if (activeTab === 'process' && selectedProcessVar) {
      const variable = variables?.find((v: { name: string }) => v.name === selectedProcessVar);
      onSelect(selectedProcessVar, false, variable?.dataType, variable?.textFormat);
    } else if (activeTab === 'global' && selectedKey) {
      onSelect(selectedKey, true);
    }
    onClose();
    setSelectedKey(undefined);
    setSelectedProcessVar(undefined);
  };

  const scopeFilters: { label: string; value: ScopeFilter }[] = [
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
                          backgroundColor: selectedProcessVar === v.name ? '#e6f4ff' : undefined,
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
                  <div
                    style={{
                      maxHeight: 300,
                      overflowY: 'auto',
                      border: '1px solid #d9d9d9',
                      borderRadius: 6,
                      padding: 8,
                    }}
                  >
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
