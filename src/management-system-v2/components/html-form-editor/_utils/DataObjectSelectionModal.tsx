import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Button, List, Tag, Tree, Tabs } from 'antd';
import type { DataNode } from 'antd/es/tree';
import { buildScopedTree, ScopeFilter } from '@/lib/helpers/global-data-tree';
import { getDeepConfigurationById } from '@/lib/data/db/machine-config';
import ProcessVariableForm from '@/app/(dashboard)/[environmentId]/processes/[mode]/[processId]/variable-definition/process-variable-form';
import { ProcessVariable, textFormatMap, typeLabelMap } from '@/lib/process-variable-schema';
import useEditorStateStore from '../use-editor-state-store';
import { useEnvironment } from '@/components/auth-can';
import { useQuery } from '@tanstack/react-query';

type AllowedTypes = React.ComponentProps<typeof ProcessVariableForm>['allowedTypes'];

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (
    variable: string,
    variableType?: NonNullable<AllowedTypes>[number],
    variableTextFormat?: keyof typeof textFormatMap,
  ) => void;
  allowedTypes?: AllowedTypes;
  currentVariable?: string;
};

const detectScope = (variable: string): ScopeFilter => {
  if (variable.includes('@process-initiator')) {
    return '@process-initiator';
  }

  if (variable.includes('@organization')) {
    return '@organization';
  }

  return '@worker';
};

const DataObjectSelectionModal: React.FC<Props> = ({
  open,
  onClose,
  onSelect,
  currentVariable,
  allowedTypes,
}) => {
  const environment = useEnvironment();
  const [scope, setScope] = useState<ScopeFilter>('@worker');
  const [selectedKey, setSelectedKey] = useState<string>();
  const [showVariableForm, setShowVariableForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'process' | 'global'>('process');
  const [selectedProcessVar, setSelectedProcessVar] = useState<string>();
  const { variables, updateVariables } = useEditorStateStore((state) => state);

  // fetch config
  const { data: config } = useQuery({
    queryKey: ['deepConfig', environment.spaceId],
    queryFn: () => getDeepConfigurationById(environment.spaceId),
    enabled: open,
  });

  // initialize with current variable on modal opening
  useEffect(() => {
    if (!open) return;
    if (currentVariable?.startsWith('@global')) {
      const detectedScope = detectScope(currentVariable);

      setActiveTab('global');
      setScope(detectedScope);
      setSelectedKey(currentVariable);
      setSelectedProcessVar(undefined);
    } else {
      setActiveTab('process');
      setSelectedProcessVar(currentVariable);
      setSelectedKey(undefined);
    }
  }, [open, currentVariable]);

  const treeData: DataNode[] = useMemo(() => {
    if (!config) return [];
    return buildScopedTree(config, scope);
  }, [config, scope]);

  const resetState = () => {
    setSelectedKey(undefined);
    setSelectedProcessVar(undefined);
    setActiveTab('process');
    setScope('@worker');
  };

  const currentSelection = activeTab === 'process' ? selectedProcessVar : selectedKey;
  const isSelectionChanged = !!currentSelection && currentSelection !== currentVariable;

  const handleOk = () => {
    if (activeTab === 'process' && selectedProcessVar) {
      const variable = variables?.find((v) => v.name === selectedProcessVar);
      onSelect(selectedProcessVar, variable?.dataType, variable?.textFormat);
    } else if (activeTab === 'global' && selectedKey) {
      onSelect(selectedKey, 'string');
    }
    resetState();
    onClose();
  };

  const handleCancel = () => {
    resetState();
    onClose();
  };

  const scopeFilters: { label: ScopeFilter; value: ScopeFilter }[] = [
    { label: '@worker', value: '@worker' },
    { label: '@process-initiator', value: '@process-initiator' },
    { label: '@organization', value: '@organization' },
  ];

  return (
    <>
      <Modal
        title="Add Variable"
        open={open}
        onCancel={handleCancel}
        onOk={handleOk}
        okText="OK"
        okButtonProps={{
          disabled: !isSelectionChanged,
        }}
        width={500}
      >
        <Tabs
          activeKey={activeTab}
          onChange={(key) => {
            setActiveTab(key as 'process' | 'global');
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
                    dataSource={
                      allowedTypes
                        ? variables?.filter((v) => allowedTypes.includes(v.dataType)) ?? []
                        : variables ?? []
                    }
                    renderItem={(v: ProcessVariable) => (
                      <List.Item
                        style={{
                          cursor: 'pointer',
                          backgroundColor: selectedProcessVar === v.name ? '#e6f4ff' : undefined,
                        }}
                        onClick={() => {
                          setSelectedProcessVar(v.name);
                          // clear global selection
                          setSelectedKey(undefined);
                        }}
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
                        setSelectedProcessVar(undefined);
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
        allowedTypes={allowedTypes}
        onSubmit={(newVar) => {
          updateVariables([...(variables ?? []), newVar]);
          setSelectedProcessVar(newVar.name);
          setShowVariableForm(false);
        }}
        onCancel={() => setShowVariableForm(false)}
      />
    </>
  );
};

export default DataObjectSelectionModal;
