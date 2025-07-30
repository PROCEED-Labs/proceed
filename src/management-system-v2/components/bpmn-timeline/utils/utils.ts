/**
 * Utility functions for BPMN timeline transformation
 */

import type { BPMNBaseElement, BPMNTask, BPMNEvent, BPMNGateway } from '../types/types';
import {
  isGatewayElement,
  isExclusiveGateway,
  isParallelGateway,
} from '../transformers/element-transformers';
import { MAX_RECURSION_DEPTH } from '../constants';

// ============================================================================
// Duration and Time Utilities
// ============================================================================

/**
 * Parse ISO 8601 duration format (e.g., "P1D", "PT2H", "P1DT2H30M")
 * Returns duration in milliseconds
 */
export function parseISO8601Duration(duration: string | undefined): number {
  if (!duration) return 0;

  // Support ISO 8601 durations like "P1D", "PT2H", "P1DT2H30M", etc.
  // Only supports days, hours, minutes, seconds (no months/years)
  const regex = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/;
  const matches = duration.match(regex);

  if (!matches) {
    return 0; // Invalid ISO 8601 duration format
  }

  // matches[1]: days, matches[2]: hours, matches[3]: minutes, matches[4]: seconds
  const days = matches[1] ? parseInt(matches[1], 10) : 0;
  const hours = matches[2] ? parseInt(matches[2], 10) : 0;
  const minutes = matches[3] ? parseInt(matches[3], 10) : 0;
  const seconds = matches[4] ? parseInt(matches[4], 10) : 0;

  // Convert to milliseconds
  return (days * 24 * 60 * 60 + hours * 60 * 60 + minutes * 60 + seconds) * 1000;
}

/**
 * Extract gateway metadata from a synthetic flow element
 */
export function extractGatewayMetadata(element: BPMNBaseElement): {
  gatewayType?: string;
  gatewayId?: string;
  pathId?: string;
} {
  if (!element.extensionElements?.values) {
    return {};
  }

  for (const extension of element.extensionElements.values) {
    if (extension.$children) {
      const result: { gatewayType?: string; gatewayId?: string; pathId?: string } = {};

      for (const child of extension.$children) {
        if (child.$type === 'proceed:gatewayType' && child.$body) {
          result.gatewayType = child.$body;
        } else if (child.$type === 'proceed:gatewayId' && child.$body) {
          result.gatewayId = child.$body;
        } else if (child.$type === 'proceed:pathId' && child.$body) {
          result.pathId = child.$body;
        }
      }

      if (result.gatewayType || result.gatewayId || result.pathId) {
        return result;
      }
    }
  }

  return {};
}

/**
 * Extract duration from BPMN extension elements
 */
export function extractDuration(element: BPMNBaseElement): number {
  if (!element.extensionElements?.values) {
    return 0;
  }

  for (const extension of element.extensionElements.values) {
    // Check for direct timePlannedDuration property on extension
    if ((extension as any).timePlannedDuration && (extension as any).timePlannedDuration.value) {
      const durationValue = (extension as any).timePlannedDuration.value;
      return parseISO8601Duration(durationValue);
    }

    // Check in $children for nested structure
    if (extension.$children) {
      for (const child of extension.$children) {
        // Check for proceed:timePlannedDuration in multiple formats
        if (child.$type === 'proceed:timePlannedDuration') {
          const durationValue = (child as any).value || child.$body;
          if (durationValue) {
            return parseISO8601Duration(durationValue);
          }
        }

        // Legacy check with name property
        if (child.name === 'proceed:timePlannedDuration') {
          const durationValue = (child as any).value || child.$body;
          if (durationValue) {
            return parseISO8601Duration(durationValue);
          }
        }
      }
    }
  }

  return 0;
}

// ============================================================================
// BPMN Element Type Detection
// ============================================================================

/**
 * Check if element is a supported task type
 */
export function isTaskElement(element: { $type: string }): boolean {
  return (
    element.$type.includes('Task') ||
    element.$type === 'bpmn:CallActivity' ||
    element.$type === 'bpmn:SubProcess' ||
    element.$type === 'bpmn:AdHocSubProcess' ||
    element.$type === 'bpmn:Transaction'
  );
}

/**
 * Check if element is a sub-process (all sub-processes are treated as expanded)
 */
export function isExpandedSubProcess(element: any): boolean {
  return (
    element.$type === 'bpmn:SubProcess' ||
    element.$type === 'bpmn:AdHocSubProcess' ||
    element.$type === 'bpmn:Transaction'
  );
}

/**
 * Flatten sub-processes, adding hierarchy metadata to child elements
 * All sub-processes are treated as expanded in our BPMN structure
 */
