'use client';

import { getFolderChildren } from '@/lib/data/folders';
import { Tree, TreeProps } from 'antd';
type DirectoryTreeProps = ComponentProps<typeof Tree.DirectoryTree>;
import React, { ComponentProps, useEffect, useRef, useState } from 'react';
import { useEnvironment } from './auth-can';

type FolderChildren = {
  id: string;
  name: string;
  type?: string;
};

type TreeNode = NonNullable<TreeProps['treeData']>[number] & { element: FolderChildren };

function generateNode(element: FolderChildren): TreeNode {
  let isLeaf = false;

  if (element.type && element.type !== 'folder') isLeaf = true;

  return {
    key: element.id,
    title: element.name,
    isLeaf,
    element,
  };
}

export const FolderTree = ({
  rootNodes,
  newChildrenHook,
  treeProps,
}: {
  rootNodes?: FolderChildren[];
  /** The return value is used to update the tree */
  newChildrenHook?: (nodes: TreeNode[], parent?: TreeNode) => TreeNode[];
  treeProps?: DirectoryTreeProps;
}) => {
  const spaceId = useEnvironment().spaceId;

  const nodeMap = useRef(new Map<React.Key, TreeNode>());

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

    const children = await getFolderChildren(spaceId, nodeId);
    if ('error' in children) return;
    if (children.length === 0) return;

    let childrenNodes = children.map(generateNode);

    const actualNode = nodeId ? nodeMap.current.get(nodeId) : undefined;
    if (newChildrenHook) childrenNodes = newChildrenHook(childrenNodes, actualNode);

    for (const node of childrenNodes) nodeMap.current.set(node.key, node);

    if (nodeId) {
      actualNode!.children = childrenNodes;
      // trigger re-render
      setTree((currentTree) => [...currentTree]);
    } else {
      setTree(childrenNodes);
    }
  };

  useEffect(() => {
    if (!rootNodes) {
      loadData();
    }
  }, [rootNodes]);

  return <Tree.DirectoryTree {...treeProps} treeData={tree} loadedKeys={[]} loadData={loadData} />;
};
