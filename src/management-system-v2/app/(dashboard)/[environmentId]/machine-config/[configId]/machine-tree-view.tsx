'use client';

import { MachineConfig } from '@/lib/data/machine-config-schema';
import { Button, Dropdown, MenuProps, Tag, Tree, TreeDataNode } from 'antd';
import { EventDataNode } from 'antd/es/tree';
import { useRouter } from 'next/navigation';
import { Key, useEffect, useRef, useState } from 'react';
import { PlusOutlined } from '@ant-design/icons';
import { v4 } from 'uuid';

type MachineTreeViewProps = {
  configId: string;
  originalMachineConfig: MachineConfig;
  backendSaveMachineConfig: Function;
  onSelectConfig: Function;
};

export function defaultMachineConfig() {
  const date = new Date().toUTCString();
  return {
    id: v4(),
    type: 'machine-config',
    environmentId: '',
    owner: '',
    name: 'Default Machine Configuration',
    description: '',
    variables: [],
    departments: [],
    inEditingBy: [],
    createdOn: date,
    lastEdited: date,
    sharedAs: 'protected',
    shareTimestamp: 0,
    allowIframeTimestamp: 0,
    versions: [],
    folderId: '',
    targetConfigs: [],
    machineConfigs: [],
  } as MachineConfig;
}

export function findInTree(
  id: string,
  _parent: MachineConfig,
  _machineConfig: MachineConfig,
  level: number,
): { parent: MachineConfig; selection: MachineConfig } | undefined {
  if (_machineConfig.id === id) {
    return { selection: _machineConfig, parent: _parent };
  }
  let machineFound = undefined;
  const targetConfigs = Array.isArray(_machineConfig.targetConfigs)
    ? _machineConfig.targetConfigs
    : [];
  for (let childrenConfig of targetConfigs) {
    if (machineFound) {
      break;
    }
    machineFound = findInTree(id, _machineConfig, childrenConfig, level + 1);
  }
  const machineConfigs = Array.isArray(_machineConfig.machineConfigs)
    ? _machineConfig.machineConfigs
    : [];
  for (let childrenConfig of machineConfigs) {
    if (machineFound) {
      break;
    }
    machineFound = findInTree(id, _machineConfig, childrenConfig, level + 1);
  }
  return machineFound;
}