export function flattenExpandedSubProcesses(
  elements: any[],
  parentId?: string,
  hierarchyLevel: number = 0,
): any[] {
  const flattened: any[] = [];

  elements.forEach((element) => {
    if (isExpandedSubProcess(element)) {
      // Add the sub-process itself with hierarchy info
      const subProcessWithHierarchy = {
        ...element,
        hierarchyLevel,
        parentSubProcessId: parentId,
        isExpandedSubProcess: true,
      };
      flattened.push(subProcessWithHierarchy);

      // Recursively flatten child elements with increased hierarchy level
      // If flowElements exists, use it; otherwise treat as atomic sub-process
      if (element.flowElements && Array.isArray(element.flowElements)) {
        const childElements = flattenExpandedSubProcesses(
          element.flowElements,
          element.id,
          hierarchyLevel + 1,
        );
        flattened.push(...childElements);
      }
    } else {
      // Regular element, add hierarchy info if it's inside a sub-process
      // For boundary events, explicitly preserve the attachedToRef property
      // For sequence flows, explicitly preserve the sourceRef and targetRef properties
      const elementWithHierarchy = {
        ...element,
        hierarchyLevel,
        parentSubProcessId: parentId,
        // Explicitly preserve attachedToRef for boundary events
        ...(element.attachedToRef && { attachedToRef: element.attachedToRef }),
        // Explicitly preserve sourceRef and targetRef for sequence flows
        ...(element.sourceRef && { sourceRef: element.sourceRef }),
        ...(element.targetRef && { targetRef: element.targetRef }),
      };
      flattened.push(elementWithHierarchy);
    }
  });

  return flattened;
}

/**
 * Check if element is a supported event type (including BoundaryEvents)
 */
export function isSupportedEventElement(element: { $type: string }): boolean {
  return (
    element.$type === 'bpmn:StartEvent' ||
    element.$type === 'bpmn:EndEvent' ||
    element.$type === 'bpmn:IntermediateThrowEvent' ||
    element.$type === 'bpmn:IntermediateCatchEvent' ||
    element.$type === 'bpmn:BoundaryEvent'
  );
}

/**
 * Check if element is a boundary event
 */
export function isBoundaryEventElement(element: { $type: string }): boolean {
  return element.$type === 'bpmn:BoundaryEvent';
}

/**
 * Check if element is a sequence flow
 */
export function isSequenceFlowElement(element: { $type: string }): boolean {
  return element.$type === 'bpmn:SequenceFlow';
}

/**
 * Check if element is an informational artifact
 */
export function isInformationalArtifact(element: { $type: string }): boolean {
  return (
    element.$type === 'bpmn:TextAnnotation' ||
    element.$type === 'bpmn:DataObject' ||
    element.$type === 'bpmn:DataObjectReference' ||
    element.$type === 'bpmn:DataStore' ||
    element.$type === 'bpmn:DataStoreReference' ||
    element.$type === 'bpmn:Group' ||
    element.$type === 'proceed:genericResource' ||
    element.$type === 'proceed:GenericResource' // Note the capital 'G'
  );
}

// ============================================================================
// Element Type Generation
// ============================================================================

/**
 * Get task type string for elementType display
 */
export function getTaskTypeString(task: BPMNTask): string {
  // Extract the specific task type from $type
  const typeMatch = task.$type.match(/bpmn:(.+)/);
  const taskType = typeMatch ? typeMatch[1] : 'Task';

  // All sub-processes are treated as expanded, no special suffix needed

  // Make task types more readable
  const readableTypes: Record<string, string> = {
    Task: 'Task',
    UserTask: 'User Task',
    ServiceTask: 'Service Task',
    ScriptTask: 'Script Task',
    BusinessRuleTask: 'Business Rule Task',
    SendTask: 'Send Task',
    ReceiveTask: 'Receive Task',
    ManualTask: 'Manual Task',
    CallActivity: 'Call Activity',
    SubProcess: 'Subprocess',
    AdHocSubProcess: 'Ad-Hoc Subprocess',
    Transaction: 'Transaction',
    transaction: 'Transaction', // Handle lowercase
  };

  return readableTypes[taskType] || taskType;
}

/**
 * Get event type string for elementType display
 */
export function getEventTypeString(event: BPMNEvent): string {
  // Check if this is a boundary event
  const isBoundary = (event as any).attachedToRef !== undefined;

  // Get readable event definition type
  const readableEventDefinitions: Record<string, string> = {
    Message: 'Message',
    Timer: 'Timer',
    Error: 'Error',
    Escalation: 'Escalation',
    Cancel: 'Cancel',
    Compensation: 'Compensation',
    Conditional: 'Conditional',
    Link: 'Link',
    Signal: 'Signal',
    Terminate: 'Terminate',
  };

  let eventDefinition = '';
  if (event.eventDefinitions && event.eventDefinitions.length > 0) {
    const defType = event.eventDefinitions[0].$type;
    const defMatch = defType.match(/bpmn:(.+)EventDefinition/);
    if (defMatch) {
      eventDefinition = readableEventDefinitions[defMatch[1]] || defMatch[1];
    }
  }

  // Get readable event kind
  let eventKind = '';
  if (event.$type === 'bpmn:StartEvent') {
    eventKind = 'Start';
  } else if (event.$type === 'bpmn:EndEvent') {
    eventKind = 'End';
  } else if (event.$type === 'bpmn:IntermediateThrowEvent') {
    eventKind = 'Intermediate';
  } else if (event.$type === 'bpmn:IntermediateCatchEvent') {
    eventKind = 'Intermediate';
  }

  // Build the result - include "boundary event" prefix for boundary events
  let result = '';
  if (eventDefinition && eventKind) {
    result = `${eventDefinition} (${eventKind})`;
  } else if (eventDefinition) {
    result = eventDefinition;
  } else if (eventKind) {
    result = eventKind;
  }

  // Add boundary event prefix if this is a boundary event
  if (isBoundary && result) {
    result = `${result} Boundary Event`;
  } else if (isBoundary) {
    result = 'Boundary Event';
  }

  return result;
}

/**
 * Get gateway type string for elementType display
 */
