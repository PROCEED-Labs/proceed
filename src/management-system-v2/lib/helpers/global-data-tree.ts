import type { DataNode } from 'antd/es/tree';

/** The scope filters for global data objects */
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

    return {
      key: currentPath,
      title: param.displayName?.find((d: any) => d.language === 'en')?.text || param.name,
      selectable: !isDataNode,
      children: hasChildren
        ? buildTreeNodes(param.subParameters, currentPath, depth + 1)
        : undefined,
    };
  });
}

/**
 * Builds tree nodes for a user-scoped filter (@worker or @process-initiator).
 * Both scopes show the same data (common-user-data + userInfo) but with different path prefixes.
 */
function buildUserScopedNodes(iamTopLevel: any, scopePrefix: string): DataNode[] {
  const nodes: DataNode[] = [];

  const commonUserData = iamTopLevel.subParameters.find((p: any) => p.name === 'common-user-data');

  // Non-selectable "Data" parent for common-user-data
  if (commonUserData) {
    nodes.push({
      key: `${scopePrefix}.data`,
      title: 'Data',
      selectable: false,
      children: buildTreeNodes(commonUserData.subParameters, `${scopePrefix}.data`, 1),
    });
  }

  // Non-selectable "User Info" parent
  const userSection = iamTopLevel.subParameters.find((p: any) => p.name === 'user');
  const anyUser = userSection?.subParameters?.[0];
  const userInfo = anyUser?.subParameters?.find((p: any) => p.name === 'userInfo');

  if (userInfo?.subParameters) {
    nodes.push({
      key: `${scopePrefix}.userInfo`,
      title: 'User Info',
      selectable: false,
      children: buildTreeNodes(userInfo.subParameters, `${scopePrefix}.userInfo`, 1),
    });
  }

  return nodes;
}

/**
 * Builds a scoped tree of global data objects from the raw config response.
 *
 * '@organization' reads from the 'organization' top-level node
 * '@worker' reads from 'common-user-data' + 'userInfo', paths prefixed with '@global.@worker'
 * '@process-initiator' same structure as worker but with '@global.@process-initiator'
 */
export function buildScopedTree(config: any, scope: ScopeFilter): DataNode[] {
  const content = config.content ?? [];
  const nodes: DataNode[] = [];

  for (const topLevel of content) {
    if (topLevel.name === 'organization') {
      if (scope !== '@organization') continue;
      nodes.push(...buildTreeNodes(topLevel.subParameters, '@global.@organization', 0));
    } else if (topLevel.name === 'identity-and-access-management') {
      if (scope === '@worker') {
        nodes.push(...buildUserScopedNodes(topLevel, '@global.@worker'));
      } else if (scope === '@process-initiator') {
        nodes.push(...buildUserScopedNodes(topLevel, '@global.@process-initiator'));
      }
    }
  }

  return nodes;
}
