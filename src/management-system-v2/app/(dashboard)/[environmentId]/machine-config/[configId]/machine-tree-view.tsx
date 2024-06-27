'use client';

import {
  ParentConfig,
  AbstractConfig,
  ConfigParameter,
  TargetConfig,
} from '@/lib/data/machine-config-schema';
import { Dropdown, Input, MenuProps, Modal, Tag, Tree, TreeDataNode } from 'antd';
import { EventDataNode } from 'antd/es/tree';
import { useRouter } from 'next/navigation';
import { Key, useEffect, useRef, useState } from 'react';
import { v3, v4 } from 'uuid';
import TextArea from 'antd/es/input/TextArea';
import { useEnvironment } from '@/components/auth-can';

type ConfigurationTreeViewProps = {
  configId: string;
  parentConfig: ParentConfig;
  backendSaveParentConfig: Function;
  onSelectConfig: Function;
};

export type TreeFindStruct = { selection: AbstractConfig; parent: ParentConfig } | undefined;
export type TreeFindParameterStruct =
  | {
      selection: ConfigParameter;
      parent: AbstractConfig | ConfigParameter;
      type: AbstractConfig['type'] | 'parameter';
    }
  | undefined;

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

export function findConfig(id: string, _parent: ParentConfig): TreeFindStruct {
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

export function findParameter(
  id: string,
  _parent: AbstractConfig | ConfigParameter,
  type: AbstractConfig['type'] | 'parameter',
): TreeFindParameterStruct {
  let found = undefined;
  if (type === 'config') {
    let parent = _parent as ParentConfig;
    for (let parameter of parent.parameters) {
      if (parameter.id === id) {
        return { selection: parameter, parent: _parent, type: type };
      }
      found = findParameter(id, parameter, 'parameter');
      if (found) return found;
    }
    if (found) return found;
    // search in targetConfig
    if (parent.targetConfig) {
      for (let parameter of parent.targetConfig.parameters) {
        if (parameter.id === id) {
          return { selection: parameter, parent: parent.targetConfig, type: type };
        }
        found = findParameter(id, parameter, 'parameter');
        if (found) return found;
      }
    }
    // search in all machine configs
    if (found) return found;
    for (let machineConfig of parent.machineConfigs) {
      for (let parameter of machineConfig.parameters) {
        if (parameter.id === id) {
          return { selection: parameter, parent: machineConfig, type: type };
        }
        found = findParameter(id, parameter, 'parameter');
        if (found) return found;
      }
      if (found) return found;
    }
    if (found) return found;
  } else {
    let parent = _parent as ConfigParameter;
    for (let parameter of parent.nestedParameters) {
      if (parameter.id === id) {
        return { selection: parameter, parent: _parent, type: type };
      }
      found = findParameter(id, parameter, 'parameter');
      if (found) return found;
    }
  }
  return found;
}

export default function ConfigurationTreeView(props: ConfigurationTreeViewProps) {
  const router = useRouter();
  const environment = useEnvironment();
  const parentConfig = { ...props.parentConfig };
  const saveParentConfig = props.backendSaveParentConfig;
  const configId = props.configId;

  const firstRender = useRef(true);
  const [treeData, setTreeData] = useState<TreeDataNode[]>([]);
  const [selectedOnTree, setSelectedOnTree] = useState<Key[]>([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [createMachineOpen, setCreateMachineOpen] = useState(false);
  const [createParameterOpen, setCreateParameterOpen] = useState(false);
  const [machineType, setMachineType] = useState<AbstractConfig['type']>('target-config');
  const [name, setName] = useState<string>('');
  const [parameterKey, setParameterKey] = useState<string>('');
  const [parameterValue, setParameterValue] = useState<string>('');
  const [parameterUnit, setParameterUnit] = useState<string>('');
  const [parameterLanguage, setParameterLanguage] = useState<string>('');
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

  const changeParameterKey = (e: any) => {
    let newKey = e.target.value;
    setParameterKey(newKey);
  };

  const changeParameterValue = (e: any) => {
    let newValue = e.target.value;
    setParameterValue(newValue);
  };

  const changeParameterLanguage = (e: any) => {
    let newLanguage = e.target.value;
    setParameterLanguage(newLanguage);
  };

  const changeParameterUnit = (e: any) => {
    let newUnit = e.target.value;
    setParameterUnit(newUnit);
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

  const showCreateParameterModal = (e: any) => {
    // let type = e.key.replace('create-', '');
    // if (type === 'target') {
    //   setMachineType('target-config');
    // } else {
    //   setMachineType('machine-config');
    // }
    setCreateParameterOpen(true);
    setParameterKey('');
    setParameterLanguage('');
    setParameterUnit('');
    setParameterValue('');
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

  const handleCreateParameterOk = () => {
    addParameter();
    setCreateParameterOpen(false);
  };

  const handleCreateParameterCancel = () => {
    setCreateParameterOpen(false);
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
    saveParentConfig(configId, parentConfig).then(() => {});
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
      key: _config.id + '|' + _config.type,
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
      key: _parameter.id + '|parameter',
      ref: _parameter,
      children: [],
    };
  };

  const parameterSearch = (_parentParameter: ConfigParameter): TreeDataNode => {
    let node: TreeDataNode = configParameterToTreeElement(_parentParameter);
    node.children = [];
    for (let nestedParameter of _parentParameter.nestedParameters) {
      node.children.push(parameterSearch(nestedParameter));
    }
    return node;
  };

  const loopTreeData = (_machineConfig: ParentConfig) => {
    const list: TreeDataNode[] = [];
    const parentConfig = _machineConfig as ParentConfig;
    if (parentConfig.targetConfig) {
      let childNode: TreeDataNode = configToTreeElement(parentConfig.targetConfig);
      childNode.children = [];
      for (let parameter of parentConfig.targetConfig.parameters)
        childNode.children.push(parameterSearch(parameter));
      list.push(childNode);
    }
    const machineConfigs = Array.isArray(_machineConfig.machineConfigs)
      ? _machineConfig.machineConfigs
      : [];
    for (let childrenConfig of machineConfigs) {
      let childNode: TreeDataNode = configToTreeElement(childrenConfig);
      childNode.children = [];
      for (let parameter of childrenConfig.parameters)
        childNode.children.push(parameterSearch(parameter));
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
      return selectedOnTree.indexOf(node.id + '|' + node.type) === -1;
    });
    if (
      parentConfig.targetConfig &&
      selectedOnTree.indexOf(
        parentConfig.targetConfig.id + '|' + parentConfig.targetConfig.type,
      ) !== -1
    ) {
      parentConfig.targetConfig = undefined;
    }
    parentConfig.machineConfigs = childrenMachineConfigList;

    saveAndUpdateElements();
  };
  const updateTree = () => {
    mountTreeData();
  };

  const addParameter = () => {
    const [_configId, _configType] = selectedOnTree[0].toString().split('|', 2);
    const date = new Date().toUTCString();
    const defaultParameter = {
      id: v4(),
      createdBy: environment.spaceId,
      createdOn: date,
      language: parameterLanguage,
      lastEditedBy: environment.spaceId,
      lastEditedOn: date,
      linkedParameters: [],
      nestedParameters: [],
      unit: parameterUnit,
      value: parameterValue,
      key: parameterKey,
    };
    if (_configType === 'parameter') {
      let ref = findParameter(_configId.toString(), parentConfig, 'config');
      if (ref === undefined) return;
      ref.selection.nestedParameters.push(defaultParameter);
    } else {
      let ref = findConfig(_configId.toString(), parentConfig);
      if (ref === undefined) return;
      ref.selection.parameters.push(defaultParameter);
    }
    saveAndUpdateElements();
  };

  const mountContextMenu = (): MenuProps['items'] => {
    let append = [];
    if (parentConfig.targetConfig === undefined) {
      append.push({
        label: 'Create Target Configuration',
        key: 'create-target',
        onClick: showCreateMachineModal,
      });
    }
    const parentConfigContextMenu = [
      ...append,
      {
        label: 'Create Machine Configuration',
        key: 'create-machine',
        onClick: showCreateMachineModal,
      },
      {
        label: 'Update',
        key: 'update',
        onClick: updateTree,
      },
    ];
    if (selectedOnTree.length <= 0) return parentConfigContextMenu;
    const [_configId, _configType] = selectedOnTree[0].toString().split('|', 2);
    // if the selected item is the target configuration
    if (
      _configType === 'target-config' ||
      _configType === 'machine-config' ||
      _configType === 'parameter'
    ) {
      return [
        {
          label: 'Create parameter',
          key: 'add_parameter',
          onClick: showCreateParameterModal,
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
    } else if (_configType === 'config') {
      return parentConfigContextMenu;
    } else {
      return [
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
    }
  };

  return (
    <>
      <br />
      <Dropdown menu={{ items: mountContextMenu() }} trigger={['contextMenu']}>
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
        title={'New ' + (machineType === 'target-config' ? 'target' : 'machine') + ' configuration'}
        onOk={handleCreateMachineOk}
        onCancel={handleCreateMachineCancel}
      >
        Name:
        <Input value={name} onChange={changeName} />
        Description:
        <TextArea value={description} onChange={changeDescription} />
      </Modal>
      <Modal
        open={createParameterOpen}
        title={'New parameter'}
        onOk={handleCreateParameterOk}
        onCancel={handleCreateParameterCancel}
      >
        Key:
        <Input value={parameterKey} onChange={changeParameterKey} />
        Value:
        <Input value={parameterValue} onChange={changeParameterValue} />
        Unit:
        <Input value={parameterUnit} onChange={changeParameterUnit} />
        Language:
        <Input value={parameterLanguage} onChange={changeParameterLanguage} />
      </Modal>
    </>
  );
}