export function getGatewayTypeString(gateway: BPMNGateway): string {
  // Extract the specific gateway type from $type
  const typeMatch = gateway.$type.match(/bpmn:(.+)/);
  const gatewayType = typeMatch ? typeMatch[1] : 'Gateway';

  // Make gateway types more readable
  const readableTypes: Record<string, string> = {
    ExclusiveGateway: 'Exclusive (XOR)',
    InclusiveGateway: 'Inclusive (OR)',
    ParallelGateway: 'Parallel (AND)',
    ComplexGateway: 'Complex',
    EventBasedGateway: 'Event-based',
  };

  return readableTypes[gatewayType] || gatewayType;
}

// ============================================================================
// Error Classification
// ============================================================================

/**
 * Get error reason for unsupported elements
 */
export function getUnsupportedElementReason(elementType: string): string {
  if (elementType.includes('Gateway')) {
    return 'Gateways not yet supported';
  } else {
    return 'Unknown element type';
  }
}

// ============================================================================
// Color Assignment and Flow Analysis
// ============================================================================

import { FLOW_COLOR_PALETTE } from '../constants';

/**
 * Find connected components in the BPMN flow using depth-first search
 */
export function findConnectedComponents(
  elements: Array<{
    id: string;
    $type: string;
    incoming?: string[];
    outgoing?: string[];
    sourceRef?: any;
    targetRef?: any;
  }>,
): Map<string, number> {
  const elementToComponent = new Map<string, number>();
  const visited = new Set<string>();
  const adjacencyList = new Map<string, Set<string>>();

  // Build adjacency list for all non-sequence-flow elements
  const nonFlowElements = elements.filter((el) => el.$type !== 'bpmn:SequenceFlow');
  const sequenceFlows = elements.filter((el) => el.$type === 'bpmn:SequenceFlow');

  // Initialize adjacency list
  nonFlowElements.forEach((element) => {
    adjacencyList.set(element.id, new Set());
  });

  // Add connections based on sequence flows
  sequenceFlows.forEach((flow) => {
    const sourceId = typeof flow.sourceRef === 'string' ? flow.sourceRef : flow.sourceRef?.id;
    const targetId = typeof flow.targetRef === 'string' ? flow.targetRef : flow.targetRef?.id;

    if (sourceId && targetId && adjacencyList.has(sourceId) && adjacencyList.has(targetId)) {
      adjacencyList.get(sourceId)!.add(targetId);
      adjacencyList.get(targetId)!.add(sourceId); // Undirected graph for color grouping
    }
  });

  // Add boundary event connections to their attached tasks
  nonFlowElements.forEach((element) => {
    if (isBoundaryEventElement(element) && (element as any).attachedToRef) {
      const attachedToId =
        typeof (element as any).attachedToRef === 'string'
          ? (element as any).attachedToRef
          : (element as any).attachedToRef?.id;

      if (attachedToId && adjacencyList.has(element.id) && adjacencyList.has(attachedToId)) {
        adjacencyList.get(element.id)!.add(attachedToId);
        adjacencyList.get(attachedToId)!.add(element.id);
      }
    }
  });

  // Note: Sub-process parent-child connections are intentionally NOT added for color purposes
  // This ensures sub-process internal flows get their own colors separate from the parent flow
  // The hierarchy connection is handled separately in the sorting logic

  // Perform DFS to find connected components
  let componentId = 0;

  const dfs = (elementId: string, currentComponentId: number) => {
    visited.add(elementId);
    elementToComponent.set(elementId, currentComponentId);

    const neighbors = adjacencyList.get(elementId) || new Set();
    for (const neighborId of Array.from(neighbors)) {
      if (!visited.has(neighborId)) {
        dfs(neighborId, currentComponentId);
      }
    }
  };

  // Find all connected components
  for (const element of nonFlowElements) {
    if (!visited.has(element.id)) {
      dfs(element.id, componentId);
      componentId++;
    }
  }
  return elementToComponent;
}

/**
 * Assign colors to elements based on their connected components
 * Sub-process flows get distinct colors from main process flows
 */
export function assignFlowColors(
  elements: Array<{
    id: string;
    $type: string;
    incoming?: string[];
    outgoing?: string[];
    sourceRef?: any;
    targetRef?: any;
  }>,
): Map<string, string> {
  const elementToComponent = findConnectedComponents(elements);
  const elementToColor = new Map<string, string>();

  // Group elements by sub-process
  const mainProcessElements = new Set<string>();
  const subProcessGroups = new Map<string, Set<string>>();

  elements.forEach((element) => {
    const parentSubProcessId = (element as any).parentSubProcessId;
    if (parentSubProcessId) {
      // This element belongs to a sub-process
      if (!subProcessGroups.has(parentSubProcessId)) {
        subProcessGroups.set(parentSubProcessId, new Set());
      }
      subProcessGroups.get(parentSubProcessId)!.add(element.id);
    } else {
      // This element belongs to the main process
      mainProcessElements.add(element.id);
    }
  });

  // Assign colors with sub-process awareness

  elementToComponent.forEach((componentId, elementId) => {
    const parentSubProcessId = (elements.find((el) => el.id === elementId) as any)
      ?.parentSubProcessId;

    if (parentSubProcessId) {
      // Sub-process element - use offset color to distinguish from main process
      // Each sub-process gets colors offset from the main palette
      const subProcessIndex = Array.from(subProcessGroups.keys()).indexOf(parentSubProcessId);
      const colorIndex = (componentId + (subProcessIndex + 1) * 2) % FLOW_COLOR_PALETTE.length;
      elementToColor.set(elementId, FLOW_COLOR_PALETTE[colorIndex]);
    } else {
      // Main process element - use standard color assignment
      const colorIndex = componentId % FLOW_COLOR_PALETTE.length;
      elementToColor.set(elementId, FLOW_COLOR_PALETTE[colorIndex]);
    }
  });

  return elementToColor;
}

