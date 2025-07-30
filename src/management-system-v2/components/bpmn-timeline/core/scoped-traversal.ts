/**
 * Scoped path traversal for hierarchical process handling
 */

import type {
  BPMNFlowElement,
  BPMNSequenceFlow,
  ElementTiming,
  DefaultDurationInfo,
} from '../types/types';
import {
  extractDuration,
  isTaskElement,
  isSupportedEventElement,
  isBoundaryEventElement,
  isExpandedSubProcess,
  flattenExpandedSubProcesses,
} from '../utils/utils';
import { isGatewayElement } from '../transformers/element-transformers';
import {
  buildSynchronizationRequirements,
  incomingFlowsCountForGateway,
  isSynchronizationReady,
  calculateSyncTime,
  createSyncKey,
  initializeSyncTracking,
  recordSourceArrival,
} from './synchronization';
import { DEFAULT_TASK_DURATION_MS, MAX_RECURSION_DEPTH } from '../constants';
import {
  ProcessScope,
  TraversalContext,
  ProcessInstance,
  buildScopes,
  flattenInstances,
  buildInstanceTree,
  isSubProcessExpanded,
} from './process-model';

// Removed global state - now managed through TraversalContext

/**
 * Calculate element timings using scoped hierarchical traversal
 */
export function calculateScopedTimings(
  elements: BPMNFlowElement[],
  startTime: number,
  defaultDurations: DefaultDurationInfo[] = [],
  maxLoopIterations: number = 1,
): {
  timingsMap: Map<string, ElementTiming[]>;
  dependencies: Array<{ sourceInstanceId: string; targetInstanceId: string; flowId: string }>;
  flattenedElements: BPMNFlowElement[];
  issues: Array<{
    elementId: string;
    elementType: string;
    elementName?: string;
    reason: string;
    severity: 'warning' | 'error';
  }>;
} {
  // Step 1: Flatten elements to include sub-process children
  const flattenedElements = flattenExpandedSubProcesses(elements);

  // Step 2: Build hierarchical scopes
  const rootScope = buildScopes(flattenedElements);

  // Step 3: Create shared instance counter to eliminate global state
  const instanceCounter = { value: 0 };

  // Step 4: Traverse all scopes to create instances
  const allInstances: ProcessInstance[] = [];
  const allDependencies: Array<{
    sourceInstanceId: string;
    targetInstanceId: string;
    flowId: string;
  }> = [];
  const issues: Array<{
    elementId: string;
    elementType: string;
    elementName?: string;
    reason: string;
    severity: 'warning' | 'error';
  }> = [];

  // Traverse root scope
  const rootContext: TraversalContext = {
    scope: rootScope,
    currentTime: startTime,
    visitedInScope: new Map(),
    pathKey: 'main',
    instanceCounter,
  };

  const rootInstances = traverseScope(rootContext, maxLoopIterations, defaultDurations, issues, 0);
  allInstances.push(...rootInstances);

  // Collect dependencies from all instances (including nested ones)
  const flatInstances = flattenInstances(rootInstances);
  flatInstances.forEach((instance) => {
    allDependencies.push(...instance.dependencies);
  });

  // Step 3: Convert to legacy format for compatibility
  const timingsMap = convertToTimingsMap(allInstances);

  // Step 4: Calculate sub-process bounds
  calculateSubProcessBounds(timingsMap);

  return {
    timingsMap,
    dependencies: allDependencies,
    flattenedElements,
    issues,
  };
}

/**
 * Traverse a single scope (process or sub-process)
 */
