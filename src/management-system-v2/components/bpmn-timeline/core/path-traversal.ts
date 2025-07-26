/**
 * Path-based BPMN traversal - each element appears only once per unique execution path
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

export interface PathElement {
  elementId: string;
  pathId: string;
  instanceId: string;
  startTime: number;
  endTime: number;
  duration: number;
  isLoopInstance: boolean;
  isPathCutoff?: boolean;
  isLoop?: boolean;
  isLoopCut?: boolean;
  hierarchyLevel?: number;
  parentSubProcessId?: string;
  isExpandedSubProcess?: boolean;
}

export interface ProcessGraph {
  nodes: Map<string, BPMNFlowElement>;
  edges: Map<string, BPMNSequenceFlow[]>;
  startNodes: BPMNFlowElement[];
  endNodes: BPMNFlowElement[];
}

const MAX_PATHS = 100;

/**
 * Build process graph from BPMN elements
 */
export function buildProcessGraph(flattenedElements: BPMNFlowElement[]): ProcessGraph {
  // Collect all sequence flows from flattened elements
  const allSequenceFlows = flattenedElements.filter(
    (el) => el.$type === 'bpmn:SequenceFlow',
  ) as BPMNSequenceFlow[];

  // Debug removed - keeping only essential logging

  const nodes = new Map<string, BPMNFlowElement>();
  const edges = new Map<string, BPMNSequenceFlow[]>();
  const incomingCount = new Map<string, number>();

  // Separate nodes and edges
  const nonFlowElements = flattenedElements.filter((el) => el.$type !== 'bpmn:SequenceFlow');

  // Build node map - include all elements including boundary events
  const boundaryEvents: any[] = [];
  nonFlowElements.forEach((element) => {
    nodes.set(element.id, element);
    incomingCount.set(element.id, 0);
    if (isBoundaryEventElement(element)) {
      boundaryEvents.push({
        id: element.id,
        type: element.$type,
        attachedToRef: (element as any).attachedToRef,
        allProps: Object.keys(element),
      });
    }
  });

  // Debug removed - keeping only essential logging

  // Build edge map and count incoming flows (excluding self-loops) - use the preserved sequence flows
  allSequenceFlows.forEach((flow) => {
    const sourceId =
      typeof flow.sourceRef === 'string'
        ? flow.sourceRef
        : (flow.sourceRef as any)?.id || flow.sourceRef;
    const targetId =
      typeof flow.targetRef === 'string'
        ? flow.targetRef
        : (flow.targetRef as any)?.id || flow.targetRef;

    if (!edges.has(sourceId)) {
      edges.set(sourceId, []);
    }
    edges.get(sourceId)!.push(flow);

    // Only count non-self-loop flows as incoming connections for start node detection
    // Don't count flows TO boundary events (they're not reached by normal flows)
    if (sourceId !== targetId && incomingCount.has(targetId)) {
      const oldCount = incomingCount.get(targetId) || 0;
      incomingCount.set(targetId, oldCount + 1);
    }
  });

  // Find start and end nodes - boundary events are not start nodes (they're attached to tasks)
  // but they can be end nodes if they have no outgoing flows
  const startNodes = nonFlowElements.filter(
    (el) => !isBoundaryEventElement(el) && (incomingCount.get(el.id) || 0) === 0,
  );
  const endNodes = nonFlowElements.filter((el) => (edges.get(el.id) || []).length === 0);

  // Handle pure loop processes (no start nodes) - pick the first non-boundary element as start
  if (startNodes.length === 0) {
    const nonBoundaryElements = nonFlowElements.filter((el) => !isBoundaryEventElement(el));
    if (nonBoundaryElements.length > 0) {
      startNodes.push(nonBoundaryElements[0]);
    }
  }

  return { nodes, edges, startNodes, endNodes };
}

/**
 * Calculate element timings using path-based traversal
 */