/**
 * Create a mapping from boundary event instance IDs to their attached task instance IDs
 * using the dependencies created during traversal
 */
export function createBoundaryEventMapping(
  dependencies: Array<{ sourceInstanceId: string; targetInstanceId: string; flowId?: string }>,
): Map<string, string> {
  const boundaryEventToTaskInstance = new Map<string, string>();

  dependencies.forEach((dep) => {
    // Look for attachment dependencies (boundary event as target)
    if (dep.flowId && dep.flowId.includes('_to_') && dep.flowId.includes('_attachment')) {
      boundaryEventToTaskInstance.set(dep.targetInstanceId, dep.sourceInstanceId);
    }
  });

  return boundaryEventToTaskInstance;
}

/**
 * Group and sort elements by connected components and start time
 * Start events appear first, end events appear last within each component
 * Boundary events are positioned directly below their attached tasks
 */
export function groupAndSortElements<
  T extends {
    id: string;
    start: number;
    elementType?: string;
    isBoundaryEvent?: boolean;
    attachedToId?: string;
  },
>(
  elements: T[],
  elementToComponent: Map<string, number>,
  chronologicalSorting: boolean = false,
  dependencies?: Array<{
    sourceId?: string;
    targetId?: string;
    sourceInstanceId?: string;
    targetInstanceId?: string;
    flowId?: string;
  }>,
): T[] {
  // Separate boundary events from regular elements
  const boundaryEvents = elements.filter((el) => (el as any).isBoundaryEvent);
  const regularElements = elements.filter((el) => !(el as any).isBoundaryEvent);

  // Group and sort elements with hierarchy-aware ordering
  const sortedRegularElements = sortElementsWithHierarchy(
    regularElements,
    elementToComponent,
    chronologicalSorting,
  );

  // Insert boundary events directly after their attached tasks
  const result = insertBoundaryEventsAfterTasks(
    sortedRegularElements,
    boundaryEvents,
    chronologicalSorting,
    dependencies,
  );

  return result;
}

/**
 * Sort elements respecting sub-process hierarchy
 * Sub-processes appear directly above their child elements
 */
/**
 * Sort elements by process flow - follows paths from start to end
 * Connected flows are grouped together, with subprocesses and boundary events as exceptions
 */
function sortByProcessFlow<
  T extends {
    id: string;
    start: number;
    elementType?: string;
  },
>(
  elements: T[],
  elementToComponent: Map<string, number>,
  chronologicalSorting: boolean = false,
): T[] {
  const result: T[] = [];

  // Helper to get base element ID (without instance suffix)
  const getBaseId = (id: string): string => {
    const parts = id.split('_instance_');
    return parts[0];
  };

  // Create a map to track original discovery order
  const discoveryOrder = new Map<string, number>();
  elements.forEach((element, index) => {
    discoveryOrder.set(element.id, index);
  });

  // Build parent-child relationships for sub-processes
  const parentToChildren = new Map<string, T[]>();
  const childToParent = new Map<string, string>();

  elements.forEach((element) => {
    const parentId = (element as any).parentSubProcessId;
    if (parentId) {
      childToParent.set(element.id, parentId);
      if (!parentToChildren.has(parentId)) {
        parentToChildren.set(parentId, []);
      }
      parentToChildren.get(parentId)!.push(element);
    }
  });

  // Separate root elements from subprocess children
  const rootElements = elements.filter((el) => !childToParent.has(el.id));

  // Group root elements by component first - this preserves connected flows
  const componentGroups = new Map<number, T[]>();
  rootElements.forEach((element) => {
    const componentId = elementToComponent.get(element.id) ?? -1;
    if (!componentGroups.has(componentId)) {
      componentGroups.set(componentId, []);
    }
    componentGroups.get(componentId)!.push(element);
  });

  // Sort component groups by the earliest time (either start time or discovery order)
  const sortedComponentGroups = Array.from(componentGroups.entries())
    .map(([componentId, componentElements]) => ({
      componentId,
      componentElements,
      earliestTime: chronologicalSorting
        ? Math.min(...componentElements.map((el) => el.start || Infinity))
        : Math.min(...componentElements.map((el) => discoveryOrder.get(el.id) ?? Infinity)),
    }))
    .sort((a, b) => a.earliestTime - b.earliestTime);

  // Process each component (connected flow) as a complete unit
  sortedComponentGroups.forEach(({ componentId, componentElements }) => {
    // Sort elements within the component directly, treating each instance as individual
    const sortedElements = [...componentElements];

    if (chronologicalSorting) {
      // Sort by start time
      sortedElements.sort((a, b) => (a.start || 0) - (b.start || 0));
    } else {
      // Sort by discovery order
      sortedElements.sort(
        (a, b) => (discoveryOrder.get(a.id) ?? 0) - (discoveryOrder.get(b.id) ?? 0),
      );
    }

    // Add each element and its subprocess children
    sortedElements.forEach((element) => {
      result.push(element);

      // AFTER adding the element to the connected flow, add its subprocess children
      // This ensures subprocess children are grouped with their parent but don't break the flow
      addSubprocessChildrenRecursively(element);
    });
  });

  // Helper function to recursively add subprocess children after their parent
  function addSubprocessChildrenRecursively(element: T) {
    const children = parentToChildren.get(element.id) || [];
    if (children.length > 0) {
      // Group children by their connected component first to keep flows together
      const childrenByComponent = new Map<number, T[]>();
      children.forEach((child) => {
        const componentId = elementToComponent.get(child.id) ?? -1;
        if (!childrenByComponent.has(componentId)) {
          childrenByComponent.set(componentId, []);
        }
        childrenByComponent.get(componentId)!.push(child);
      });

      // Sort component groups by the earliest time of their elements
      const componentGroupsWithTiming = Array.from(childrenByComponent.entries()).map(
        ([componentId, componentChildren]) => ({
          componentId,
          componentChildren,
          earliestTime: chronologicalSorting
            ? Math.min(...componentChildren.map((c) => c.start || Infinity))
            : Math.min(...componentChildren.map((c) => discoveryOrder.get(c.id) ?? Infinity)),
        }),
      );
      componentGroupsWithTiming.sort((a, b) => a.earliestTime - b.earliestTime);

      // Process each component group
      componentGroupsWithTiming.forEach(({ componentId, componentChildren }) => {
        // Sort children within the component directly, treating each instance as individual
        const sortedChildren = [...componentChildren];

        if (chronologicalSorting) {
          // Sort by start time
          sortedChildren.sort((a, b) => (a.start || 0) - (b.start || 0));
        } else {
          // Sort by discovery order
          sortedChildren.sort(
            (a, b) => (discoveryOrder.get(a.id) ?? 0) - (discoveryOrder.get(b.id) ?? 0),
          );
        }

        // Add each child and recurse for nested subprocesses
        sortedChildren.forEach((child) => {
          result.push(child);
          // Recurse for nested subprocesses
          addSubprocessChildrenRecursively(child);
        });
      });
    }
  }

  // Find all sequence flows (if any) and append at the end
  const sequenceFlows = elements.filter((el) => (el as any).$type === 'bpmn:SequenceFlow');
  result.push(...sequenceFlows);

  return result;
}

