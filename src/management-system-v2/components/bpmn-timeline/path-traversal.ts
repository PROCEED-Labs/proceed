/**
 * Path-based BPMN traversal for creating multiple element instances
 * across different execution paths
 */

import type {
  BPMNFlowElement,
  BPMNSequenceFlow,
  ElementTiming,
  DefaultDurationInfo,
} from './types';
import { extractDuration, isTaskElement, isSupportedEventElement } from './utils';

export interface ExecutionPath {
  id: string;
  elements: PathElement[];
  currentTime: number;
  visitedElements: Set<string>;
  loopCounts: Map<string, number>;
  nextElementId?: string; // For branched paths, specify which element to continue from
}

export interface PathElement {
  elementId: string;
  pathId: string;
  instanceId: string;
  startTime: number;
  endTime: number;
  duration: number;
  isLoopInstance: boolean;
}

export interface ProcessGraph {
  nodes: Map<string, BPMNFlowElement>;
  edges: Map<string, BPMNSequenceFlow[]>;
  startNodes: BPMNFlowElement[];
  endNodes: BPMNFlowElement[];
}

const MAX_PATHS = 100; // Prevent path explosion

/**
 * Build process graph from BPMN elements
 */
export function buildProcessGraph(elements: BPMNFlowElement[]): ProcessGraph {
  const nodes = new Map<string, BPMNFlowElement>();
  const edges = new Map<string, BPMNSequenceFlow[]>();
  const incomingCount = new Map<string, number>();

  // Separate nodes and edges
  const nonFlowElements = elements.filter((el) => el.$type !== 'bpmn:SequenceFlow');
  const sequenceFlows = elements.filter(
    (el) => el.$type === 'bpmn:SequenceFlow',
  ) as BPMNSequenceFlow[];

  // Build node map
  nonFlowElements.forEach((element) => {
    nodes.set(element.id, element);
    incomingCount.set(element.id, 0);
  });

  // Build edge map and count incoming flows
  sequenceFlows.forEach((flow) => {
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

    incomingCount.set(targetId, (incomingCount.get(targetId) || 0) + 1);
  });

  // Find start and end nodes
  const startNodes = nonFlowElements.filter((el) => (incomingCount.get(el.id) || 0) === 0);
  const endNodes = nonFlowElements.filter((el) => (edges.get(el.id) || []).length === 0);

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
): Map<string, ElementTiming[]> {
  const graph = buildProcessGraph(elements);
  const pathElements = traverseAllPaths(graph, startTime, defaultDurations, maxLoopIterations);

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
    } as ElementTiming & { pathId: string; instanceId: string; isLoopInstance: boolean });
  });

  return timingsMap;
}

/**
 * Traverse all execution paths starting from start nodes
 */
function traverseAllPaths(
  graph: ProcessGraph,
  startTime: number,
  defaultDurations: DefaultDurationInfo[],
  maxLoopIterations: number,
): PathElement[] {
  const allPathElements: PathElement[] = [];
  const activePaths: ExecutionPath[] = [];
  let pathCounter = 0;
  let instanceCounter = 0; // Global counter for unique instance IDs

  // Initialize paths from start nodes
  graph.startNodes.forEach((startNode) => {
    const path: ExecutionPath = {
      id: `path_${pathCounter++}`,
      elements: [],
      currentTime: startTime,
      visitedElements: new Set(),
      loopCounts: new Map(),
    };

    // Add the start node to this path
    const result = traverseSinglePath(path, graph, defaultDurations, maxLoopIterations, startNode, () => ++instanceCounter);
    allPathElements.push(...result.elements);

    // Add any branched paths
    if (result.branchedPaths.length > 0 && activePaths.length < MAX_PATHS) {
      activePaths.push(...result.branchedPaths);
    }
  });

  // Process remaining paths
  while (activePaths.length > 0 && allPathElements.length < MAX_PATHS * 10) {
    const path = activePaths.shift()!;

    // Find the next element to continue from for this branched path
    const nextElement = findNextElementForPath(path, graph);
    const result = traverseSinglePath(path, graph, defaultDurations, maxLoopIterations, nextElement || undefined, () => ++instanceCounter);

    allPathElements.push(...result.elements);

    // Add branched paths (limit to prevent explosion)
    if (activePaths.length + result.branchedPaths.length < MAX_PATHS) {
      activePaths.push(...result.branchedPaths);
    }
  }

  return allPathElements;
}

/**
 * Traverse a single execution path
 */
