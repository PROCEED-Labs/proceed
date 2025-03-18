'use client';

import { getFolder, getFolderContents } from '@/lib/data/folders';
import { Spin, Tree, TreeProps } from 'antd';
import React, { useEffect, useRef, useState } from 'react';
import { useEnvironment } from './auth-can';
import { ProcessListItemIcon } from './process-list';
import { ProcessListProcess } from './processes';
import ProceedLoadingIndicator from './loading-proceed';

type FolderChildren = {
  id: string;
  name: string;
  type: ProcessListProcess['type'];
};

type TreeNode = NonNullable<TreeProps['treeData']>[number] & { element: FolderChildren };

function generateNode(element: FolderChildren): TreeNode {
  let isLeaf = false;

  if (element.type !== 'folder') isLeaf = true;

  return {
    key: element.id,
    title: (
      <>
        <ProcessListItemIcon item={element} /> {element.name}
      </>
    ),
    isLeaf,
    element,
  };
}

function getCorrespondingFolder(key: React.Key, nodeMap: Map<React.Key, TreeNode>) {
  const node = nodeMap.get(key);
  if (!node) return;

  /* If the element is a folder */
  if (node.element.type !== 'folder') return node.element;

  /* If it is not a folder go up hierarchy until folder */
  let parent = nodeMap.get(node.key);
  while (parent && parent.element.type !== 'folder') {
    parent = nodeMap.get(parent.key);
  }

  return parent?.element;
}

export const FolderTree = ({
  rootNodes,
  newChildrenHook,
  treeProps,
  showRootAsFolder,
}: {
  rootNodes?: FolderChildren[];
  /** The return value is used to update the tree */
  newChildrenHook?: (nodes: TreeNode[], parent?: TreeNode) => TreeNode[];
  treeProps?: TreeProps<TreeNode>;
  showRootAsFolder?: boolean;
}) => {
  const spaceId = useEnvironment().spaceId;

  const nodeMap = useRef(new Map<React.Key, TreeNode>());
  const loadedKeys = useRef(new Map<React.Key, boolean>());

  const [tree, setTree] = useState<TreeNode[]>(() => {
    if (!rootNodes) return [];

    const initialNodes = rootNodes.map(generateNode);
    for (const node of initialNodes) {
      // In development react runs this function twice,
      // but only uses the output from the first run
      // This leads to the map having the wrong nodes
      if (!nodeMap.current.has(node.key)) nodeMap.current.set(node.key, node);
    }

    return initialNodes;
  });

  const loadData = async (node?: TreeNode) => {
    const nodeId = node?.element.id;

    let rootNode: TreeNode | undefined;
    if (!nodeId && showRootAsFolder) {
      const rootFolder = await getFolder(spaceId);
      if ('error' in rootFolder) return;

      rootNode = generateNode({ type: 'folder', name: '< root >', id: rootFolder.id });
      if (newChildrenHook) rootNode = newChildrenHook?.([rootNode])[0];

      if (!rootNode) return;

      nodeMap.current.set(rootNode.key, rootNode);

      console.log({ rootNode });
    }

    const parentNode = nodeId ? nodeMap.current.get(nodeId) : rootNode;

    // get children nodes
    const children = await getFolderContents(spaceId, nodeId);
    if ('error' in children) return;
    let childrenNodes = children.map(generateNode);
    if (newChildrenHook) childrenNodes = newChildrenHook(childrenNodes, parentNode);
    for (const node of childrenNodes) nodeMap.current.set(node.key, node);

    if (parentNode) {
      parentNode!.children = childrenNodes;
      parentNode!.isLeaf = childrenNodes.length === 0;
      loadedKeys.current.set(parentNode.key, true);
    }

    if (nodeId) {
      // trigger re-render
      setTree((currentTree) => [...currentTree]);
    } else {
      setTree(parentNode ? [parentNode] : childrenNodes);
    }
  };

  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (rootNodes) return;

    async function loadRoot() {
      setLoading(true);
      try {
        await loadData();
      } catch (e) {}
      setLoading(false);
    }

    loadRoot();
  }, [rootNodes]);

  return (
    <ProceedLoadingIndicator loading={loading}>
      {/* <Spin spinning={loading}> */}
      <Tree
        showIcon={true}
        style={{
          minHeight: '1.2rem',
          overflow: 'hidden',
          textWrap: 'nowrap',
          whiteSpace: 'nowrap',
        }}
        {...treeProps}
        treeData={tree}
        loadData={loadData}
        // It is okay to not use a state variable, because whenever loadedKeys is updated in
        // loadData, we also trigger a rerender, such that the rendered Tree will always have the
        // correct loadedKeys
        loadedKeys={[...loadedKeys.current.keys()]}
        onSelect={(selectedKeys) => {
          // console.log({ selectedKeys });
          const nextFolder = getCorrespondingFolder(selectedKeys[0], nodeMap.current);
          console.log(nextFolder);
        }}
      />
      {/* </Spin> */}
    </ProceedLoadingIndicator>
  );
};