/**
 * Sort elements by their flow order (topological sort)
 */
function sortByFlowOrder<T extends { id: string; start?: number }>(
  group: T[],
  allElements: readonly any[],
): void {
  // Build adjacency list for this group
  const adjacency = new Map<string, string[]>();
  const inDegree = new Map<string, number>();
  const groupIds = new Set(group.map((el) => el.id));

  // Initialize
  group.forEach((element) => {
    adjacency.set(element.id, []);
    inDegree.set(element.id, 0);
  });

  // Find sequence flows that connect elements in this group
  const sequenceFlows = allElements.filter((el) => el.$type === 'bpmn:SequenceFlow');
  sequenceFlows.forEach((flow) => {
    const sourceId = typeof flow.sourceRef === 'string' ? flow.sourceRef : flow.sourceRef?.id;
    const targetId = typeof flow.targetRef === 'string' ? flow.targetRef : flow.targetRef?.id;

    if (sourceId && targetId && groupIds.has(sourceId) && groupIds.has(targetId)) {
      adjacency.get(sourceId)!.push(targetId);
      inDegree.set(targetId, (inDegree.get(targetId) || 0) + 1);
    }
  });

  // Topological sort using Kahn's algorithm
  const queue: T[] = [];
  const sorted: T[] = [];

  // Find all nodes with no incoming edges
  group.forEach((element) => {
    if (inDegree.get(element.id) === 0) {
      queue.push(element);
    }
  });

  // Sort initial nodes by start time for consistency
  queue.sort((a, b) => (a.start || 0) - (b.start || 0));

  while (queue.length > 0) {
    const current = queue.shift()!;
    sorted.push(current);

    // Remove this node's edges and update in-degrees
    const neighbors = adjacency.get(current.id) || [];
    neighbors.forEach((neighborId) => {
      const degree = inDegree.get(neighborId)! - 1;
      inDegree.set(neighborId, degree);

      if (degree === 0) {
        const neighbor = group.find((el) => el.id === neighborId);
        if (neighbor) {
          queue.push(neighbor);
        }
      }
    });

    // Sort queue by start time for consistent ordering when there are multiple options
    queue.sort((a, b) => (a.start || 0) - (b.start || 0));
  }

  // Handle any remaining elements (cycles or disconnected elements)
  if (sorted.length < group.length) {
    const remaining = group.filter((el) => !sorted.some((s) => s.id === el.id));
    remaining.sort((a, b) => (a.start || 0) - (b.start || 0));
    sorted.push(...remaining);
  }

  // Replace the group array contents with sorted order
  group.splice(0, group.length, ...sorted);
}

function sortElementsWithHierarchy<
  T extends {
    id: string;
    start: number;
    elementType?: string;
  },
>(
  elements: T[],
  elementToComponent: Map<string, number>,
  chronologicalSorting: boolean = false,
): T[] {
  // Use a unified approach that respects component grouping for both modes
  return sortByProcessFlow(elements, elementToComponent, chronologicalSorting);
}

/**
 * Insert boundary events directly after their attached tasks in the element list
 */
function insertBoundaryEventsAfterTasks<
  T extends { id: string; isBoundaryEvent?: boolean; attachedToId?: string },