export function calculatePathBasedTimings(
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
  // Flatten elements once to include sub-process children
  const flattenedElements = flattenExpandedSubProcesses(elements);

  // Build graph with flattened elements to include sub-process children
  const graph = buildProcessGraph(flattenedElements);

  const { pathElements, dependencies, issues } = traverseAllPaths(
    graph,
    startTime,
    defaultDurations,
    maxLoopIterations,
    flattenedElements,
  );

  // Group path elements by original element ID
  const timingsMap = new Map<string, ElementTiming[]>();

  pathElements.forEach((pathElement) => {
    if (!timingsMap.has(pathElement.elementId)) {
      timingsMap.set(pathElement.elementId, []);
    }

    timingsMap.get(pathElement.elementId)!.push({
      elementId: pathElement.elementId,
      startTime: pathElement.startTime,
      endTime: pathElement.endTime,
      duration: pathElement.duration,
      pathId: pathElement.pathId,
      instanceId: pathElement.instanceId,
      isLoopInstance: pathElement.isLoopInstance,
      isPathCutoff: pathElement.isPathCutoff,
      isLoop: pathElement.isLoop,
      isLoopCut: pathElement.isLoopCut,
      hierarchyLevel: pathElement.hierarchyLevel,
      parentSubProcessId: pathElement.parentSubProcessId,
      isExpandedSubProcess: pathElement.isExpandedSubProcess,
    } as ElementTiming & {
      pathId: string;
      instanceId: string;
      isLoopInstance: boolean;
      isPathCutoff?: boolean;
      isLoop?: boolean;
      isLoopCut?: boolean;
      hierarchyLevel?: number;
      parentSubProcessId?: string;
      isExpandedSubProcess?: boolean;
    });
  });

  // Calculate sub-process bounds based on their child elements
  calculateSubProcessBounds(timingsMap, elements);

  // Fix dependent element timings after sub-process bounds are calculated
  fixDependentElementTimings(timingsMap, dependencies, flattenedElements);

  return { timingsMap, dependencies, flattenedElements, issues };
}

/**
 * Fix timings of elements that depend on sub-processes after sub-process bounds are calculated
 */
function fixDependentElementTimings(
  timingsMap: Map<string, ElementTiming[]>,
  dependencies: Array<{ sourceInstanceId: string; targetInstanceId: string; flowId: string }>,
  allElements: BPMNFlowElement[],
): void {
  // Create a map from instance ID to timing for quick lookup
  const instanceToTiming = new Map<string, ElementTiming>();
  timingsMap.forEach((timings) => {
    timings.forEach((timing) => {
      if (timing.instanceId) {
        instanceToTiming.set(timing.instanceId, timing);
      }
    });
  });

  // Create a map of sequence flows for flow duration lookup
  const sequenceFlows = new Map<string, BPMNFlowElement>();
  allElements
    .filter((el) => el.$type === 'bpmn:SequenceFlow')
    .forEach((flow) => {
      sequenceFlows.set(flow.id, flow);
    });

  // Process dependencies to find elements that need timing adjustment
  const adjustments = new Map<string, number>(); // instanceId -> new start time

  dependencies.forEach((dep) => {
    const sourceTiming = instanceToTiming.get(dep.sourceInstanceId);
    const targetTiming = instanceToTiming.get(dep.targetInstanceId);
    const flow = sequenceFlows.get(dep.flowId);

    if (sourceTiming && targetTiming && flow) {
      // Check if source is an expanded sub-process that had its timing corrected
      const sourceElement = allElements.find((el) => el.id === sourceTiming.elementId);

      if (sourceElement && isExpandedSubProcess(sourceElement)) {
        // Calculate what the target's start time should be based on corrected sub-process end time
        const flowDuration = extractDuration(flow) || 0;
        const expectedTargetStartTime = sourceTiming.endTime + flowDuration;

        // If target starts before it should, record an adjustment
        if (targetTiming.startTime < expectedTargetStartTime) {
          const currentAdjustment = adjustments.get(dep.targetInstanceId) || targetTiming.startTime;
          adjustments.set(
            dep.targetInstanceId,
            Math.max(currentAdjustment, expectedTargetStartTime),
          );
        }
      }
    }
  });

  // Apply adjustments
  adjustments.forEach((newStartTime, instanceId) => {
    const timing = instanceToTiming.get(instanceId);
    if (timing) {
      const duration = timing.endTime - timing.startTime;
      timing.startTime = newStartTime;
      timing.endTime = newStartTime + duration;
    }
  });

  // Propagate adjustments through the dependency chain
  // This ensures that if element B depends on adjusted element A, B is also adjusted
  let hasChanges = true;
  let iterationCount = 0;
  const maxIterations = 10; // Safety limit

  while (hasChanges && iterationCount < maxIterations) {
    hasChanges = false;
    iterationCount++;

    dependencies.forEach((dep) => {
      const sourceTiming = instanceToTiming.get(dep.sourceInstanceId);
      const targetTiming = instanceToTiming.get(dep.targetInstanceId);
      const flow = sequenceFlows.get(dep.flowId);

      if (sourceTiming && targetTiming && flow) {
        const flowDuration = extractDuration(flow) || 0;
        const expectedTargetStartTime = sourceTiming.endTime + flowDuration;

        if (targetTiming.startTime < expectedTargetStartTime) {
          const duration = targetTiming.endTime - targetTiming.startTime;
          targetTiming.startTime = expectedTargetStartTime;
          targetTiming.endTime = expectedTargetStartTime + duration;
          hasChanges = true;
        }
      }
    });
  }
}

