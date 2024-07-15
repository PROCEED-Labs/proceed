'use client';

import {
  ParentConfig,
  AbstractConfig,
  Parameter,
  TargetConfig,
  MachineConfig,
} from '@/lib/data/machine-config-schema';
import {
  Dropdown,
  Input,
  MenuProps,
  Modal,
  Space,
  Tag,
  Tooltip,
  Tree,
  Button,
  TreeDataNode,
} from 'antd';
import { EventDataNode } from 'antd/es/tree';
import { useRouter } from 'next/navigation';
import { Key, useEffect, useRef, useState } from 'react';
import { v4 } from 'uuid';
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
import CreateParameterModal, { CreateParameterModalReturnType } from './create-parameter-modal';
import { FaFolderTree } from 'react-icons/fa6';

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
  const [createMetadataOpen, setCreateMetadataOpen] = useState(false);
  const [createParameterOpen, setCreateParameterOpen] = useState(false);
  const [machineType, setMachineType] = useState<AbstractConfig['type']>('target-config');
  const [selectedMachineConfig, setSelectedMachineConfig] = useState<
    TreeFindStruct | TreeFindParameterStruct
  >(undefined);
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

  const showCreateParameterModal = (_: any) => {
    setCreateParameterOpen(true);
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

  const handleCreateParameterOk = (values: CreateParameterModalReturnType[]): Promise<void> => {
    addParameter(values[0], 'parameter');
    setCreateParameterOpen(false);
    return Promise.resolve();
  };

  const handleCreateMetadataOk = (values: CreateParameterModalReturnType[]): Promise<void> => {
    addParameter(values[0], 'metadata');
    setCreateMetadataOpen(false);
    return Promise.resolve();
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
    key: string,
    _parameter: Parameter,
    type: 'metadata' | 'parameter',
  ): TreeDataNode & { ref: Parameter } => {
    let tagByType = (
      <>
        {_parameter.content.length > 0 ? (
          <Tooltip
            placement="top"
            title={
              <Space size={3}>
                {_parameter.content[0].displayName}:{_parameter.content[0].value}
                {_parameter.content[0].unit}({_parameter.content[0].language})
              </Space>
            }
          >
            {type === 'parameter' && <Tag color="lime">P</Tag>}
            {type === 'metadata' && <Tag color="cyan">P</Tag>}
            {key}
          </Tooltip>
        ) : (
          <div>
            {type === 'parameter' && <Tag color="lime">P</Tag>}
            {type === 'metadata' && <Tag color="cyan">P</Tag>}
            {key}
          </div>
        )}
      </>
    );

    return {
      title: tagByType,
      key: _parameter.id + '|parameter',
      ref: _parameter,
      children: [],
    };
  };

  const parameterSearch = (
    key: string,
    _parentParameter: Parameter,
    type: 'metadata' | 'parameter',
  ): TreeDataNode => {
    let node: TreeDataNode = configParameterToTreeElement(key, _parentParameter, type);
    node.children = [];
    for (let prop in _parentParameter.parameters) {
      let nestedParameter = _parentParameter.parameters[prop];
      node.children.push(parameterSearch(prop, nestedParameter, 'parameter'));
    }
    return node;
  };

  const loopTreeData = (_machineConfig: ParentConfig) => {
    const list: TreeDataNode[] = [];
    const parentConfig = _machineConfig as ParentConfig;
    if (parentConfig.targetConfig) {
      let childNode: TreeDataNode = configToTreeElement(parentConfig.targetConfig);
      childNode.children = [];
      for (let prop in parentConfig.targetConfig.metadata) {
        let parameter = parentConfig.targetConfig.metadata[prop];
        childNode.children.push(parameterSearch(prop, parameter, 'metadata'));
      }
      for (let prop in parentConfig.targetConfig.parameters) {
        let parameter = parentConfig.targetConfig.parameters[prop];
        childNode.children.push(parameterSearch(prop, parameter, 'parameter'));
      }
      list.push(childNode);
    }
    const machineConfigs = Array.isArray(_machineConfig.machineConfigs)
      ? _machineConfig.machineConfigs
      : [];
    for (let childrenConfig of machineConfigs) {
      let childNode: TreeDataNode = configToTreeElement(childrenConfig);
      childNode.children = [];
      for (let prop in childrenConfig.metadata) {
        let parameter = childrenConfig.metadata[prop];
        childNode.children.push(parameterSearch(prop, parameter, 'metadata'));
      }
      for (let prop in childrenConfig.parameters) {
        let parameter = childrenConfig.parameters[prop];
        childNode.children.push(parameterSearch(prop, parameter, 'parameter'));
      }
      list.push(childNode);
    }
    return list;
  };

  const mountTreeData = () => {
    let configArray: TreeDataNode[] = [configToTreeElement(parentConfig)];
    configArray[0].children = [];
    for (let prop in parentConfig.metadata) {
      let parameter = parentConfig.metadata[prop];
      configArray[0].children.push(parameterSearch(prop, parameter, 'metadata'));
    }
    configArray[0].children = configArray[0].children.concat(loopTreeData(parentConfig));
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
    childrenMachineConfigList = childrenMachineConfigList.filter(
      (node: MachineConfig | TargetConfig, _: number) => {
        return selectedOnTree.indexOf(node.id + '|' + node.type) === -1;
      },
    );
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

  const addParameter = (
    valuesFromModal: CreateParameterModalReturnType,
    addType: 'parameter' | 'metadata',
  ) => {
    const [_configId, _configType] = selectedOnTree[0].toString().split('|', 2);
    const defaultParameter: Parameter = {
      id: v4(),
      linkedParameters: [],
      parameters: [],
      type: 'https://schema.org/' + valuesFromModal.key ?? valuesFromModal.displayName,
      content: [
        {
          displayName:
            valuesFromModal.displayName[0].toUpperCase() + valuesFromModal.displayName.slice(1),
          language: valuesFromModal.language,
          value: valuesFromModal.value,
          unit: valuesFromModal.unit,
        },
      ],
    };
    if (_configType === 'parameter') {
      let ref = findParameter(_configId.toString(), parentConfig, 'config');
      if (ref === undefined) return;
      ref.selection.parameters[valuesFromModal.key ?? valuesFromModal.displayName] =
        defaultParameter;
    } else {
      let ref = findConfig(_configId.toString(), parentConfig);
      if (ref === undefined) return;
      if (_configType !== 'config') {
        let _selection = ref.selection as MachineConfig | TargetConfig;
        if (addType === 'metadata') {
          _selection.metadata[valuesFromModal.key ?? valuesFromModal.displayName] =
            defaultParameter;
        } else {
          _selection.parameters[valuesFromModal.key ?? valuesFromModal.displayName] =
            defaultParameter;
        }
      } else {
        let _selection = ref.selection as ParentConfig;
        _selection.metadata[valuesFromModal.key ?? valuesFromModal.displayName] = defaultParameter;
      }
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
        label: 'Create Metadata',
        key: 'add_metadata',
        onClick: () => {
          setCreateMetadataOpen(true);
        },
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
      let items = [];
      if (_configType !== 'parameter') {
        items.push({
          label: 'Create Metadata',
          key: 'add_metadata',
          onClick: () => {
            setCreateMetadataOpen(true);
          },
        });
      }
      return [
        ...items,
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
      <Dropdown menu={{ items: mountContextMenu() }} trigger={['contextMenu']}>
        <Tree
          selectedKeys={selectedOnTree}
          onRightClick={onRightClickTreeNode}
          onSelect={onSelectTreeNode}
          loadData={onLoadData}
          treeData={treeData}
          expandedKeys={expandedKeys}
          onExpand={(keys: React.Key[]) => setExpandedKeys(keys)}
        />
      </Dropdown>
      <Modal
        open={deleteConfirmOpen}
        title={
          'Deleting ' +
          (selectedMachineConfig
            ? 'name' in selectedMachineConfig.selection
              ? selectedMachineConfig.selection.name
              : selectedMachineConfig.selection.content.length > 0
                ? selectedMachineConfig.selection.content[0].displayName
                : ''
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
              : selectedMachineConfig.selection.content.length > 0
                ? selectedMachineConfig.selection.content[0].displayName
                : ''
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
      <CreateParameterModal
        title="Create Metadata"
        open={createMetadataOpen}
        onCancel={() => setCreateMetadataOpen(false)}
        onSubmit={handleCreateMetadataOk}
        okText="Create"
        showKey
      />
      <CreateParameterModal
        title="Create Parameter"
        open={createParameterOpen}
        onCancel={handleCreateParameterCancel}
        onSubmit={handleCreateParameterOk}
        okText="Create"
        showKey
      />
    </>
  );
}