>(
  regularElements: T[],
  boundaryEvents: T[],
  chronologicalSorting: boolean = true,
  dependencies?: Array<{
    sourceId?: string;
    targetId?: string;
    sourceInstanceId?: string;
    targetInstanceId?: string;
    flowId?: string;
  }>,
): T[] {
  const result: T[] = [];

  // Track which boundary events have been added to avoid duplicates
  const addedBoundaryEventIds = new Set<string>();

  // Create instance-based mapping if dependencies are provided
  const taskInstanceToBoundaryEvents = new Map<string, T[]>();
  if (dependencies) {
    // Build a map from boundary event ID to task instance ID using dependencies
    const boundaryEventToTaskInstance = new Map<string, string>();
    dependencies.forEach((dep) => {
      // Look for attachment dependencies (boundary event as target)
      if (
        dep.flowId &&
        dep.flowId.includes('_to_') &&
        dep.flowId.includes('_attachment') &&
        dep.targetInstanceId &&
        dep.sourceInstanceId
      ) {
        boundaryEventToTaskInstance.set(dep.targetInstanceId, dep.sourceInstanceId);
      }
    });

    // Now map boundary events to their task instances
    boundaryEvents.forEach((event) => {
      const taskInstanceId = boundaryEventToTaskInstance.get(event.id);
      if (taskInstanceId) {
        if (!taskInstanceToBoundaryEvents.has(taskInstanceId)) {
          taskInstanceToBoundaryEvents.set(taskInstanceId, []);
        }
        taskInstanceToBoundaryEvents.get(taskInstanceId)!.push(event);
      }
    });
  }

  // Fallback: Create a map of task base ID to its boundary events (for backward compatibility)
  const taskToBoundaryEvents = new Map<string, T[]>();
  boundaryEvents.forEach((event) => {
    const attachedToId = (event as any).attachedToId;
    if (attachedToId) {
      if (!taskToBoundaryEvents.has(attachedToId)) {
        taskToBoundaryEvents.set(attachedToId, []);
      }
      taskToBoundaryEvents.get(attachedToId)!.push(event);
    }
  });

  // Sort boundary events within each task by start time
  taskToBoundaryEvents.forEach((events) => {
    events.sort((a, b) => (a as any).start - (b as any).start);
  });

  // For flow-based sorting, we need to handle hierarchies specially
  if (!chronologicalSorting) {
    // Build parent-child relationships
    const parentToChildren = new Map<string, T[]>();
    const childToParent = new Map<string, string>();

    regularElements.forEach((element) => {
      const parentId = (element as any).parentSubProcessId;
      if (parentId) {
        childToParent.set(element.id, parentId);
        if (!parentToChildren.has(parentId)) {
          parentToChildren.set(parentId, []);
        }
        parentToChildren.get(parentId)!.push(element);
      }
    });

    // Process elements maintaining hierarchy
    const processed = new Set<string>();

    function addElementWithHierarchy(element: T) {
      if (processed.has(element.id)) return;

      processed.add(element.id);
      result.push(element);

      // If this is a sub-process, add all its children first
      const children = parentToChildren.get(element.id) || [];
      if (children.length > 0) {
        // Add children in the order they appear in regularElements
        children.forEach((child) => addElementWithHierarchy(child));
      }

      // Add boundary events attached to this element (after children for sub-processes)
      // First try instance-based mapping if available
      let attachedBoundaryEvents: T[] = [];

      if (taskInstanceToBoundaryEvents.size > 0) {
        // Use instance-based mapping
        attachedBoundaryEvents = taskInstanceToBoundaryEvents.get(element.id) || [];
      } else {
        // Fallback to base ID mapping
        attachedBoundaryEvents = taskToBoundaryEvents.get(element.id) || [];
      }

      // For task instances, also check for boundary events attached to the base element ID
      if (
        attachedBoundaryEvents.length === 0 &&
        element.id.includes('_instance_') &&
        taskToBoundaryEvents.size > 0
      ) {
        const baseParts = element.id.split('_instance_');
        const baseId = baseParts[0];
        const allBaseBoundaryEvents = taskToBoundaryEvents.get(baseId) || [];

        // For self-loop scenarios, match boundary events to tasks based on timing
        // Boundary events should fall within or be associated with their task's timeline
        const taskElement = element as any;
        const taskStart = taskElement.start;
        const taskEnd = taskElement.end;

        const matchingBoundaryEvents = allBaseBoundaryEvents.filter((be) => {
          // Skip if already added
          if (addedBoundaryEventIds.has(be.id)) {
            return false;
          }

          const beElement = be as any;
          const beStart = beElement.start;
          // Boundary events should be positioned within the task's time range
          // or immediately after (for events that trigger at task completion)
          return beStart >= taskStart && beStart <= taskEnd + 1; // +1ms tolerance for end events
        });

        // Add matching boundary events and mark them as added
        matchingBoundaryEvents.forEach((be) => {
          result.push(be);
          addedBoundaryEventIds.add(be.id);
        });
      } else {
        // Add direct boundary events and mark them as added
        attachedBoundaryEvents.forEach((be) => {
          if (!addedBoundaryEventIds.has(be.id)) {
            result.push(be);
            addedBoundaryEventIds.add(be.id);
          }
        });
      }
    }

    // Process root elements (elements without parents) in order
    regularElements.forEach((element) => {
      if (!childToParent.has(element.id)) {
        addElementWithHierarchy(element);
      }
    });

    // Add orphaned boundary events (should not exist if everything is properly attached)
    const orphanedBoundaryEvents = boundaryEvents.filter(
      (event) => !addedBoundaryEventIds.has(event.id),
    );
    if (orphanedBoundaryEvents.length > 0) {
      console.warn(
        'Orphaned boundary events found:',
        orphanedBoundaryEvents.map((e) => e.id),
      );
    }
    result.push(...orphanedBoundaryEvents);

    return result;
  }

  // Original logic for chronological sorting
  // Build a map of elements by ID for quick lookup
  const elementById = new Map<string, T>();
  regularElements.forEach((el) => elementById.set(el.id, el));

  // Track which elements have been added to avoid duplicates
  const addedElements = new Set<string>();

  // Helper function to add element and its boundary events
  const addElementWithBoundaryEvents = (element: T) => {
    if (addedElements.has(element.id)) return;

    result.push(element);
    addedElements.add(element.id);

    // Check if this is a sub-process with children
    const isSubProcess = (element as any).type === 'group' && (element as any).isSubProcess;

    if (isSubProcess) {
      // For sub-processes, first add all children recursively
      const children = regularElements.filter(
        (el) => (el as any).parentSubProcessId === element.id && el.id !== element.id,
      );

      // Sort children based on sorting preference
      if (chronologicalSorting) {
        children.sort((a, b) => (a as any).start - (b as any).start);
      } else {
        // For flow-based sorting, perform topological sort
        sortByFlowOrder(children, regularElements);
      }

      // Add each child (which might also be a sub-process)
      children.forEach((child) => addElementWithBoundaryEvents(child));
    }

    // Now add boundary events attached to this element
    // First try instance-based mapping if available
    let attachedBoundaryEvents: T[] = [];

    if (taskInstanceToBoundaryEvents.size > 0) {
      // Use instance-based mapping
      attachedBoundaryEvents = taskInstanceToBoundaryEvents.get(element.id) || [];
    } else {
      // Fallback to base ID mapping
      attachedBoundaryEvents = taskToBoundaryEvents.get(element.id) || [];
    }

    // Also check for boundary events attached to the base element ID
    // (in case the task has an instance suffix like "_instance_1")
    if (
      attachedBoundaryEvents.length === 0 &&
      element.id.includes('_instance_') &&
      taskToBoundaryEvents.size > 0
    ) {
      const baseParts = element.id.split('_instance_');
      const baseId = baseParts.length > 0 ? baseParts[0] : element.id;
      const allBaseBoundaryEvents = taskToBoundaryEvents.get(baseId) || [];

      // Use ID-based matching and recalculate boundary event positioning
      // based on the actual task timing in the final gantt chart
      attachedBoundaryEvents = allBaseBoundaryEvents.filter((be) => {
        // Skip if already added
        if (addedBoundaryEventIds.has(be.id)) {
          return false;
        }
        return (be as any).attachedToId === baseId;
      });
    } else {
      // Filter out already added boundary events from direct attachments
      attachedBoundaryEvents = attachedBoundaryEvents.filter(
        (be) => !addedBoundaryEventIds.has(be.id),
      );
    }

    // Add boundary events that match this element instance
    attachedBoundaryEvents.forEach((boundaryEvent) => {
      if (!addedBoundaryEventIds.has(boundaryEvent.id)) {
        result.push(boundaryEvent);
        addedElements.add(boundaryEvent.id);
        addedBoundaryEventIds.add(boundaryEvent.id);
      }
    });
  };

  // Process root elements (elements without parents)
  const rootElements = regularElements.filter(
    (el) => !(el as any).parentSubProcessId || !elementById.has((el as any).parentSubProcessId),
  );

  // Sort root elements based on sorting preference
  if (chronologicalSorting) {
    rootElements.sort((a, b) => (a as any).start - (b as any).start);
  }
  // For flow-based sorting, maintain the order from sortedRegularElements

  // Add each root element and its entire hierarchy
  rootElements.forEach((root) => addElementWithBoundaryEvents(root));

  // Add any orphaned boundary events at the end (boundary events without attached tasks)
  const orphanedBoundaryEvents = boundaryEvents.filter((event) => {
    // Only add if not already added
    if (addedElements.has(event.id)) {
      return false;
    }
    const attachedToId = (event as any).attachedToId;
    return (
      !attachedToId ||
      !regularElements.some((el) => {
        if (el.id === attachedToId) return true;
        const instanceParts = el.id.split('_instance_');
        return instanceParts.length > 0 && instanceParts[0] === attachedToId;
      })
    );
  });
  result.push(...orphanedBoundaryEvents);

  return result;
}