export default function MachineTreeView(props: MachineTreeViewProps) {
  const router = useRouter();
  const machineConfig = { ...props.originalMachineConfig };
  const saveMachineConfig = props.backendSaveMachineConfig;
  const configId = props.configId;

  const firstRender = useRef(true);
  const [treeData, setTreeData] = useState<TreeDataNode[]>([]);

  const [selectedOnTree, setSelectedOnTree] = useState<Key[]>([]);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      mountTreeData();
      return;
    }
  }, []);

  const saveAndUpdateElements = () => {
    saveMachineConfig(configId, machineConfig).then(() => {});
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
    let foundMachine = { parent: machineConfig, selection: machineConfig };
    // Check if it is not the parent config
    if (selectedKeys.length !== 0 && selectedKeys.indexOf(machineConfig.id) === -1) {
      //Then search the right one
      let ref = findInTree(selectedKeys[0].toString(), machineConfig, machineConfig, 0);
      if (ref !== undefined) foundMachine = ref;
    }
    props.onSelectConfig(foundMachine);
  };
  const onRightClickTreeNode = (info: {
    event: React.MouseEvent;
    node: EventDataNode<TreeDataNode>;
  }) => {
    // Lets fix to only one selection for now
    setSelectedOnTree([info.node.key]);
  };

  const machineConfigToTreeElement = (_machineConfig: MachineConfig) => {
    let tagByType = (
      <>
        <Tag color="purple">T</Tag>
        {_machineConfig.name}
      </>
    );
    if (_machineConfig.type === 'machine-config') {
      tagByType = (
        <>
          <Tag color="red">M</Tag>
          {_machineConfig.name}
        </>
      );
    } else if (_machineConfig.type === 'target-config') {
      tagByType = (
        <>
          <Tag color="purple">T</Tag>
          {_machineConfig.name}
        </>
      );
    } else {
      tagByType = (
        <>
          <Tag color="green">C</Tag>
          {_machineConfig.name}
        </>
      );
    }
    return {
      title: tagByType,
      key: _machineConfig.id,
      ref: _machineConfig,
      children: [],
    };
  };

  const searchTreeData = (_machineConfig: MachineConfig, level: number) => {
    const list = [];

    const targetConfigs = Array.isArray(_machineConfig.targetConfigs)
      ? _machineConfig.targetConfigs
      : [];
    for (let childrenConfig of targetConfigs) {
      let childNode: TreeDataNode = machineConfigToTreeElement(childrenConfig);
      childNode.children = searchTreeData(childrenConfig, level + 1);
      list.push(childNode);
    }
    const machineConfigs = Array.isArray(_machineConfig.machineConfigs)
      ? _machineConfig.machineConfigs
      : [];
    for (let childrenConfig of machineConfigs) {
      let childNode: TreeDataNode = machineConfigToTreeElement(childrenConfig);
      childNode.children = searchTreeData(childrenConfig, level + 1);
      list.push(childNode);
    }
    return list;
  };

  const mountTreeData = () => {
    let configArray: TreeDataNode[] = [machineConfigToTreeElement(machineConfig)];
    configArray[0].children = searchTreeData(machineConfig, 0);
    setTreeData(configArray);
  };

  const createTarget = () => {
    // For target configs we always create on top level if there isn't one already
    if (machineConfig.targetConfigs.length > 0) return;
    let foundMachine = machineConfig;
    // // Check if it is not the parent config
    // if (selectedOnTree.length !== 0 && selectedOnTree.indexOf(machineConfig.id) == -1) {
    //   //Then search the right one
    //   let ref = findInTree(selectedOnTree[0].toString(), machineConfig, 0);
    //   if (ref !== undefined) foundMachine = ref;
    // }
    foundMachine.targetConfigs.push({
      ...defaultMachineConfig(),
      name: foundMachine.name + '-target-' + foundMachine.targetConfigs.length,
      type: 'target-config',
      owner: foundMachine.owner,
      environmentId: foundMachine.environmentId,
    });
    saveAndUpdateElements();
  };

  const createMachine = (menu: any) => {
    let foundMachine = { parent: machineConfig, selection: machineConfig };
    // Check if it is not the parent config
    if (selectedOnTree.length !== 0 && selectedOnTree.indexOf(machineConfig.id) === -1) {
      //Then search the right one
      let ref = findInTree(selectedOnTree[0].toString(), machineConfig, machineConfig, 0);
      if (ref !== undefined) foundMachine = ref;
    }
    foundMachine.selection.machineConfigs.push({
      ...defaultMachineConfig(),
      name:
        foundMachine.selection.name + '-machine-' + foundMachine.selection.machineConfigs.length,
      type: 'machine-config',
      owner: foundMachine.selection.owner,
      environmentId: foundMachine.selection.environmentId,
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

  const deleteItem = (menu: any) => {
    if (selectedOnTree.length < 1) return;
    let foundMachine = { parent: machineConfig, selection: machineConfig };
    // Check if it is not the parent config
    if (selectedOnTree.length !== 0 && selectedOnTree.indexOf(machineConfig.id) === -1) {
      //Then search the right one
      let ref = findInTree(selectedOnTree[0].toString(), machineConfig, machineConfig, 0);
      if (ref !== undefined) foundMachine = ref;
    }

    let childrenMachineConfigList = Array.isArray(foundMachine.parent.machineConfigs)
      ? foundMachine.parent.machineConfigs
      : [];
    let childrenTargetConfigList = Array.isArray(foundMachine.parent.targetConfigs)
      ? foundMachine.parent.targetConfigs
      : [];
    childrenMachineConfigList = childrenMachineConfigList.filter((node, _) => {
      return selectedOnTree.indexOf(node.id) === -1;
    });
    childrenTargetConfigList = childrenTargetConfigList.filter((node, _) => {
      return selectedOnTree.indexOf(node.id) === -1;
    });

    foundMachine.parent.machineConfigs = childrenMachineConfigList;
    foundMachine.parent.targetConfigs = childrenTargetConfigList;

    saveAndUpdateElements();
  };
  const updateTree = () => {
    mountTreeData();
  };

  const contextMenuItems: MenuProps['items'] = [
    {
      label: 'Create Machine Configuration',
      key: 'create-machine',
      onClick: createMachine,
    },
    {
      label: 'Create Target Configuration',
      key: 'create-target',
      onClick: createTarget,
    },
    {
      label: 'Update',
      key: 'update',
      onClick: updateTree,
    },
    {
      label: 'Delete',
      key: 'delete',
      onClick: deleteItem,
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
    </>
  );
}
