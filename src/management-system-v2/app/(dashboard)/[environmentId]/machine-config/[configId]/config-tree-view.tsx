'use client';

import {
  ParentConfig,
  AbstractConfig,
  StoredParameter,
  MachineConfig,
  TargetConfig,
} from '@/lib/data/machine-config-schema';
import { Dropdown, MenuProps, Modal, Tree, Button, TreeDataNode } from 'antd';
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
  treeData: TreeDataNode[];
  expandedKeys: string[];
  onExpandedChange: (newExpanded: string[]) => void;
  onChangeSelection: (selection?: {
    id: string;
    type: AbstractConfig['type'] | 'parameter';
  }) => void;
};

type ModalType = '' | AbstractConfig['type'] | 'parameter' | 'metadata' | 'delete';

const ConfigurationTreeView: React.FC<ConfigurationTreeViewProps> = ({
  parentConfig,
  editable,
  treeData,
  expandedKeys,
  onExpandedChange,
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

  const contextMenuItems: MenuProps['items'] = useMemo(() => {
    let items: MenuProps['items'] = [];
    if (rightClickedType === 'config') {
      items.push(
        {
          label: 'Create Target Tech Data Set',
          key: 'create-target',
          onClick: () => setOpenModal('target-config'),
          disabled: !editable || !!(rightClickedNode as ParentConfig).targetConfig,
        },
        {
          label: 'Create Machine Tech Data Set',
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
      <Dropdown menu={{ items: contextMenuItems }} trigger={['contextMenu']}>
        <Tree
          selectedKeys={selectedOnTree}
          onRightClick={onRightClickTreeNode}
          onSelect={onSelectTreeNode}
          treeData={treeData}
          expandedKeys={expandedKeys}
          onExpand={(keys: React.Key[]) => onExpandedChange(keys.map((key) => key.toString()))}
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