// ============================================================================
// Gateway Mismatch Detection
// ============================================================================

// Note: Gateway type checking functions are defined in element-transformers.ts

/**
 * Check if a gateway is a join (multiple incoming flows)
 */
export function isJoinGateway(gateway: { incoming?: string[] }): boolean {
  return (gateway.incoming?.length || 0) > 1;
}

/**
 * Check if a gateway is a fork (multiple outgoing flows)
 */
export function isForkGateway(gateway: { outgoing?: string[] }): boolean {
  return (gateway.outgoing?.length || 0) > 1;
}

/**
 * Represents a path in the gateway analysis
 */
export interface GatewayPath {
  elements: string[];
  gateways: Array<{
    id: string;
    type: string;
    position: 'fork' | 'join';
  }>;
}

/**
 * Trace all paths backward from a parallel join gateway to find their origins
 */
export function tracePathsToOrigins(
  targetGateway: { id: string; incoming?: string[] },
  elements: Array<{
    id: string;
    $type: string;
    incoming?: string[];
    outgoing?: string[];
    sourceRef?: any;
    targetRef?: any;
  }>,
): GatewayPath[] {
  const paths: GatewayPath[] = [];
  const sequenceFlows = elements.filter((el) => el.$type === 'bpmn:SequenceFlow');
  const elementMap = new Map(elements.map((el) => [el.id, el]));

  // Build reverse lookup for flows (target -> flows)
  const incomingFlowMap = new Map<string, Array<{ id: string; sourceRef: any }>>();
  sequenceFlows.forEach((flow) => {
    const targetId = typeof flow.targetRef === 'string' ? flow.targetRef : flow.targetRef?.id;
    if (targetId) {
      if (!incomingFlowMap.has(targetId)) {
        incomingFlowMap.set(targetId, []);
      }
      incomingFlowMap.get(targetId)!.push({
        id: flow.id,
        sourceRef: flow.sourceRef,
      });
    }
  });

  /**
   * Recursive function to trace paths backward
   */
  function tracePath(
    currentElementId: string,
    visitedElements: Set<string>,
    currentPath: GatewayPath,
  ): void {
    // Prevent infinite loops
    if (visitedElements.has(currentElementId)) {
      return;
    }

    const newVisited = new Set(visitedElements);
    newVisited.add(currentElementId);

    const element = elementMap.get(currentElementId);
    if (!element) return;

    // Add current element to path
    const newPath: GatewayPath = {
      elements: [currentElementId, ...currentPath.elements],
      gateways: [...currentPath.gateways],
    };

    // If it's a gateway, record it
    if (isGatewayElement(element as any)) {
      const gatewayInfo = {
        id: element.id,
        type: element.$type,
        position: isJoinGateway(element) ? ('join' as const) : ('fork' as const),
      };
      newPath.gateways = [gatewayInfo, ...newPath.gateways];
    }

    // Get incoming flows
    const incomingFlows = incomingFlowMap.get(currentElementId) || [];

    if (incomingFlows.length === 0) {
      // This is a start element (no incoming flows)
      paths.push(newPath);
      return;
    }

    // Continue tracing for each incoming flow
    incomingFlows.forEach((flow) => {
      const sourceId = typeof flow.sourceRef === 'string' ? flow.sourceRef : flow.sourceRef?.id;
      if (sourceId) {
        tracePath(sourceId, newVisited, newPath);
      }
    });
  }

  // Start tracing from the target gateway
  tracePath(targetGateway.id, new Set(), {
    elements: [],
    gateways: [],
  });

  return paths;
}