function traverseScope(
  context: TraversalContext,
  maxLoopIterations: number,
  defaultDurations: DefaultDurationInfo[],
  issues: any[],
  depth: number = 0,
): ProcessInstance[] {
  // Prevent stack overflow from deeply nested sub-processes
  if (depth > MAX_RECURSION_DEPTH) {
    const error = `Maximum sub-process nesting depth exceeded (${MAX_RECURSION_DEPTH}). This indicates either extremely deep sub-process hierarchy or infinite recursion.`;
    issues.push({
      elementId: context.scope.id,
      elementType: 'SubProcess',
      elementName: `Scope ${context.scope.id}`,
      reason: error,
      severity: 'error' as const,
    });
    return []; // Return empty array to prevent crash, continue processing other paths
  }

  const { scope, currentTime, visitedInScope, parentInstanceId, pathKey } = context;

  // Build graph for this scope only
  const scopeElements = Array.from(scope.elements.values());
  const graph = buildScopeGraph(scopeElements);

  const instances: ProcessInstance[] = [];
  const dependencies: Array<{
    sourceInstanceId: string;
    targetInstanceId: string;
    flowId: string;
  }> = [];

  // Synchronization support
  const syncQueues = new Map<
    string,
    Array<{
      elementId: string;
      currentTime: number;
      visitedElements: string[];
      pathSpecificVisits: Map<string, number>;
      sourceInstanceId?: string;
      flowId?: string;
      sourceElementId?: string;
    }>
  >();

  const syncArrivals = new Map<
    string,
    {
      arrivedSources: Set<string>;
      completionTimes: Map<string, number>;
    }
  >();

  // Build synchronization requirements for this scope
  const synchronizationRequirements = buildSynchronizationRequirements(scopeElements);

  // Traverse paths in this scope
  const pathsToExplore: Array<{
    elementId: string;
    currentTime: number;
    visitedElements: string[];
    pathSpecificVisits: Map<string, number>;
    sourceInstanceId?: string;
    flowId?: string;
    sourceElementId?: string;
  }> = [];

  // Initialize with start nodes
  graph.startNodes.forEach((startNode) => {
    pathsToExplore.push({
      elementId: startNode.id,
      currentTime,
      visitedElements: [],
      pathSpecificVisits: new Map(visitedInScope),
    });
  });

  // Process paths
  while (pathsToExplore.length > 0) {
    const pathItem = pathsToExplore.shift();
    if (!pathItem) continue; // Safety guard - should never happen but prevents crashes

    const {
      elementId,
      currentTime: pathTime,
      visitedElements,
      pathSpecificVisits,
      sourceInstanceId,
      flowId,
      sourceElementId,
    } = pathItem;

    const element = graph.nodes.get(elementId);
    if (!element) continue;

    // Check if this element requires synchronization
    const syncReq = synchronizationRequirements.get(elementId);
    if (syncReq && sourceInstanceId) {
      // This element requires synchronization
      const syncKey = createSyncKey(elementId, syncReq.gatewayId);

      // Initialize sync tracking if needed
      if (!syncArrivals.has(syncKey)) {
        syncArrivals.set(syncKey, initializeSyncTracking());
      }
      const syncInfo = syncArrivals.get(syncKey)!;

      // Record the arrival of this source using element ID for proper synchronization matching
      recordSourceArrival(syncInfo, sourceElementId || sourceInstanceId, pathTime);

      // Queue this path
      if (!syncQueues.has(syncKey)) {
        syncQueues.set(syncKey, []);
      }
      syncQueues.get(syncKey)!.push({
        elementId,
        currentTime: pathTime,
        visitedElements,
        pathSpecificVisits,
        sourceInstanceId,
        flowId,
        sourceElementId,
      });

      // Check if we have received enough instances for synchronization
      const expectedArrivals = incomingFlowsCountForGateway(syncReq.gatewayId, scopeElements);

      if (isSynchronizationReady(syncInfo, expectedArrivals)) {
        // All sources ready - process all queued paths with synchronized timing
        const queuedPaths = syncQueues.get(syncKey) || [];
        const syncTime = calculateSyncTime(syncInfo);

        // Clear the queues first to prevent re-processing
        syncQueues.delete(syncKey);
        syncArrivals.delete(syncKey);

        // Create ONE instance of the target element with synchronized timing
        const firstPath = queuedPaths[0];
        if (firstPath) {
          // Update the current path to use synchronized timing
          pathItem.currentTime = syncTime;
          // Continue processing with synchronized timing
        }

        // Store all queued paths for dependency creation after instance is created
        (pathItem as any).queuedPaths = queuedPaths;
      } else {
        // Not all sources ready yet - wait for more
        continue;
      }
    }

    // Check visit count for loop control
    const visitCount = pathSpecificVisits.get(elementId) || 0;
    if (visitCount > maxLoopIterations) {
      // Add warning to issues array
      issues.push({
        elementId: elementId,
        elementType: element.$type || 'Unknown',
        elementName: element.name,
        reason: `Loop iteration limit reached for element ${element.name || elementId} (max depth: ${maxLoopIterations})`,
        severity: 'warning',
      });

      // Mark source as loop cut-off
      if (sourceInstanceId) {
        const sourceInstance = instances.find((i) => i.instanceId === sourceInstanceId);
        if (sourceInstance) {
          (sourceInstance as any).isLoopCut = true;
        }
      }
      continue;
    }

    // Calculate duration
    let duration = extractDuration(element);
    if (duration === 0 && (isTaskElement(element) || isSupportedEventElement(element))) {
      // Sub-processes don't get default durations - their duration is calculated from children
      if (
        isTaskElement(element) &&
        element.$type !== 'bpmn:SubProcess' &&
        element.$type !== 'bpmn:AdHocSubProcess'
      ) {
        duration = DEFAULT_TASK_DURATION_MS;
        defaultDurations.push({
          elementId: element.id,
          elementType: element.$type,
          elementName: element.name,
          appliedDuration: duration,
          durationType: 'task',
        });
      }
    }

    // Create instance
    const instanceId = `${elementId}_instance_${++context.instanceCounter.value}`;
    const isLoopInstance = visitCount > 0; // This is a loop instance if we've visited before

    const instance: ProcessInstance = {
      elementId,
      instanceId,
      scopeId: scope.id,
      scopeInstanceId: parentInstanceId,
      parentInstanceId,
      startTime: pathTime,
      endTime: pathTime + duration,
      duration,
      children: [],
      dependencies: [],
    };

    // Add hierarchy level from the original element
    (instance as any).hierarchyLevel = (element as any).hierarchyLevel || 0;

    // Add loop information to the instance
    (instance as any).isLoop = isLoopInstance;
    (instance as any).isLoopCut = false; // Will be set to true if cut off

    // Add dependency if this came from another instance
    const queuedPaths = (pathItem as any).queuedPaths;
    if (queuedPaths && queuedPaths.length > 0) {
      // This was a synchronized element - create dependencies from ALL source instances
      for (const queuedPath of queuedPaths) {
        if (queuedPath.sourceInstanceId && queuedPath.flowId) {
          const dependency = {
            sourceInstanceId: queuedPath.sourceInstanceId,
            targetInstanceId: instanceId,
            flowId: queuedPath.flowId,
          };
          dependencies.push(dependency);
          instance.dependencies.push(dependency);
        }
      }
    } else if (sourceInstanceId && flowId) {
      // Normal dependency
      const dependency = {
        sourceInstanceId,
        targetInstanceId: instanceId,
        flowId,
      };
      dependencies.push(dependency);
      instance.dependencies.push(dependency);
    }

    instances.push(instance);

    // If this is a sub-process, traverse its children
    if (isSubProcessExpanded(element)) {
      const childScope = scope.childScopes.get(elementId);
      if (childScope) {
        const childContext: TraversalContext = {
          scope: childScope,
          currentTime: pathTime, // Children start when sub-process starts
          visitedInScope: new Map(), // Fresh visit tracking for child scope
          parentInstanceId: instanceId,
          pathKey: `${pathKey}_subproc_${elementId}`,
          instanceCounter: context.instanceCounter, // Share the same counter across all scopes
        };

        const childInstances = traverseScope(
          childContext,
          maxLoopIterations,
          defaultDurations,
          issues,
          depth + 1, // Increment depth for sub-process nesting
        );
        instance.children = childInstances;

        // Collect child dependencies
        childInstances.forEach((childInstance) => {
          dependencies.push(...childInstance.dependencies);
        });

        // Update sub-process timing based on children bounds
        if (childInstances.length > 0) {
          const flatChildren = flattenInstances(childInstances);
          const earliestStart = Math.min(...flatChildren.map((c) => c.startTime));
          const latestEnd = Math.max(...flatChildren.map((c) => c.endTime));

          // Update the sub-process instance timing
          instance.startTime = earliestStart;
          instance.endTime = latestEnd;
          instance.duration = latestEnd - earliestStart;
        }
      }
    }

    // Update visit tracking
    const newVisitedElements = [...visitedElements, elementId];
    const newPathSpecificVisits = new Map(pathSpecificVisits);
    newPathSpecificVisits.set(elementId, visitCount + 1);

    // Handle boundary events attached to this element
    if (isTaskElement(element)) {
      // Always process boundary events for task instances
      // Each task instance should have its own boundary event instances
      handleBoundaryEvents(
        element,
        instance,
        scopeElements,
        dependencies,
        instances,
        context,
        graph,
        pathsToExplore,
        newVisitedElements,
        newPathSpecificVisits,
      );
    }

    // Continue to outgoing flows
    const outgoingFlows = graph.edges.get(elementId) || [];
    outgoingFlows.forEach((flow) => {
      const targetId =
        typeof flow.targetRef === 'string' ? flow.targetRef : (flow.targetRef as any)?.id;
      if (!graph.nodes.has(targetId)) return;

      const flowDuration = extractDuration(flow) || 0;
      const nextTime = instance.endTime + flowDuration;

      pathsToExplore.push({
        elementId: targetId,
        currentTime: nextTime,
        visitedElements: newVisitedElements,
        pathSpecificVisits: newPathSpecificVisits,
        sourceInstanceId: instanceId,
        flowId: flow.id,
        sourceElementId: elementId,
      });
    });
  }

  return instances;
}

