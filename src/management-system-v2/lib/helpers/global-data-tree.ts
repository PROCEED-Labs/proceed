import type { DataNode } from 'antd/es/tree';

// The scope filters for global data objects
export type ScopeFilter = '@worker' | '@process-initiator' | '@organization';

/**
 * Recursively builds Ant Design tree nodes from a config parameter array.
 * The 'data' node at depth 0 is treated as a non-selectable expander
 * only its children and deeper nodes are selectable.
 */
export function buildTreeNodes(params: any[], pathPrefix: string, depth: number): DataNode[] {
  return params.map((param) => {
    const currentPath = pathPrefix ? `${pathPrefix}.${param.name}` : param.name;
    const hasChildren = param.subParameters?.length > 0;

    // The 'data' node at the top level is a structural container, not selectable
    const isDataNode = param.name === 'data' && depth === 0;
    const isSelectable = !isDataNode;

    return {
      key: currentPath,
      title: param.displayName?.find((d: any) => d.language === 'en')?.text || param.name,
      selectable: isSelectable,
      children: hasChildren
        ? buildTreeNodes(param.subParameters, currentPath, depth + 1)
        : undefined,
    };
  });
}

/**
 * Builds a scoped tree of global data objects from the raw config response.
 *
 * - '@organization' reads from the 'organization' top-level node
 * - '@worker' reads from 'common-user-data', paths prefixed with '@worker.data'
 * - '@process-initiator' same structure as worker but with `@process-initiator` prefix
 *
 * Both worker and process-initiator display the same data (common-user-data) but
 * generate different path prefixes so the correct modifier is used in the final token.
 */
export function buildScopedTree(config: any, scope: ScopeFilter): DataNode[] {
  const content = config.content ?? [];
  const nodes: DataNode[] = [];

  for (const topLevel of content) {
    if (topLevel.name === 'organization') {
      if (scope !== '@organization') continue;
      const children = buildTreeNodes(topLevel.subParameters, '@global.@organization', 0);
      nodes.push(...children);

    } else if (topLevel.name === 'identity-and-access-management') {
      const commonUserData = topLevel.subParameters.find(
        (p: any) => p.name === 'common-user-data',
      );

      // Worker scope: show common-user-data with @worker prefix
      if (commonUserData && scope === '@worker') {
        const children = buildTreeNodes(commonUserData.subParameters, '@global.@worker.data', 0);
        nodes.push(...children);
      }

      // Process-initiator scope: same data as worker but different prefix
      if (commonUserData && scope === '@process-initiator') {
        const children = buildTreeNodes(
          commonUserData.subParameters,
          '@global.@process-initiator.data',
          0,
        );
        nodes.push(...children);
      }
    }
  }

  return nodes;
}