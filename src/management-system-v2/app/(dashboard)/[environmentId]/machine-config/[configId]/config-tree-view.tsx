'use client';

import {
  ParentConfig,
  AbstractConfig,
  Parameter,
  StoredParameter,
  MachineConfig,
  TargetConfig,
} from '@/lib/data/machine-config-schema';
import { Dropdown, MenuProps, Modal, Space, Tag, Tooltip, Tree, Button, TreeDataNode } from 'antd';
import { EventDataNode } from 'antd/es/tree';
import { useRouter } from 'next/navigation';
import { Key, useMemo, useState } from 'react';
import {
  defaultMachineConfiguration,
  defaultParameter,
  findConfig,
  findParameter,
} from '../configuration-helper';
import MachineConfigModal from '@/components/machine-config-modal';
import CreateParameterModal, { CreateParameterModalReturnType } from './create-parameter-modal';
import { FaFolderTree } from 'react-icons/fa6';

import {
  addMachineConfig,
  addTargetConfig,
  addParameter as backendAddParameter,
  removeMachineConfig,
  removeParameter,
  removeTargetConfig,
} from '@/lib/data/legacy/machine-config';

type ConfigurationTreeViewProps = {
  parentConfig: ParentConfig;
  editable: boolean;
  onChangeSelection: (selection?: {
    id: string;
    type: AbstractConfig['type'] | 'parameter';
  }) => void;
};

type ModalType = '' | AbstractConfig['type'] | 'parameter' | 'metadata' | 'delete';

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
        placement="top"
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