/**
 * Build graph for a single scope's elements
 */
function buildScopeGraph(elements: BPMNFlowElement[]) {
  const nodes = new Map<string, BPMNFlowElement>();
  const edges = new Map<string, BPMNSequenceFlow[]>();
  const incomingCount = new Map<string, number>();

  // Get sequence flows
  const sequenceFlows = elements.filter(
    (el) => el.$type === 'bpmn:SequenceFlow',
  ) as BPMNSequenceFlow[];

  const nonFlowElements = elements.filter((el) => el.$type !== 'bpmn:SequenceFlow');

  // Build node map
  nonFlowElements.forEach((element) => {
    nodes.set(element.id, element);
    incomingCount.set(element.id, 0);
  });

  // Build edge map
  sequenceFlows.forEach((flow) => {
    const sourceId =
      typeof flow.sourceRef === 'string' ? flow.sourceRef : (flow.sourceRef as any)?.id;
    const targetId =
      typeof flow.targetRef === 'string' ? flow.targetRef : (flow.targetRef as any)?.id;

    // Only add edges for flows where both source and target exist in this scope
    if (nodes.has(sourceId) && nodes.has(targetId)) {
      if (!edges.has(sourceId)) {
        edges.set(sourceId, []);
      }
      const sourceEdges = edges.get(sourceId);
      if (sourceEdges) {
        sourceEdges.push(flow);
      }

      // Count incoming flows (excluding self-loops)
      if (sourceId !== targetId) {
        const oldCount = incomingCount.get(targetId) || 0;
        incomingCount.set(targetId, oldCount + 1);
      }
    }
  });

  // Find start nodes (no incoming flows)
  const startNodes = nonFlowElements.filter(
    (el) => !isBoundaryEventElement(el) && (incomingCount.get(el.id) || 0) === 0,
  );

  // Handle processes with no start nodes
  if (startNodes.length === 0) {
    const nonBoundaryElements = nonFlowElements.filter((el) => !isBoundaryEventElement(el));
    if (nonBoundaryElements.length > 0) {
      startNodes.push(nonBoundaryElements[0]);
    }
  }

  return { nodes, edges, startNodes };
}