/**
 * Detect exclusive → parallel join patterns that could cause deadlocks
 */
export function detectGatewayMismatches(
  elements: Array<{
    id: string;
    $type: string;
    name?: string;
    incoming?: string[];
    outgoing?: string[];
    sourceRef?: any;
    targetRef?: any;
  }>,
): Array<{
  parallelJoinId: string;
  parallelJoinName?: string;
  exclusiveOrigins: Array<{
    gatewayId: string;
    gatewayName?: string;
    pathElements: string[];
  }>;
}> {
  const mismatches: Array<{
    parallelJoinId: string;
    parallelJoinName?: string;
    exclusiveOrigins: Array<{
      gatewayId: string;
      gatewayName?: string;
      pathElements: string[];
    }>;
  }> = [];

  // Find all parallel join gateways
  const parallelJoins = elements.filter(
    (el) => isParallelGateway(el as any) && isJoinGateway(el as any),
  );

  parallelJoins.forEach((parallelJoin) => {
    const paths = tracePathsToOrigins(parallelJoin, elements);

    // Check each path for exclusive gateway origins
    const uniqueExclusiveOrigins = new Map<
      string,
      {
        gatewayId: string;
        gatewayName?: string;
        pathElements: string[];
      }
    >();

    paths.forEach((path) => {
      // Look for exclusive gateways in the path that are forks
      const exclusiveForksInPath = path.gateways.filter(
        (gw) => isExclusiveGateway({ $type: gw.type } as any) && gw.position === 'fork',
      );

      exclusiveForksInPath.forEach((exclusiveFork) => {
        const gatewayElement = elements.find((el) => el.id === exclusiveFork.id);

        // Only add if we haven't seen this gateway before
        if (!uniqueExclusiveOrigins.has(exclusiveFork.id)) {
          // Convert element IDs to names when available
          const pathElementNames = path.elements.map((elementId) => {
            const element = elements.find((el) => el.id === elementId);
            return element?.name || elementId;
          });

          uniqueExclusiveOrigins.set(exclusiveFork.id, {
            gatewayId: exclusiveFork.id,
            gatewayName: gatewayElement?.name,
            pathElements: pathElementNames,
          });
        }
      });
    });

    // Convert map to array
    const exclusiveOriginsArray = Array.from(uniqueExclusiveOrigins.values());

    // If we found exclusive origins, this is a potential deadlock
    if (exclusiveOriginsArray.length > 0) {
      mismatches.push({
        parallelJoinId: parallelJoin.id,
        parallelJoinName: parallelJoin.name,
        exclusiveOrigins: exclusiveOriginsArray,
      });
    }
  });

  return mismatches;
}