function traverseSinglePath(
  path: ExecutionPath,
  graph: ProcessGraph,
  defaultDurations: DefaultDurationInfo[],
  maxLoopIterations: number,
  startElement?: BPMNFlowElement,
  getNextInstanceId?: () => number,
): { elements: PathElement[]; branchedPaths: ExecutionPath[] } {
  const newElements: PathElement[] = [];
  const branchedPaths: ExecutionPath[] = [];

  // Start with provided element or find next element
  let currentElement = startElement || findNextElement(path, graph);

  while (currentElement) {
    // Loop detection
    const loopCount = path.loopCounts.get(currentElement.id) || 0;
    if (loopCount >= maxLoopIterations) {
      break; // Stop this path to prevent infinite loops
    }

    // Calculate duration
    let duration = extractDuration(currentElement);
    if (
      duration === 0 &&
      (isTaskElement(currentElement) || isSupportedEventElement(currentElement))
    ) {
      if (isTaskElement(currentElement)) {
        duration = 3600000; // 1 hour default
        defaultDurations.push({
          elementId: currentElement.id,
          elementType: currentElement.$type,
          elementName: currentElement.name,
          appliedDuration: duration,
          durationType: 'task',
        });
      }
    }

    // Create path element with unique instance ID
    const instanceId = getNextInstanceId ? 
      `${currentElement.id}_instance_${getNextInstanceId()}` : 
      `${currentElement.id}_${path.id}_${loopCount}`;
      
    const pathElement: PathElement = {
      elementId: currentElement.id,
      pathId: path.id,
      instanceId,
      startTime: path.currentTime,
      endTime: path.currentTime + duration,
      duration,
      isLoopInstance: loopCount > 0,
    };

    newElements.push(pathElement);

    // Update path state
    path.currentTime = pathElement.endTime;
    path.loopCounts.set(currentElement.id, loopCount + 1);
    path.visitedElements.add(currentElement.id);

    // Get outgoing flows
    const outgoingFlows = graph.edges.get(currentElement.id) || [];

    if (outgoingFlows.length === 0) {
      // End of path
      break;
    } else if (outgoingFlows.length === 1) {
      // Single path - continue
      const flow = outgoingFlows[0];
      const targetId =
        typeof flow.targetRef === 'string'
          ? flow.targetRef
          : (flow.targetRef as any)?.id;
      
      // Add flow duration to current time
      const flowDuration = extractDuration(flow) || 0;
      path.currentTime += flowDuration;
      
      currentElement = graph.nodes.get(targetId) || null;
    } else {
      // Multiple paths - branch
      // Create separate paths for each outgoing flow starting from the next elements
      outgoingFlows.forEach((flow, index) => {
        const targetId =
          typeof flow.targetRef === 'string' ? flow.targetRef : (flow.targetRef as any)?.id;
        const targetElement = graph.nodes.get(targetId);

        // Add flow duration to current time for each branch
        const flowDuration = extractDuration(flow) || 0;
        const branchTime = path.currentTime + flowDuration;

        if (index === 0) {
          // Continue current path with first branch
          path.currentTime = branchTime;
          currentElement = targetElement || null;
        } else {
          // Create new path for other branches
          const newPath: ExecutionPath = {
            id: `${path.id}_branch_${index}`,
            elements: [...path.elements],
            currentTime: branchTime,
            visitedElements: new Set(path.visitedElements),
            loopCounts: new Map(path.loopCounts),
            nextElementId: targetId,
          };

          branchedPaths.push(newPath);
        }
      });
    }
  }

  return { elements: newElements, branchedPaths };
}

/**
 * Find the next element to process in a path
 */
function findNextElement(path: ExecutionPath, graph: ProcessGraph): BPMNFlowElement | null {
  // If path is empty, return first start node
  if (path.elements.length === 0) {
    return graph.startNodes[0] || null;
  }

  // This is handled by the main traversal logic
  return null;
}

/**
 * Find the next element for a branched path
 */
function findNextElementForPath(path: ExecutionPath, graph: ProcessGraph): BPMNFlowElement | null {
  if (path.nextElementId) {
    return graph.nodes.get(path.nextElementId) || null;
  }
  return null;
}

/**
 * Handle branching when multiple outgoing flows exist
 */
function handleBranching(
  flows: BPMNSequenceFlow[],
  currentPath: ExecutionPath,
  branchedPaths: ExecutionPath[],
  graph: ProcessGraph,
): BPMNFlowElement | null {
  // For now, treat all branches as parallel (create new paths for each)
  flows.forEach((flow, index) => {
    const targetId =
      typeof flow.targetRef === 'string' ? flow.targetRef : (flow.targetRef as any)?.id;

    if (index === 0) {
      // Continue current path with first branch
      return graph.nodes.get(targetId) || null;
    } else {
      // Create new path for other branches
      const newPath: ExecutionPath = {
        id: `${currentPath.id}_branch_${index}`,
        elements: [...currentPath.elements],
        currentTime: currentPath.currentTime,
        visitedElements: new Set(currentPath.visitedElements),
        loopCounts: new Map(currentPath.loopCounts),
      };

      branchedPaths.push(newPath);
    }
  });

  // Return target of first flow for current path
  const firstTargetId =
    typeof flows[0].targetRef === 'string' ? flows[0].targetRef : (flows[0].targetRef as any)?.id;
  return graph.nodes.get(firstTargetId) || null;
}
