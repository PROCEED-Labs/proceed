'use client';

import {
  ParentConfig,
  AbstractConfig,
  ConfigParameter,
  TargetConfig,
} from '@/lib/data/machine-config-schema';
import {
  Button,
  Dropdown,
  Form,
  Input,
  MenuProps,
  Modal,
  Select,
  Tag,
  Tree,
  TreeDataNode,
} from 'antd';
import { EventDataNode } from 'antd/es/tree';
import { useRouter } from 'next/navigation';
import { Key, useEffect, useRef, useState } from 'react';
import { PlusOutlined } from '@ant-design/icons';
import { v4 } from 'uuid';
import TextArea from 'antd/es/input/TextArea';

type ConfigurationTreeViewProps = {
  configId: string;
  parentConfig: ParentConfig;
  backendSaveParentConfig: Function;
  onSelectConfig: Function;
};

export type TreeFindStruct = { selection: AbstractConfig; parent: ParentConfig } | undefined;

export function defaultConfiguration(): AbstractConfig {
  const date = new Date().toUTCString();
  return {
    id: v4(),
    type: 'config',
    environmentId: '',
    owner: { label: 'owner', value: '' },
    picture: { label: 'picture', value: '' },
    name: 'Default Machine Configuration',
    description: { label: 'description', value: '' },
    variables: [],
    customFields: [],
    parameters: [],
    departments: [],
    inEditingBy: [],
    createdOn: date,
    lastEdited: date,
    sharedAs: 'protected',
    shareTimestamp: 0,
    allowIframeTimestamp: 0,
    versions: [],
    folderId: '',
    createdBy: '',
    lastEditedBy: '',
    lastEditedOn: '',
  } as AbstractConfig;
}

export function findConfig(id: string, _parent: ParentConfig): TreeFindStruct | undefined {
  if (id === _parent.id) {
    return { selection: _parent, parent: _parent };
  }
  if (_parent.targetConfig && id === _parent.targetConfig.id) {
    return { selection: _parent.targetConfig, parent: _parent };
  }
  for (let machineConfig of _parent.machineConfigs) {
    if (machineConfig.id === id) {
      return { selection: machineConfig, parent: _parent };
    }
  }
  return undefined;
}

