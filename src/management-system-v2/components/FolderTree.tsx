'use client';

import { getFolder, getFolderContents } from '@/lib/data/folders';
import { Tree, TreeProps } from 'antd';
import React, {
  Dispatch,
  ReactNode,
  SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useEnvironment } from './auth-can';
import { ProcessListItemIcon } from './process-list';
import ProceedLoadingIndicator from './loading-proceed';
import { UserError, isUserErrorResponse } from '@/lib/user-error';

type FolderChildren = {
  id: string;
  name: ReactNode;
  type: string;
};

export type TreeNode<TElement> = NonNullable<TreeProps['treeData']>[number] & { element: TElement };

export function generateTreeNode<TElement extends FolderChildren>(
  element: TElement,
): TreeNode<TElement> {
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

export const FolderTree = <TContentType extends FolderChildren = FolderChildren>({
  rootNodes,
  newChildrenHook,
  treeProps,
  showRootAsFolder,
  onSelect: onExternalSelect,
  selectedKeys: externalSelectedKeys,
  subtreesToReload,
  onExpand: onExternalExpand,
  expandedKeys: externalExpandedKeys,
  customGetContent,
  onTreeDataChange,
  // Managed State
  treeData,
}: {
  rootNodes?: TContentType[];
  /** The return value is used to update the tree */
  newChildrenHook?: (args: {
    nodes: TreeNode<TContentType>[];
    parent?: TreeNode<TContentType>;
  }) => TreeNode<TContentType>[];
  treeProps?: TreeProps<TreeNode<TContentType>>;
  showRootAsFolder?: boolean;
  onSelect?: (folder: TContentType | undefined) => void;
  selectedKeys?: React.Key[];
  subtreesToReload?: string[];
  onExpand?: (expanded: React.Key[]) => void;
  expandedKeys?: React.Key[];
  customGetContent?: (
    spaceId: string,
    folderId?: string,
  ) => Promise<TContentType[] | { error: UserError }>;
  onTreeDataChange?: (newTreeData: SetStateAction<TreeNode<TContentType>[]>) => void;
  // Managed State
  treeData?: TreeNode<TContentType>[];
}) => {
  const spaceId = useEnvironment().spaceId;

  const nodeMap = useRef(new Map<React.Key, TreeNode<TContentType>>());
  const loadedKeys = useRef(new Map<React.Key, boolean>());
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);

  const [_tree, _setTree] = useState<TreeNode<TContentType>[]>(() => {
    if (!rootNodes) return [];

    const initialNodes = rootNodes.map(generateTreeNode);
    for (const node of initialNodes) {
      // In development react runs this function twice,
      // but only uses the output from the first run
      // This leads to the map having the wrong nodes
      if (!nodeMap.current.has(node.key)) nodeMap.current.set(node.key, node);
    }

    return initialNodes;
  });
  const setTree = useCallback(
    (arg: SetStateAction<TreeNode<TContentType>[]>) => {
      _setTree(arg);
      onTreeDataChange?.(arg);
    },
    [onTreeDataChange],
  );
  const tree = treeData ?? _tree;

  // Keep nodeMap up to date in case the component doesn't control additions to the tree
  useEffect(() => {
    if (!treeData) return;

    function updateTreeNode(nodes: TreeNode<TContentType>[]) {
      for (const node of nodes) {
        nodeMap.current.set(node.element.id, node);

        if (node.children && typeof node.children !== 'function') {
          updateTreeNode(node.children as TreeNode<TContentType>[]);
        }
      }
    }

    updateTreeNode(treeData);
  }, [treeData]);

  /**
   * Fetches the contents of a tree node and updates the state as necessary.
   * If no node is given, the function fetches the root folder of the environment.
   * */
  const loadData = async (node?: TreeNode<TContentType>) => {
    const nodeId = node?.element.id;

    let rootNode: TreeNode<TContentType> | undefined;
    if (!nodeId && showRootAsFolder) {
      const rootFolder = await getFolder(spaceId);
      if ('error' in rootFolder) return;

      rootNode = generateTreeNode({
        // TODO: this needs to be corrected
        type: 'folder',
        name: '< root >',
        id: rootFolder.id,
      } as TContentType);
      if (newChildrenHook) rootNode = newChildrenHook?.({ nodes: [rootNode] })[0];

      // TODO: raise error
      if (!rootNode) return;

      nodeMap.current.set(rootNode.key, rootNode);
    }

    const parentNode = nodeId ? nodeMap.current.get(nodeId) : rootNode;

    // get children nodes
    let _children;
    if (customGetContent) {
      _children = await customGetContent(spaceId, nodeId);
    } else {
      _children = await getFolderContents(spaceId, nodeId);
    }

    // TODO: give some warning
    if (isUserErrorResponse(_children)) return;

    const children = _children as unknown as TContentType[];

    let childrenNodes = children.map(generateTreeNode);
    if (newChildrenHook) {
      childrenNodes = newChildrenHook({ nodes: childrenNodes, parent: parentNode });
    }

    for (const node of childrenNodes) nodeMap.current.set(node.key, node);

    if (parentNode) {
      parentNode.children = childrenNodes;
      parentNode.isLeaf = childrenNodes.length === 0;
      loadedKeys.current.set(parentNode.key, true);
    }

    if (nodeId) {
      // trigger re-render
      // The new nodes where already placed in the object
      setTree((currentTree) => [...currentTree]);
    } else {
      // When there is no parentNode that means that we're loading the children of the rootFolder
      // If there exists a parentNode it is because showRootAsFolder is true, thus we set it as
      // the first node of the tree.
      // If showRootAsFolder is false we add the children as the root nodes of the tree
      setTree(parentNode ? [parentNode] : childrenNodes);
    }
  };

  const [loading, setLoading] = useState(false);

  // This effect loads the root folder in case no rootNodes were given
  useEffect(() => {
    if (rootNodes) return;

    async function loadRoot() {
      setLoading(true);
      try {
        await loadData();
      } catch (e) {
        console.error('Error loading root');
        console.error(e);
      }
      setLoading(false);
    }

    loadRoot();
  }, [rootNodes]);

  useEffect(() => {
    if (!externalExpandedKeys) return;

    async function loadExpandedKeys() {
      try {
        // build the initial tree if there are supposed to be nodes expanded from the start
        // this needs to be sequential, otherwise the states won't match
        if (externalExpandedKeys?.length) {
          for (const key of externalExpandedKeys.slice(1)) {
            const node = nodeMap.current.get(key);
            if (node && node.element.type === 'folder' && !('children' in node)) {
              await loadData(node);
            }
          }
        }

        setExpandedKeys((_prev) => Array.from(new Set([..._prev, ...externalExpandedKeys!])));
      } catch (e) {
        console.error('Error loading folder contents');
        console.error(e);
      }
    }

    loadExpandedKeys();
  }, [externalExpandedKeys]);

  useEffect(() => {
    // reload the subtree if there have been changes made inside it
    if (subtreesToReload) {
      const toUpdate = [] as React.Key[];

      for (const id of subtreesToReload) {
        const node = nodeMap.current.get(id);
        if (node && node.element.type === 'folder') {
          toUpdate.push(id);
        }
      }

      for (const id of toUpdate) {
        const node = nodeMap.current.get(id);

        // As long as to update goes from parent to child,
        // toUpdate should maintain that same order
        // This is important because if we fetch a child first it will be overwritten when
        // fetching the parent.
        if (node?.children) {
          for (const childNode of node.children as TreeNode<TContentType>[]) {
            if (childNode.element.type === 'folder') {
              toUpdate.push(childNode.element.id);
            }
          }
        }
      }

      async function update() {
        try {
          for (const id of toUpdate) {
            const node = nodeMap.current.get(id);
            if (node) await loadData(node);
          }
        } catch (e) {
          console.error('Error updating subtrees');
          console.error(e);
        }
      }

      update();
    }
  }, [subtreesToReload]);

  return (
    <ProceedLoadingIndicator loading={loading}>
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
        selectedKeys={externalSelectedKeys || selectedKeys}
        onSelect={(selectedKeys, { node }) => {
          if (onExternalSelect) {
            onExternalSelect(node.element);
          }
          setSelectedKeys(selectedKeys);
        }}
        expandedKeys={expandedKeys}
        onExpand={(expanded) => {
          if (onExternalExpand) {
            onExternalExpand(expanded);
          }
          setExpandedKeys(expanded);
        }}
      />
    </ProceedLoadingIndicator>
  );
};