/**
 * Handle boundary events attached to a task
 */
function handleBoundaryEvents(
  taskElement: BPMNFlowElement,
  taskInstance: ProcessInstance,
  scopeElements: BPMNFlowElement[],
  dependencies: Array<{ sourceInstanceId: string; targetInstanceId: string; flowId: string }>,
  instances: ProcessInstance[],
  context: TraversalContext,
  graph?: { nodes: Map<string, BPMNFlowElement>; edges: Map<string, any[]> },
  pathsToExplore?: Array<{
    elementId: string;
    currentTime: number;
    visitedElements: string[];
    pathSpecificVisits: Map<string, number>;
    sourceInstanceId?: string;
    flowId?: string;
    sourceElementId?: string;
  }>,
  visitedElements?: string[],
  pathSpecificVisits?: Map<string, number>,
): void {
  // Find boundary events attached to this task
  const attachedBoundaryEvents = scopeElements.filter((el) => {
    if (!isBoundaryEventElement(el)) return false;
    const attachedToRef = (el as any).attachedToRef;
    return attachedToRef?.id === taskElement.id || attachedToRef === taskElement.id;
  });

  // Process attached boundary events

  attachedBoundaryEvents.forEach((boundaryEvent) => {
    // Calculate boundary event timing
    const boundaryDuration = extractDuration(boundaryEvent) || 0;
    let boundaryStartTime: number;

    // Check if the attached task is a sub-process with children
    const isAttachedToSubProcess = isSubProcessExpanded(taskElement);
    let effectiveTaskStart = taskInstance.startTime;
    let effectiveTaskEnd = taskInstance.endTime;

    if (isAttachedToSubProcess && taskInstance.children && taskInstance.children.length > 0) {
      // For sub-processes with children, position boundary event based on children's bounds
      const flatChildren = flattenInstances(taskInstance.children);
      if (flatChildren.length > 0) {
        effectiveTaskStart = Math.min(...flatChildren.map((c) => c.startTime));
        effectiveTaskEnd = Math.max(...flatChildren.map((c) => c.endTime));
      }
    }

    // Create boundary event instance
    const boundaryInstanceId = `${boundaryEvent.id}_instance_${++context.instanceCounter.value}`;

    if (boundaryDuration > 0) {
      // If boundary event has duration, position at task start + event duration
      boundaryStartTime = effectiveTaskStart + boundaryDuration;
    } else {
      // If no duration, position at the horizontal center of the task
      const taskDuration = effectiveTaskEnd - effectiveTaskStart;
      boundaryStartTime = effectiveTaskStart + taskDuration / 2;
    }

    const boundaryEndTime = boundaryStartTime; // Boundary events are milestones

    const boundaryInstance: ProcessInstance = {
      elementId: boundaryEvent.id,
      instanceId: boundaryInstanceId,
      scopeId: taskInstance.scopeId,
      scopeInstanceId: taskInstance.scopeInstanceId,
      parentInstanceId: taskInstance.parentInstanceId,
      startTime: boundaryStartTime,
      endTime: boundaryEndTime,
      duration: 0, // Boundary events are milestones
      children: [],
      dependencies: [],
    };

    // Boundary events inherit loop status from their attached task
    (boundaryInstance as any).isLoop = (taskInstance as any).isLoop || false;
    (boundaryInstance as any).isLoopCut = false;

    // Create dependency from task to boundary event
    const dependency = {
      sourceInstanceId: taskInstance.instanceId,
      targetInstanceId: boundaryInstanceId,
      flowId: `${taskElement.id}_to_${boundaryEvent.id}_attachment`,
    };

    dependencies.push(dependency);
    boundaryInstance.dependencies.push(dependency);
    instances.push(boundaryInstance);

    // Process boundary event outgoing flows if graph and pathsToExplore are provided
    if (graph && pathsToExplore && visitedElements && pathSpecificVisits) {
      const boundaryOutgoingFlows = graph.edges.get(boundaryEvent.id) || [];
      boundaryOutgoingFlows.forEach((flow) => {
        const targetId =
          typeof flow.targetRef === 'string' ? flow.targetRef : (flow.targetRef as any)?.id;
        if (!graph.nodes.has(targetId)) return;

        const flowDuration = extractDuration(flow) || 0;
        const nextTime = boundaryEndTime + flowDuration;

        pathsToExplore.push({
          elementId: targetId,
          currentTime: nextTime,
          visitedElements: [...visitedElements, boundaryEvent.id],
          pathSpecificVisits: new Map(pathSpecificVisits),
          sourceInstanceId: boundaryInstanceId,
          flowId: flow.id,
          sourceElementId: boundaryEvent.id,
        });
      });
    }
  });
}