const ConfigurationTreeView: React.FC<ConfigurationTreeViewProps> = ({
  parentConfig,
  editable,
  onChangeSelection,
}) => {
  const router = useRouter();

  const [selectedOnTree, setSelectedOnTree] = useState<Key[]>([]);
  const [openModal, setOpenModal] = useState<ModalType>('');

  const [rightClickedId, setRightClickedId] = useState('');
  const [rightClickedType, setRightClickedType] = useState<AbstractConfig['type'] | 'parameter'>(
    'config',
  );

  const rightClickedNode = useMemo(() => {
    if (!rightClickedId || rightClickedType === 'config') return parentConfig;

    let node;
    if (rightClickedType === 'parameter') {
      const ref = findParameter(rightClickedId, parentConfig, 'config');
      if (ref) node = ref.selection;
    } else {
      const ref = findConfig(rightClickedId, parentConfig);
      if (ref) node = ref.selection;
    }

    return node || parentConfig;
  }, [rightClickedId, rightClickedType, parentConfig]);

  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);

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
    setExpandedKeys(getAllKeys(treeData));
  };

  const collapseAllNodes = () => {
    setExpandedKeys([]);
  };

  const closeModal = () => setOpenModal('');

  const handleCreateMachineOk = async (
    values: {
      name: string;
      description: string;
    }[],
  ) => {
    if (openModal !== 'target-config' && openModal !== 'machine-config') return;
    const { name, description } = values[0];
    const newConfig = {
      ...defaultMachineConfiguration(name, description),
      type: openModal,
      environmentId: parentConfig.environmentId,
    };

    if (openModal === 'machine-config')
      await addMachineConfig(parentConfig.id, newConfig as MachineConfig);
    else if (openModal === 'target-config')
      await addTargetConfig(parentConfig.id, newConfig as TargetConfig);

    router.refresh();
    closeModal();
  };

  const addParameter = async (
    valuesFromModal: CreateParameterModalReturnType,
    addType: 'parameters' | 'metadata',
  ) => {
    const { key, displayName, value, language, unit } = valuesFromModal;
    const newParameter = defaultParameter(key || displayName, value, language, unit);
    let type: StoredParameter['parentType'] =
      rightClickedType === 'config' ? 'parent-config' : rightClickedType;
    await backendAddParameter(rightClickedId, type, addType, key || displayName, newParameter);

    router.refresh();
  };

  const handleCreateParameterOk = async (values: CreateParameterModalReturnType[]) => {
    await addParameter(values[0], 'parameters');
    closeModal();
  };

  const handleCreateMetadataOk = async (values: CreateParameterModalReturnType[]) => {
    await addParameter(values[0], 'metadata');
    closeModal();
  };

  const handleDeleteConfirm = async () => {
    if (rightClickedType === 'parameter') await removeParameter(rightClickedId);
    else if (rightClickedType === 'machine-config') await removeMachineConfig(rightClickedId);
    else if (rightClickedType === 'target-config') await removeTargetConfig(rightClickedId);

    router.refresh();
    closeModal();
  };

  const onSelectTreeNode = (selectedKeys: Key[]) => {
    if (selectedKeys.length) {
      const [id, type] = selectedKeys[0].toString().split('|') as [
        string,
        AbstractConfig['type'] | 'parameter',
      ];
      onChangeSelection({ id, type });
      setRightClickedId(id);
      setRightClickedType(type);
    } else {
      onChangeSelection(undefined);
      setRightClickedId('');
      setRightClickedType('config');
    }

    setSelectedOnTree(selectedKeys);
  };
  const onRightClickTreeNode = (info: { node: EventDataNode<TreeDataNode> }) => {
    // Lets fix to only one selection for now
    const [_configId, _configType] = info.node.key.toString().split('|', 2);
    setRightClickedId(_configId);
    setRightClickedType(_configType as AbstractConfig['type'] | 'parameter');
    setSelectedOnTree([info.node.key]);
  };

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

  const contextMenuItems: MenuProps['items'] = useMemo(() => {
    let items: MenuProps['items'] = [];
    if (rightClickedType === 'config') {
      items.push(
        {
          label: 'Create Target Configuration',
          key: 'create-target',
          onClick: () => setOpenModal('target-config'),
          disabled: !editable || !!(rightClickedNode as ParentConfig).targetConfig,
        },
        {
          label: 'Create Machine Configuration',
          key: 'create-machine',
          onClick: () => setOpenModal('machine-config'),
          disabled: !editable,
        },
      );
    }

    if (rightClickedType !== 'parameter') {
      items.push({
        label: 'Create Metadata',
        key: 'add_metadata',
        onClick: () => {
          setOpenModal('metadata');
        },
        disabled: !editable,
      });
    }

    if (rightClickedType !== 'config') {
      items.push(
        {
          label: 'Create Parameter',
          key: 'add_parameter',
          onClick: () => setOpenModal('parameter'),
          disabled: !editable,
        },
        {
          label: 'Delete',
          key: 'delete',
          onClick: () => setOpenModal('delete'),
          disabled: !editable,
        },
      );
    }

    return items;
  }, [rightClickedNode, rightClickedType, editable]);

  const selectionName =
    'name' in rightClickedNode
      ? rightClickedNode.name
      : rightClickedNode.content.length > 0
        ? rightClickedNode.content[0].displayName
        : '';

  return (
    <>
      <div style={{ position: 'relative', padding: '8px' }}>
        <div
          style={{
            display: 'flex',
            gap: '8px',
            position: 'absolute',
            top: 10,
            right: 60,
            zIndex: 2,
          }}
        >
          <Button
            type="default"
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
        </div>
      </div>
      <br />
      <Dropdown menu={{ items: contextMenuItems }} trigger={['contextMenu']}>
        <Tree
          selectedKeys={selectedOnTree}
          onRightClick={onRightClickTreeNode}
          onSelect={onSelectTreeNode}
          treeData={treeData}
          expandedKeys={expandedKeys}
          onExpand={(keys: React.Key[]) => setExpandedKeys(keys)}
        />
      </Dropdown>
      <Modal
        open={openModal === 'delete'}
        title={'Deleting ' + selectionName}
        onOk={handleDeleteConfirm}
        onCancel={closeModal}
      >
        <p>
          Are you sure you want to delete the configuration {selectionName} with id{' '}
          {rightClickedNode.id}?
        </p>
      </Modal>
      <MachineConfigModal
        open={openModal === 'machine-config' || openModal === 'target-config'}
        title={`Creating ${openModal === 'target-config' ? 'target' : 'machine'} configuration`}
        onCancel={closeModal}
        onSubmit={handleCreateMachineOk}
      />
      <CreateParameterModal
        title="Create Metadata"
        open={openModal === 'metadata'}
        onCancel={closeModal}
        onSubmit={handleCreateMetadataOk}
        okText="Create"
        showKey
      />
      <CreateParameterModal
        title="Create Parameter"
        open={openModal === 'parameter'}
        onCancel={closeModal}
        onSubmit={handleCreateParameterOk}
        okText="Create"
        showKey
      />
    </>
  );
};

export default ConfigurationTreeView;
