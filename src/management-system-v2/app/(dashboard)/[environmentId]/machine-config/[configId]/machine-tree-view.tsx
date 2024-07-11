'use client';

import {
  ParentConfig,
  AbstractConfig,
  Parameter,
  TargetConfig,
} from '@/lib/data/machine-config-schema';
import { Dropdown, Input, MenuProps, Modal, Space, Tag, Tooltip, Tree, TreeDataNode } from 'antd';
import Text from 'antd/es/typography/Text';
import { EventDataNode } from 'antd/es/tree';
import { useRouter } from 'next/navigation';
import { Key, useEffect, useRef, useState } from 'react';
import { v3, v4 } from 'uuid';
import TextArea from 'antd/es/input/TextArea';
import { useEnvironment } from '@/components/auth-can';
import {
  TreeFindParameterStruct,
  TreeFindStruct,
  createMachineConfigInParent,
  createTargetConfigInParent,
  deleteParameter,
  findConfig,
  findParameter,
} from '../configuration-helper';
import MachineConfigModal from '@/components/machine-config-modal';
import { Localization } from '@/lib/data/locale';

type ConfigurationTreeViewProps = {
  configId: string;
  parentConfig: ParentConfig;
  backendSaveParentConfig: Function;
  onSelectConfig: Function;
  onUpdate: Function;
};

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
  const [parameterKey, setParameterKey] = useState<string>('');
  const [parameterValue, setParameterValue] = useState<string>('');
  const [parameterUnit, setParameterUnit] = useState<string>('');
  const [parameterLanguage, setParameterLanguage] = useState<Localization>('en');
  const [selectedMachineConfig, setSelectedMachineConfig] = useState<
    TreeFindStruct | TreeFindParameterStruct
  >(undefined);

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
    setParameterLanguage('en');
    setParameterUnit('');
    setParameterValue('');
  };

  const handleCreateMachineOk = (
    values: {
      name: string;
      description: string;
    }[],
  ): Promise<void> => {
    if (machineType === 'machine-config') {
      createMachine(values[0]);
    } else {
      createTarget(values[0]);
    }
    setCreateMachineOpen(false);
    return Promise.resolve();
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
    props.onUpdate(parentConfig);
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
    let foundMachine: TreeFindStruct | TreeFindParameterStruct = {
      parent: parentConfig,
      selection: parentConfig,
    };
    // Check if it is not the parent config
    if (selectedKeys.length !== 0 && selectedKeys.indexOf(parentConfig.id) === -1) {
      const [_configId, _configType] = selectedKeys[0].toString().split('|', 2);
      //Then search the right one
      let ref = findConfig(_configId, parentConfig);
      if (ref !== undefined) foundMachine = ref;
      else {
        // try to find parameter
        let ref2 = findParameter(_configId, parentConfig, 'config');
        if (ref2 !== undefined) foundMachine = ref2;
      }
    }
    setSelectedMachineConfig(foundMachine);
    props.onSelectConfig(foundMachine);
  };
  const onRightClickTreeNode = (info: {
    event: React.MouseEvent;
    node: EventDataNode<TreeDataNode>;
  }) => {
    // Lets fix to only one selection for now
    const [_configId, _configType] = info.node.key.toString().split('|', 2);
    setSelectedOnTree([info.node.key]);
    let foundMachine: TreeFindStruct | TreeFindParameterStruct = {
      parent: parentConfig,
      selection: parentConfig,
    };
    let ref = findConfig(_configId, parentConfig);
    if (ref !== undefined) foundMachine = ref;
    else {
      // try to find parameter
      let ref2 = findParameter(_configId, parentConfig, 'config');
      if (ref2 !== undefined) foundMachine = ref2;
    }
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
    _parameter: Parameter,
  ): TreeDataNode & { ref: Parameter } => {
    let tagByType = (
      <>
        <Tooltip
          placement="top"
          title={
            <Space size={3}>
              {_parameter.content[0].displayName}:{_parameter.content[0].value}
              {_parameter.content[0].unit}({_parameter.content[0].language})
            </Space>
          }
        >
          <Tag color="lime">P</Tag>
          {_parameter.content[0].displayName}
        </Tooltip>
      </>
    );

    return {
      title: tagByType,
      key: _parameter.id + '|parameter',
      ref: _parameter,
      children: [],
    };
  };

  const parameterSearch = (_parentParameter: Parameter): TreeDataNode => {
    let node: TreeDataNode = configParameterToTreeElement(_parentParameter);
    node.children = [];
    for (let prop in _parentParameter.parameters) {
      let nestedParameter = _parentParameter.parameters[prop];
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
      for (let prop in parentConfig.targetConfig.parameters) {
        let parameter = parentConfig.targetConfig.parameters[prop];
        childNode.children.push(parameterSearch(parameter));
      }
      list.push(childNode);
    }
    const machineConfigs = Array.isArray(_machineConfig.machineConfigs)
      ? _machineConfig.machineConfigs
      : [];
    for (let childrenConfig of machineConfigs) {
      let childNode: TreeDataNode = configToTreeElement(childrenConfig);
      childNode.children = [];
      for (let prop in childrenConfig.parameters) {
        let parameter = childrenConfig.parameters[prop];
        childNode.children.push(parameterSearch(parameter));
      }
      list.push(childNode);
    }
    return list;
  };

  const mountTreeData = () => {
    let configArray: TreeDataNode[] = [configToTreeElement(parentConfig)];
    configArray[0].children = loopTreeData(parentConfig);
    setTreeData(configArray);
  };

  const createTarget = (values: { name: string; description: string }) => {
    createTargetConfigInParent(parentConfig, values.name, values.description);
    saveAndUpdateElements();
  };

  const createMachine = (values: { name: string; description: string }) => {
    createMachineConfigInParent(parentConfig, values.name, values.description);
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
    const [_configId, _configType] = selectedOnTree[0].toString().split('|', 2);
    deleteParameter(_configId, parentConfig);
    saveAndUpdateElements();
  };
  const updateTree = () => {
    mountTreeData();
  };

  const addParameter = () => {
    const [_configId, _configType] = selectedOnTree[0].toString().split('|', 2);
    const date = new Date().toUTCString();
    const defaultParameter: Parameter = {
      id: v4(),
      linkedParameters: [],
      parameters: [],
      type: 'https://schema.org/' + parameterKey,
      content: [
        {
          displayName: parameterKey[0].toUpperCase() + parameterKey.slice(1),
          language: parameterLanguage,
          value: parameterValue,
          unit: parameterUnit,
        },
      ],
    };
    if (_configType === 'parameter') {
      let ref = findParameter(_configId.toString(), parentConfig, 'config');
      if (ref === undefined) return;
      ref.selection.parameters[parameterKey] = defaultParameter;
    } else {
      let ref = findConfig(_configId.toString(), parentConfig);
      if (ref === undefined) return;
      ref.selection.metadata[parameterKey] = defaultParameter;
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
          label: 'Create Parameter',
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
        title={
          'Deleting ' +
          (selectedMachineConfig
            ? 'name' in selectedMachineConfig.selection
              ? selectedMachineConfig.selection.name
              : selectedMachineConfig.selection.content[0].displayName
            : '')
        }
        onOk={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      >
        <p>
          Are you sure you want to delete the configuration{' '}
          {selectedMachineConfig
            ? 'name' in selectedMachineConfig.selection
              ? selectedMachineConfig.selection.name
              : selectedMachineConfig.selection.content[0].displayName
            : ''}{' '}
          with id {selectedMachineConfig?.selection.id}?
        </p>
      </Modal>
      <MachineConfigModal
        open={createMachineOpen}
        title={`Creating ${machineType === 'target-config' ? 'target' : 'machine'} configuration`}
        onCancel={() => {
          setCreateMachineOpen(false);
        }}
        onSubmit={handleCreateMachineOk}
      />
      <Modal
        open={createParameterOpen}
        title={'New parameter'}
        onOk={handleCreateParameterOk}
        onCancel={handleCreateParameterCancel}
      >
        Key:
        <Input required value={parameterKey} onChange={changeParameterKey} />
        Value:
        <Input required value={parameterValue} onChange={changeParameterValue} />
        Unit:
        <Input value={parameterUnit} onChange={changeParameterUnit} />
        Language:
        <Input value={parameterLanguage} onChange={changeParameterLanguage} />
      </Modal>
    </>
  );
}