/**
 * Calculate start and end times for expanded sub-processes based on their child elements
 */
function calculateSubProcessBounds(
  timingsMap: Map<string, ElementTiming[]>,
  originalElements: BPMNFlowElement[],
): void {
  // Find all expanded sub-processes
  const expandedSubProcesses = Array.from(timingsMap.keys()).filter((elementId) => {
    const timings = timingsMap.get(elementId)!;
    return timings.some((timing) => timing.isExpandedSubProcess);
  });

  expandedSubProcesses.forEach((subProcessId) => {
    const subProcessTimings = timingsMap.get(subProcessId)!;

    subProcessTimings.forEach((subProcessTiming) => {
      if (!subProcessTiming.isExpandedSubProcess) return;

      // Find all child elements for this sub-process
      const childTimings: ElementTiming[] = [];
      timingsMap.forEach((timings, elementId) => {
        if (elementId === subProcessId) return; // Skip the sub-process itself

        timings.forEach((timing) => {
          if (timing.parentSubProcessId === subProcessId) {
            childTimings.push(timing);
          }
        });
      });

      if (childTimings.length > 0) {
        // Calculate bounds: earliest start to latest end
        const earliestStart = Math.min(...childTimings.map((t) => t.startTime));
        const latestEnd = Math.max(...childTimings.map((t) => t.endTime));

        // Update sub-process timing
        subProcessTiming.startTime = earliestStart;
        subProcessTiming.endTime = latestEnd;
        subProcessTiming.duration = latestEnd - earliestStart;
      }
    });
  });
}

/**
 * Traverse all execution paths
 * Creates element instances only when they are visited on different paths
 */
