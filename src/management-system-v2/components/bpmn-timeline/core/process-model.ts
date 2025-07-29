/**
 * Hierarchical process model for proper sub-process handling
 */

import type { BPMNFlowElement } from '../types/types';

/**
 * Represents a process scope (main process or sub-process)
 * Each scope contains elements and can have child scopes
 */
export interface ProcessScope {
  id: string; // Scope ID (process ID or sub-process ID)
  type: 'process' | 'subProcess';
  elements: Map<string, BPMNFlowElement>; // Elements in this scope
  childScopes: Map<string, ProcessScope>; // Nested sub-processes
  parent?: ProcessScope;
  bpmnElement?: BPMNFlowElement; // The sub-process element itself (if subProcess)
}

/**
 * Context for traversing a specific scope
 */
export interface TraversalContext {
  scope: ProcessScope;
  currentTime: number;
  visitedInScope: Map<string, number>; // Visit count per element in this scope
  parentInstanceId?: string; // Instance ID of parent sub-process
  pathKey: string;
  instanceCounter: { value: number }; // Shared counter for unique instance IDs across all scopes
}

/**
 * Represents a process element instance after traversal
 */
export interface ProcessInstance {
  elementId: string;
  instanceId: string;
  scopeId: string; // Which scope this belongs to
  scopeInstanceId?: string; // Instance ID of the scope (for sub-processes)
  parentInstanceId?: string; // Direct parent instance
  startTime: number;
  endTime: number;
  duration: number;
  children: ProcessInstance[]; // Child instances (for sub-processes)
  dependencies: Array<{
    sourceInstanceId: string;
    targetInstanceId: string;
    flowId: string;
  }>;
}

/**
 * Build hierarchical scopes from flat BPMN elements
 */
export function buildScopes(elements: BPMNFlowElement[]): ProcessScope {
  // Create root scope for main process
  const rootScope: ProcessScope = {
    id: 'main-process',
    type: 'process',
    elements: new Map(),
    childScopes: new Map(),
  };

  // First pass: categorize elements by their parent scope
  const elementsByScope = new Map<string, BPMNFlowElement[]>();
  elementsByScope.set('main-process', []);

  elements.forEach((element, index) => {
    const parentId = (element as any).parentSubProcessId || 'main-process';
    const hasParent = !!(element as any).parentSubProcessId;

    if (!elementsByScope.has(parentId)) {
      elementsByScope.set(parentId, []);
    }

    elementsByScope.get(parentId)!.push(element);
  });

  // Second pass: build scope hierarchy
  function createScope(
    scopeId: string,
    scopeType: 'process' | 'subProcess',
    parent?: ProcessScope,
  ): ProcessScope {
    const scope: ProcessScope = {
      id: scopeId,
      type: scopeType,
      elements: new Map(),
      childScopes: new Map(),
      parent,
    };

    // Add elements to this scope
    const scopeElements = elementsByScope.get(scopeId) || [];
    scopeElements.forEach((element) => {
      scope.elements.set(element.id, element);

      // If this element is an expanded sub-process, create a child scope for it
      if (isSubProcessExpanded(element)) {
        const childScope = createScope(element.id, 'subProcess', scope);
        childScope.bpmnElement = element;
        scope.childScopes.set(element.id, childScope);
      }
    });

    return scope;
  }

  // Build from root
  const mainScope = createScope('main-process', 'process');

  // Also need to handle elements that are directly in main process
  elements.forEach((element) => {
    if (!(element as any).parentSubProcessId) {
      mainScope.elements.set(element.id, element);

      // If it's a sub-process, ensure child scope exists
      if (element.$type === 'bpmn:SubProcess' && isExpandedSubProcess(element)) {
        if (!mainScope.childScopes.has(element.id)) {
          const childScope = createScope(element.id, 'subProcess', mainScope);
          childScope.bpmnElement = element;
          mainScope.childScopes.set(element.id, childScope);
        }
      }
    }
  });

  return mainScope;
}

/**
 * Check if element is a sub-process (all sub-processes are treated as expanded)
 */
function isExpandedSubProcess(element: BPMNFlowElement): boolean {
  return element.$type === 'bpmn:SubProcess';
}

/**
 * Check if element is a sub-process (exported for external use) - all sub-processes are treated as expanded
 */
export function isSubProcessExpanded(element: BPMNFlowElement): boolean {
  return isExpandedSubProcess(element);
}

/**
 * Flatten process instances from hierarchical scope structure
 */
export function flattenInstances(rootInstances: ProcessInstance[]): ProcessInstance[] {
  const flattened: ProcessInstance[] = [];
  const seenInstanceIds = new Set<string>();

  function flatten(instances: ProcessInstance[]) {
    instances.forEach((instance) => {
      // Check for duplicate instance IDs during flattening
      if (seenInstanceIds.has(instance.instanceId)) {
        return; // Skip duplicate
      }

      seenInstanceIds.add(instance.instanceId);
      flattened.push(instance);
      if (instance.children && instance.children.length > 0) {
        flatten(instance.children);
      }
    });
  }

  flatten(rootInstances);
  return flattened;
}

/**
 * Build instance tree from flat instances
 */
export function buildInstanceTree(instances: ProcessInstance[]): ProcessInstance[] {
  const instanceMap = new Map<string, ProcessInstance>();
  const rootInstances: ProcessInstance[] = [];

  // First pass: index all instances
  instances.forEach((instance) => {
    instanceMap.set(instance.instanceId, instance);
    instance.children = []; // Initialize children array
  });

  // Second pass: build tree
  instances.forEach((instance) => {
    if (instance.parentInstanceId) {
      const parent = instanceMap.get(instance.parentInstanceId);
      if (parent) {
        parent.children.push(instance);
      }
    } else {
      rootInstances.push(instance);
    }
  });

  return rootInstances;
}