export default function ConfigurationTreeView(props: ConfigurationTreeViewProps) {
  const router = useRouter();
  const parentConfig = { ...props.parentConfig };
  const saveMachineConfig = props.backendSaveParentConfig;
  const configId = props.configId;

  const firstRender = useRef(true);
  const [treeData, setTreeData] = useState<TreeDataNode[]>([]);
  const [selectedOnTree, setSelectedOnTree] = useState<Key[]>([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [createMachineOpen, setCreateMachineOpen] = useState(false);
  const [machineType, setMachineType] = useState<AbstractConfig['type']>('target-config');
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [selectedMachineConfig, setSelectedMachineConfig] = useState<TreeFindStruct>(undefined);

  const changeName = (e: any) => {
    let newName = e.target.value;
    setName(newName);
  };

  const changeDescription = (e: any) => {
    let newDescription = e.target.value;
    setDescription(newDescription);
  };

  const showDeleteConfirmModal = () => {
    setDeleteConfirmOpen(true);
  };

  const showCreateMachineModal = (e: any) => {
    let type = e.key.replace('create-', '');
    if (type === 'target') {
      setMachineType('target-config');
    } else {
      setMachineType('machine-config');
    }
    setCreateMachineOpen(true);
    setName('');
    setDescription('');
  };

  const handleCreateMachineOk = () => {
    if (machineType === 'machine-config') {
      createMachine();
    } else {
      createTarget();
    }
    setCreateMachineOpen(false);
  };

  const handleCreateMachineCancel = () => {
    setCreateMachineOpen(false);
  };

  const handleDeleteConfirm = () => {
    deleteItem();
    setDeleteConfirmOpen(false);
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmOpen(false);
  };

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      mountTreeData();
      setSelectedMachineConfig({ parent: parentConfig, selection: parentConfig });
      return;
    }
  }, []);

  const saveAndUpdateElements = () => {
    saveMachineConfig(configId, parentConfig).then(() => {});
    mountTreeData();
    router.refresh();
  };

  const onSelectTreeNode = (
    selectedKeys: Key[],
    info: {
      event: 'select';
      selected: boolean;
      node: EventDataNode<TreeDataNode>;
      selectedNodes: TreeDataNode[];
      nativeEvent: MouseEvent;
    },
  ) => {
    setSelectedOnTree(selectedKeys);
    let foundMachine: TreeFindStruct = { parent: parentConfig, selection: parentConfig };
    // Check if it is not the parent config
    if (selectedKeys.length !== 0 && selectedKeys.indexOf(parentConfig.id) === -1) {
      //Then search the right one
      let ref = findConfig(selectedKeys[0].toString(), parentConfig);
      if (ref !== undefined) foundMachine = ref;
    }
    setSelectedMachineConfig(foundMachine);
    props.onSelectConfig(foundMachine);
  };
  const onRightClickTreeNode = (info: {
    event: React.MouseEvent;
    node: EventDataNode<TreeDataNode>;
  }) => {
    // Lets fix to only one selection for now
    const machineId = info.node.key;
    setSelectedOnTree([machineId]);
    let foundMachine: TreeFindStruct = { parent: parentConfig, selection: parentConfig };
    let ref = findConfig(machineId.toString(), parentConfig);
    if (ref !== undefined) foundMachine = ref;
    setSelectedMachineConfig(foundMachine);
  };

  const configToTreeElement = (_config: AbstractConfig) => {
    let tagByType = (
      <>
        <Tag color="purple">T</Tag>
        {_config.name}
      </>
    );
    if (_config.type === 'machine-config') {
      tagByType = (
        <>
          <Tag color="red">M</Tag>
          {_config.name}
        </>
      );
    } else if (_config.type === 'target-config') {
      tagByType = (
        <>
          <Tag color="purple">T</Tag>
          {_config.name}
        </>
      );
    } else {
      tagByType = (
        <>
          <Tag color="green">C</Tag>
          {_config.name}
        </>
      );
    }
    return {
      title: tagByType,
      key: _config.id,
      ref: _config,
      children: [],
    };
  };

  const configParameterToTreeElement = (
    _parameter: ConfigParameter,
  ): TreeDataNode & { ref: ConfigParameter } => {
    let tagByType = (
      <>
        <Tag color="lime">P</Tag>
        {_parameter.key}
      </>
    );

    return {
      title: tagByType,
      key: _parameter.key,
      ref: _parameter,
      children: [],
    };
  };

  const parameterSearch = (_parentParameter: ConfigParameter): [] => {
    const list: TreeDataNode[] = [configToTreeElement(parentConfig)];
    return [];
  };

  const loopTreeData = (_machineConfig: ParentConfig) => {
    const list: TreeDataNode[] = [];
    const parentConfig = _machineConfig as ParentConfig;
    if (parentConfig.targetConfig) {
      let childNode: TreeDataNode = configToTreeElement(parentConfig.targetConfig);
      for (let parameter of parentConfig.targetConfig.parameters)
        childNode.children = parameterSearch(parameter);
      list.push(childNode);
    }
    const machineConfigs = Array.isArray(_machineConfig.machineConfigs)
      ? _machineConfig.machineConfigs
      : [];
    for (let childrenConfig of machineConfigs) {
      let childNode: TreeDataNode = configToTreeElement(childrenConfig);
      for (let parameter of childrenConfig.parameters)
        childNode.children = parameterSearch(parameter);
      list.push(childNode);
    }
    return list;
  };

  const mountTreeData = () => {
    let configArray: TreeDataNode[] = [configToTreeElement(parentConfig)];
    configArray[0].children = loopTreeData(parentConfig);
    setTreeData(configArray);
  };

  const createTarget = () => {
    // We can only have one target configuration
    if (parentConfig.targetConfig) return;
    let foundMachine = parentConfig;
    foundMachine.targetConfig = {
      ...defaultConfiguration(),
      name: name,
      description: { label: 'description', value: description },
      type: 'target-config',
      owner: foundMachine.owner,
      environmentId: foundMachine.environmentId,
    };
    saveAndUpdateElements();
  };

  const createMachine = () => {
    parentConfig.machineConfigs.push({
      ...defaultConfiguration(),
      name: name,
      description: { label: 'description', value: description },
      machine: { label: 'machine', value: '' },
      type: 'machine-config',
      owner: parentConfig.owner,
      environmentId: parentConfig.environmentId,
    });
    saveAndUpdateElements();
  };

  const onLoadData = (treeNode: TreeDataNode) =>
    new Promise((resolve) => {
      if (treeNode.children) {
        resolve(treeNode);
        return;
      }
    });

  const deleteItem = () => {
    if (selectedOnTree.length < 1) return;
    let childrenMachineConfigList = Array.isArray(parentConfig.machineConfigs)
      ? parentConfig.machineConfigs
      : [];
    childrenMachineConfigList = childrenMachineConfigList.filter((node, _) => {
      return selectedOnTree.indexOf(node.id) === -1;
    });
    if (parentConfig.targetConfig && selectedOnTree.indexOf(parentConfig.targetConfig.id) !== -1) {
      parentConfig.targetConfig = undefined;
    }
    parentConfig.machineConfigs = childrenMachineConfigList;

    saveAndUpdateElements();
  };
  const updateTree = () => {
    mountTreeData();
  };

  const contextMenuItems: MenuProps['items'] = [
    {
      label: 'Create Machine Configuration',
      key: 'create-machine',
      onClick: showCreateMachineModal,
    },
    {
      label: 'Create Target Configuration',
      key: 'create-target',
      onClick: showCreateMachineModal,
    },
    {
      label: 'Update',
      key: 'update',
      onClick: updateTree,
    },
    {
      label: 'Delete',
      key: 'delete',
      onClick: showDeleteConfirmModal,
    },
  ];

  return (
    <>
      <br />
      <Dropdown menu={{ items: contextMenuItems }} trigger={['contextMenu']}>
        <Tree
          selectedKeys={selectedOnTree}
          onRightClick={onRightClickTreeNode}
          onSelect={onSelectTreeNode}
          loadData={onLoadData}
          treeData={treeData}
        />
      </Dropdown>
      <Modal
        open={deleteConfirmOpen}
        title={'Deleting ' + (selectedMachineConfig ? selectedMachineConfig.selection.name : '')}
        onOk={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      >
        <p>
          Are you sure you want to delete the configuration {selectedMachineConfig?.selection.name}{' '}
          with id {selectedMachineConfig?.selection.id}?
        </p>
      </Modal>
      <Modal
        open={createMachineOpen}
        title="New configuration"
        onOk={handleCreateMachineOk}
        onCancel={handleCreateMachineCancel}
      >
        Name:
        <Input value={name} onChange={changeName} />
        Description:
        <TextArea value={description} onChange={changeDescription} />
      </Modal>
    </>
  );
}