function traverseAllPaths(
  graph: ProcessGraph,
  startTime: number,
  defaultDurations: DefaultDurationInfo[],
  maxLoopIterations: number,
  allElements: BPMNFlowElement[], // Pass all elements for gateway metadata lookup
): {
  pathElements: PathElement[];
  dependencies: Array<{ sourceInstanceId: string; targetInstanceId: string; flowId: string }>;
  issues: Array<{
    elementId: string;
    elementType: string;
    elementName?: string;
    reason: string;
    severity: 'warning' | 'error';
  }>;
} {
  const pathElements: PathElement[] = [];
  const dependencies: Array<{
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
  const globalElementCount = new Map<string, number>(); // Global count of how many times each element has been visited
  let instanceCounter = 0;

  /**
   * Get or create an element instance for a specific path context with loop detection
   */
  function getOrCreateInstance(
    element: BPMNFlowElement,
    pathKey: string,
    timing: { startTime: number; endTime: number; duration: number },
    pathSpecificVisits: Map<string, number>,
  ): PathElement {
    // Check how many times this element has been visited on this specific path
    const visitCount = pathSpecificVisits.get(element.id) || 0;
    const isLoopInstance = visitCount > 0;

    // Determine if we should create a new instance or stop
    // Loop depth semantics:
    // - Loop depth <0: Treated as 0 (allow only initial visit, no repetitions)
    // - Loop depth 0: Allow only initial visit, no repetitions (visitCount 0 only)
    // - Loop depth 1: Allow initial visit + 1 loop iteration (visitCount 0,1)
    // - Loop depth N: Allow initial visit + N loop iterations (visitCount 0 through N)
    //
    // visitCount 0: first visit (always allow and continue)
    // visitCount 1: first repetition/loop iteration (allow and continue if within depth)
    // visitCount N: Nth repetition/loop iteration (allow and continue if within depth)
    // visitCount > maxLoopIterations: don't create new instance, stop here
    const actualMaxIterations = Math.max(0, maxLoopIterations); // Clamp negative values to 0
    const shouldCreateNewInstance = visitCount <= actualMaxIterations;

    if (shouldCreateNewInstance) {
      // Increment global counter for this element to get sequential numbering
      const globalCount = (globalElementCount.get(element.id) || 0) + 1;
      globalElementCount.set(element.id, globalCount);

      const loopPathKey = isLoopInstance ? `${pathKey}_loop_${globalCount}` : pathKey;
      const instanceId = `${element.id}_instance_${++instanceCounter}`;

      const pathElement: PathElement = {
        elementId: element.id,
        pathId: loopPathKey,
        instanceId,
        startTime: timing.startTime,
        endTime: timing.endTime,
        duration: timing.duration,
        isLoopInstance,
        isLoop: isLoopInstance, // Mark as loop if it's a loop instance
        isLoopCut: false, // Will be set later if traversal is cut
        hierarchyLevel: (element as any).hierarchyLevel,
        parentSubProcessId: (element as any).parentSubProcessId,
        isExpandedSubProcess: (element as any).isExpandedSubProcess,
      };

      pathElements.push(pathElement);

      return pathElement;
    } else {
      // Loop depth exceeded - this shouldn't happen with our new logic
      // since we check before calling this function
      throw new Error(`Unexpected: shouldCreateNewInstance is false for ${element.id}`);
    }
  }

  const synchronizationRequirements = buildSynchronizationRequirements(allElements);

  /**
   * Explore all execution paths starting from start nodes
   */
  function explorePaths() {
    // Queue paths that need synchronization
    const syncQueues = new Map<
      string,
      Array<{
        elementId: string;
        pathKey: string;
        currentTime: number;
        visitedElements: string[];
        pathSpecificVisits: Map<string, number>;
        sourceInstanceId?: string;
        flowId?: string;
        sourceElementId?: string;
      }>
    >(); // key: "targetId:gatewayId"

    // Track which sources have arrived for each sync point
    const syncArrivals = new Map<
      string,
      {
        arrivedSources: Set<string>;
        completionTimes: Map<string, number>;
      }
    >(); // key: "targetId:gatewayId"

    const pathsToExplore: Array<{
      elementId: string;
      pathKey: string;
      currentTime: number;
      visitedElements: string[]; // Track visited elements for loop detection
      pathSpecificVisits: Map<string, number>; // Track visit count per element on this path
      sourceInstanceId?: string; // The instance that led to this element
      flowId?: string; // The flow that led to this element
      sourceElementId?: string; // The source element (not instance) for synchronization tracking
    }> = [];

    // Initialize with start nodes
    graph.startNodes.forEach((startNode) => {
      pathsToExplore.push({
        elementId: startNode.id,
        pathKey: 'main',
        currentTime: startTime,
        visitedElements: [],
        pathSpecificVisits: new Map(),
      });
    });

    const processedPaths = new Set<string>();

    let iterationCount = 0;
    const MAX_ITERATIONS = 1000; // Safety limit

    while (pathsToExplore.length > 0 && iterationCount < MAX_ITERATIONS) {
      // Check if we've exceeded the maximum paths limit
      if (pathsToExplore.length > MAX_PATHS) {
        issues.push({
          elementId: 'path-explosion',
          elementType: 'System',
          reason: `Maximum paths limit (${MAX_PATHS}) reached during path exploration`,
          severity: 'warning',
        });
        // Keep only the first MAX_PATHS to continue processing
        pathsToExplore.splice(MAX_PATHS);
      }
      iterationCount++;
      const {
        elementId,
        pathKey,
        currentTime,
        visitedElements,
        pathSpecificVisits,
        sourceInstanceId,
        flowId,
        sourceElementId,
      } = pathsToExplore.shift()!;

      // Create a signature that includes visited elements to detect true loops
      const pathSignature = `${elementId}:${pathKey}:${visitedElements.join('-')}`;

      if (processedPaths.has(pathSignature)) {
        continue;
      }
      processedPaths.add(pathSignature);

      const element = graph.nodes.get(elementId);
      if (!element) {
        continue;
      }

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

        // Record the arrival of this source
        recordSourceArrival(syncInfo, sourceInstanceId, currentTime);

        // Queue this path
        if (!syncQueues.has(syncKey)) {
          syncQueues.set(syncKey, []);
        }
        syncQueues.get(syncKey)!.push({
          elementId,
          pathKey,
          currentTime,
          visitedElements,
          pathSpecificVisits,
          sourceInstanceId,
          flowId,
          sourceElementId,
        });

        // Check if we have received enough instances for synchronization
        const expectedArrivals = incomingFlowsCountForGateway(syncReq.gatewayId, allElements);

        if (isSynchronizationReady(syncInfo, expectedArrivals)) {
          // All sources ready - process all queued paths with synchronized timing
          const queuedPaths = syncQueues.get(syncKey) || [];
          const syncTime = calculateSyncTime(syncInfo);

          // Clear the queues first to prevent re-processing
          syncQueues.delete(syncKey);
          syncArrivals.delete(syncKey);

          // Create ONE instance of the target element with synchronized timing
          // Use the first queued path as the template
          if (queuedPaths.length > 0) {
            const templatePath = queuedPaths[0];

            // Calculate duration for the target element
            let duration = extractDuration(element);
            if (duration === 0 && (isTaskElement(element) || isSupportedEventElement(element))) {
              if (isTaskElement(element)) {
                duration = 3600000; // 1 hour default
                defaultDurations.push({
                  elementId: element.id,
                  elementType: element.$type,
                  elementName: element.name,
                  appliedDuration: duration,
                  durationType: 'task',
                });
              }
            }

            // Create the synchronized element instance
            const pathElement = getOrCreateInstance(
              element,
              `${templatePath.pathKey}_sync_${syncKey}`,
              {
                startTime: syncTime,
                endTime: syncTime + duration,
                duration,
              },
              templatePath.pathSpecificVisits,
            );

            // Create dependencies from ALL source instances to this ONE target instance
            for (const queuedPath of queuedPaths) {
              if (queuedPath.sourceInstanceId && queuedPath.flowId) {
                const dependency = {
                  sourceInstanceId: queuedPath.sourceInstanceId,
                  targetInstanceId: pathElement.instanceId,
                  flowId: queuedPath.flowId,
                };
                dependencies.push(dependency);
              }
            }

            // Continue paths from this synchronized element (but only once)
            const newVisitedElements = [...templatePath.visitedElements, elementId];
            const newPathSpecificVisits = new Map(templatePath.pathSpecificVisits);
            newPathSpecificVisits.set(elementId, (newPathSpecificVisits.get(elementId) || 0) + 1);

            // Get outgoing flows and continue the path
            const outgoingFlows = graph.edges.get(elementId) || [];
            outgoingFlows.forEach((flow, flowIndex) => {
              const targetId =
                typeof flow.targetRef === 'string' ? flow.targetRef : (flow.targetRef as any)?.id;
              if (!graph.nodes.has(targetId)) return;

              const flowDuration = extractDuration(flow) || 0;
              const nextTime = pathElement.endTime + flowDuration;

              let nextPathKey = templatePath.pathKey;
              if (outgoingFlows.length > 1) {
                nextPathKey = `${templatePath.pathKey}_${elementId}_${flowIndex}`;
              }

              pathsToExplore.push({
                elementId: targetId,
                pathKey: nextPathKey,
                currentTime: nextTime,
                visitedElements: newVisitedElements,
                pathSpecificVisits: newPathSpecificVisits,
                sourceInstanceId: pathElement.instanceId,
                flowId: flow.id,
                sourceElementId: elementId,
              });
            });
          }
        }

        // Don't process this path yet - it's been queued
        continue;
      }

      // Calculate duration
      let duration = extractDuration(element);

      // Special handling for expanded sub-processes: they need placeholder duration
      // that will be corrected later based on child elements
      if (isExpandedSubProcess(element)) {
        // Use default duration for now, will be recalculated in calculateSubProcessBounds
        duration = duration || 3600000; // 1 hour default if no explicit duration
      } else if (duration === 0 && (isTaskElement(element) || isSupportedEventElement(element))) {
        if (isTaskElement(element)) {
          duration = 3600000; // 1 hour default
          defaultDurations.push({
            elementId: element.id,
            elementType: element.$type,
            elementName: element.name,
            appliedDuration: duration,
            durationType: 'task',
          });
        }
      }

      // Check if we should create an instance for this element visit
      const visitCount = pathSpecificVisits.get(elementId) || 0;
      const actualMaxIterations = Math.max(0, maxLoopIterations); // Clamp negative values to 0

      if (visitCount > actualMaxIterations) {
        // We've exceeded the loop depth, don't create instance and stop this path
        const element = allElements.find((el) => el.id === elementId);
        issues.push({
          elementId: elementId,
          elementType: element?.$type || 'Unknown',
          elementName: element?.name,
          reason: `Loop iteration limit reached for element ${element?.name || elementId} (max depth: ${actualMaxIterations})`,
          severity: 'warning',
        });

        // Mark the source element as loop cut-off since this path terminates here
        if (sourceInstanceId) {
          const sourceElement = pathElements.find((pe) => pe.instanceId === sourceInstanceId);
          if (sourceElement) {
            sourceElement.isLoopCut = true;
          }
        }

        continue;
      }

      // Handle gateways - create instances and apply their semantics
      if (isGatewayElement(element)) {
        // Gateway: Create instance and apply semantics
        const gatewayDuration = extractDuration(element) || 0;

        // Create gateway instance (will be filtered out during rendering if renderGateways is false)
        const pathElement = getOrCreateInstance(
          element,
          pathKey,
          {
            startTime: currentTime,
            endTime: currentTime + gatewayDuration,
            duration: gatewayDuration,
          },
          pathSpecificVisits,
        );

        // Create dependency if this gateway was reached from another instance
        if (sourceInstanceId && flowId) {
          const dependency = {
            sourceInstanceId,
            targetInstanceId: pathElement.instanceId,
            flowId,
          };
          dependencies.push(dependency);
        }

        // Update path-specific visit count for loop detection
        const newVisitedElements = [...visitedElements, elementId];
        const newPathSpecificVisits = new Map(pathSpecificVisits);
        newPathSpecificVisits.set(elementId, (newPathSpecificVisits.get(elementId) || 0) + 1);

        // Get outgoing flows from gateway
        const outgoingFlows = graph.edges.get(elementId) || [];

        // Note: Boundary events are not attached to gateways, only to tasks
        const allOutgoingFlows = outgoingFlows;

        // For each outgoing flow, create paths that go directly to final targets
        allOutgoingFlows.forEach((flow, flowIndex) => {
          const targetId =
            typeof flow.targetRef === 'string' ? flow.targetRef : (flow.targetRef as any)?.id;
          if (!graph.nodes.has(targetId)) return;

          const flowDuration = extractDuration(flow) || 0;
          const nextTime = pathElement.endTime + flowDuration;

          // Create unique path for each gateway branch
          const nextPathKey = `${pathKey}_gw_${elementId}_${flowIndex}`;

          pathsToExplore.push({
            elementId: targetId,
            pathKey: nextPathKey,
            currentTime: nextTime,
            visitedElements: newVisitedElements,
            pathSpecificVisits: newPathSpecificVisits,
            sourceInstanceId: pathElement.instanceId, // Use gateway instance as source
            flowId: flow.id,
            sourceElementId: elementId, // Gateway is now a proper source element
          });
        });
      } else {
        // Non-gateway: Create instance and continue normally
        const pathElement = getOrCreateInstance(
          element,
          pathKey,
          {
            startTime: currentTime,
            endTime: currentTime + duration,
            duration,
          },
          pathSpecificVisits,
        );

        // Create dependency if this element was reached from another instance
        if (sourceInstanceId && flowId) {
          const dependency = {
            sourceInstanceId,
            targetInstanceId: pathElement.instanceId,
            flowId,
          };
          dependencies.push(dependency);
        }

        // Update path-specific visit count and visited elements
        const newVisitedElements = [...visitedElements, elementId];
        const newPathSpecificVisits = new Map(pathSpecificVisits);
        newPathSpecificVisits.set(elementId, (newPathSpecificVisits.get(elementId) || 0) + 1);

        // Get outgoing flows
        const outgoingFlows = graph.edges.get(elementId) || [];

        // Also check for boundary events attached to this element and include their outgoing flows
        const boundaryEventFlows: BPMNSequenceFlow[] = [];

        const allBoundaryEvents = Array.from(graph.nodes.values()).filter((el) =>
          isBoundaryEventElement(el),
        );
        // Debug removed - keeping only essential logging

        const attachedBoundaryEvents = allBoundaryEvents.filter(
          (el) =>
            (el as any).attachedToRef?.id === elementId || (el as any).attachedToRef === elementId,
        );

        attachedBoundaryEvents.forEach((boundaryEvent) => {
          // Create boundary event instance with timing based on attached task
          const boundaryDuration = extractDuration(boundaryEvent) || 0;

          let boundaryStartTime: number;
          if (boundaryDuration > 0) {
            // If boundary event has duration, position at task start + event duration
            boundaryStartTime = pathElement.startTime + boundaryDuration;
          } else {
            // If no duration, position at the horizontal center of the task
            const taskDuration = pathElement.endTime - pathElement.startTime;
            boundaryStartTime = pathElement.startTime + taskDuration / 2;
          }

          const boundaryEndTime = boundaryStartTime; // Boundary events are milestones

          // Create a unique path key that includes the task instance to ensure
          // boundary events are created per task instance, not globally
          const boundaryPathKey = `${pathKey}_task_${pathElement.instanceId}_boundary_${boundaryEvent.id}`;

          const boundaryPathElement = getOrCreateInstance(
            boundaryEvent,
            boundaryPathKey,
            {
              startTime: boundaryStartTime,
              endTime: boundaryEndTime,
              duration: boundaryDuration, // Store actual boundary duration
            },
            pathSpecificVisits,
          );

          // Debug removed - keeping only essential logging

          // Create dependency from attached task to boundary event
          if (pathElement.instanceId && boundaryEvent.id) {
            const dependency = {
              sourceInstanceId: pathElement.instanceId,
              targetInstanceId: boundaryPathElement.instanceId,
              flowId: `${pathElement.elementId}_to_${boundaryEvent.id}_attachment`,
            };
            dependencies.push(dependency);
          }

          const boundaryOutgoingFlows = graph.edges.get(boundaryEvent.id) || [];

          // Process boundary event outgoing flows separately
          boundaryOutgoingFlows.forEach((boundaryFlow, boundaryFlowIndex) => {
            const targetId =
              typeof boundaryFlow.targetRef === 'string'
                ? boundaryFlow.targetRef
                : (boundaryFlow.targetRef as any)?.id;
            if (!graph.nodes.has(targetId)) return;

            const flowDuration = extractDuration(boundaryFlow) || 0;
            const nextTime = boundaryPathElement.endTime + flowDuration;

            // Create unique path for boundary event flow that includes the task instance
            const nextPathKey = `${pathKey}_task_${pathElement.instanceId}_boundary_${boundaryEvent.id}_${boundaryFlowIndex}`;

            pathsToExplore.push({
              elementId: targetId,
              pathKey: nextPathKey,
              currentTime: nextTime,
              visitedElements: newVisitedElements,
              pathSpecificVisits: newPathSpecificVisits,
              sourceInstanceId: boundaryPathElement.instanceId, // Flow starts from boundary event
              flowId: boundaryFlow.id,
              sourceElementId: boundaryEvent.id,
            });
          });
        });

        // Process normal task outgoing flows (not mixed with boundary flows)
        outgoingFlows.forEach((flow, flowIndex) => {
          const targetId =
            typeof flow.targetRef === 'string' ? flow.targetRef : (flow.targetRef as any)?.id;
          if (!graph.nodes.has(targetId)) return;

          const flowDuration = extractDuration(flow) || 0;
          const nextTime = pathElement.endTime + flowDuration;

          // Create unique path for each branch
          let nextPathKey = pathKey;
          if (outgoingFlows.length > 1) {
            nextPathKey = `${pathKey}_${elementId}_${flowIndex}`;
          }

          pathsToExplore.push({
            elementId: targetId,
            pathKey: nextPathKey,
            currentTime: nextTime,
            visitedElements: newVisitedElements,
            pathSpecificVisits: newPathSpecificVisits,
            sourceInstanceId: pathElement.instanceId,
            flowId: flow.id,
            sourceElementId: elementId, // Pass the source element ID for synchronization tracking
          });
        });
      }
    }

    if (iterationCount >= MAX_ITERATIONS) {
      issues.push({
        elementId: 'path-traversal',
        elementType: 'System',
        reason: `Path traversal exceeded maximum iterations (${MAX_ITERATIONS}), stopping to prevent infinite loop`,
        severity: 'warning',
      });
    }
  }

  explorePaths();

  // Deduplicate loop detection warnings to ensure each element is only warned about once
  const deduplicatedIssues = issues.filter((issue, index, arr) => {
    // Keep non-loop warnings as is
    if (!issue.reason.includes('Loop iteration limit reached')) {
      return true;
    }

    // For loop warnings, keep only the first occurrence for each elementId
    return (
      arr.findIndex(
        (other) =>
          other.elementId === issue.elementId &&
          other.reason.includes('Loop iteration limit reached'),
      ) === index
    );
  });

  // Debug removed - keeping only essential logging

  return { pathElements, dependencies, issues: deduplicatedIssues };
}