/**
 * Convert ProcessInstance[] to legacy timingsMap format
 */
function convertToTimingsMap(instances: ProcessInstance[]): Map<string, ElementTiming[]> {
  const timingsMap = new Map<string, ElementTiming[]>();

  const flatInstances = flattenInstances(instances);

  flatInstances.forEach((instance) => {
    if (!timingsMap.has(instance.elementId)) {
      timingsMap.set(instance.elementId, []);
    }

    const timing: ElementTiming = {
      elementId: instance.elementId,
      startTime: instance.startTime,
      endTime: instance.endTime,
      duration: instance.duration,
      instanceId: instance.instanceId,
      parentSubProcessId: instance.parentInstanceId,
      isExpandedSubProcess: instance.children.length > 0,
      // Add additional properties for sub-process detection
      type: instance.children.length > 0 ? 'group' : undefined,
      isSubProcess: instance.children.length > 0,
      // Add loop detection flags
      isLoop: (instance as any).isLoop || false,
      isLoopCut: (instance as any).isLoopCut || false,
      // Add hierarchy level from the original element
      hierarchyLevel: (instance as any).hierarchyLevel || 0,
    } as any;

    const timingsList = timingsMap.get(instance.elementId);
    if (timingsList) {
      timingsList.push(timing);
    }
  });

  return timingsMap;
}

/**
 * Calculate sub-process bounds from children
 */
function calculateSubProcessBounds(timingsMap: Map<string, ElementTiming[]>): void {
  timingsMap.forEach((timings, elementId) => {
    timings.forEach((timing) => {
      if (timing.isExpandedSubProcess) {
        // Find all children of this sub-process instance
        const children: ElementTiming[] = [];

        timingsMap.forEach((childTimings) => {
          childTimings.forEach((childTiming) => {
            if (childTiming.parentSubProcessId === timing.instanceId) {
              children.push(childTiming);
            }
          });
        });

        if (children.length > 0) {
          const earliestStart = Math.min(...children.map((c) => c.startTime));
          const latestEnd = Math.max(...children.map((c) => c.endTime));

          timing.startTime = earliestStart;
          timing.endTime = latestEnd;
          timing.duration = latestEnd - earliestStart;
        }
      }
    });
  });
}
