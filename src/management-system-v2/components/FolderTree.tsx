'use client';

import { getFolderChildren } from '@/lib/data/folders';
import { Tree, TreeProps } from 'antd';
type DirectoryTreeProps = ComponentProps<typeof Tree.DirectoryTree>;
import React, { ComponentProps, useRef, useState } from 'react';
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
  treeProps,
}: {
  rootNodes: FolderChildren[];
  treeProps?: DirectoryTreeProps;
}) => {
  const spaceId = useEnvironment().spaceId;

  const nodeMap = useRef(new Map<React.Key, TreeNode>());

  const [tree, setTree] = useState<TreeNode[]>(() => {
    const initialNodes = rootNodes.map(generateNode);
    for (const node of initialNodes) {
      // In development react runs this function twice,
      // but only uses the output from the first run
      // This leads to the map having the wrong nodes
      if (!nodeMap.current.has(node.key)) nodeMap.current.set(node.key, node);
    }

    return initialNodes;
  });

  return (
    <Tree.DirectoryTree
      {...treeProps}
      treeData={tree}
      loadData={async (node) => {
        const children = await getFolderChildren(node.element.id, spaceId);
        if ('error' in children) return;

        const actualNode = nodeMap.current.get(node.key)!;

        if (children.length > 0) {
          const childrenNodes = children.map(generateNode);
          for (const node of childrenNodes) nodeMap.current.set(node.key, node);
          actualNode.children = childrenNodes;
        }

        // trigger re-render
        setTree((currentTree) => [...currentTree]);
      }}
    />
  );
};
