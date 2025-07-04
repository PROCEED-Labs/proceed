/**
 * Path-based BPMN traversal - each element appears only once per unique execution path
 */

import type {
  BPMNFlowElement,
  BPMNSequenceFlow,
  ElementTiming,
  DefaultDurationInfo,
} from './types';
import { extractDuration, isTaskElement, isSupportedEventElement } from './utils';

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

  // Build edge map and count incoming flows (excluding self-loops)
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

    // Only count non-self-loop flows as incoming connections for start node detection
    if (sourceId !== targetId) {
      incomingCount.set(targetId, (incomingCount.get(targetId) || 0) + 1);
    }
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
): { timingsMap: Map<string, ElementTiming[]>; dependencies: Array<{ sourceInstanceId: string; targetInstanceId: string; flowId: string }> } {
  const graph = buildProcessGraph(elements);
  const { pathElements, dependencies } = traverseAllPaths(graph, startTime, defaultDurations, maxLoopIterations);

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
    } as ElementTiming & { pathId: string; instanceId: string; isLoopInstance: boolean; isPathCutoff?: boolean; isLoop?: boolean; isLoopCut?: boolean });
  });

  return { timingsMap, dependencies };
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
): { pathElements: PathElement[]; dependencies: Array<{ sourceInstanceId: string; targetInstanceId: string; flowId: string }> } {
  const pathElements: PathElement[] = [];
  const dependencies: Array<{ sourceInstanceId: string; targetInstanceId: string; flowId: string }> = [];
  const globalElementCount = new Map<string, number>(); // Global count of how many times each element has been visited
  let instanceCounter = 0;
  
  /**
   * Extract the base path (without loop iterations) for loop detection
   */
  function getBasePath(pathKey: string): string {
    // Remove loop iterations from path key to get the base execution path
    // Example: "main_StartEvent_0_loop_2" -> "main_StartEvent_0"
    return pathKey.replace(/_loop_\d+/g, '');
  }
  
  /**
   * Get or create an element instance for a specific path context with loop detection
   */
  function getOrCreateInstance(
    element: BPMNFlowElement, 
    pathKey: string, 
    timing: { startTime: number; endTime: number; duration: number },
    visitedElements: string[],
    pathSpecificVisits: Map<string, number>
  ): { pathElement: PathElement; shouldContinue: boolean } {
    
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
    // Continue traversal as long as we create the instance - we only stop when we refuse to create
    const shouldContinueTraversal = shouldCreateNewInstance;
    
    
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
      };
      
      pathElements.push(pathElement);
      
      return { pathElement, shouldContinue: shouldContinueTraversal };
    } else {
      // Loop depth exceeded - this shouldn't happen with our new logic
      // since we check before calling this function
      throw new Error(`Unexpected: shouldCreateNewInstance is false for ${element.id}`);
    }
  }

  /**
   * Explore all execution paths starting from start nodes
   */
  function explorePaths() {
    const pathsToExplore: Array<{
      elementId: string;
      pathKey: string;
      currentTime: number;
      visitedElements: string[]; // Track visited elements for loop detection
      pathSpecificVisits: Map<string, number>; // Track visit count per element on this path
      sourceInstanceId?: string; // The instance that led to this element
      flowId?: string; // The flow that led to this element
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
      iterationCount++;
      const { elementId, pathKey, currentTime, visitedElements, pathSpecificVisits, sourceInstanceId, flowId } = pathsToExplore.shift()!;
      
      // Create a signature that includes visited elements to detect true loops
      const pathSignature = `${elementId}:${pathKey}:${visitedElements.join('-')}`;
      if (processedPaths.has(pathSignature)) {
        continue;
      }
      processedPaths.add(pathSignature);

      const element = graph.nodes.get(elementId);
      if (!element) continue;

      // Calculate duration
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

      // Check if we should create an instance for this element visit
      const visitCount = pathSpecificVisits.get(elementId) || 0;
      const actualMaxIterations = Math.max(0, maxLoopIterations); // Clamp negative values to 0
      
      if (visitCount > actualMaxIterations) {
        // We've exceeded the loop depth, don't create instance and stop this path
        // Mark the source element as loop cut-off since this path terminates here
        if (sourceInstanceId) {
          const sourceElement = pathElements.find(pe => pe.instanceId === sourceInstanceId);
          if (sourceElement) {
            sourceElement.isLoopCut = true;
          }
        }
        
        continue;
      }

      // Create or get the element instance for this path with loop detection
      const { pathElement, shouldContinue } = getOrCreateInstance(element, pathKey, {
        startTime: currentTime,
        endTime: currentTime + duration,
        duration,
      }, visitedElements, pathSpecificVisits);


      // Create dependency if this element was reached from another instance
      if (sourceInstanceId && flowId) {
        dependencies.push({
          sourceInstanceId,
          targetInstanceId: pathElement.instanceId,
          flowId
        });
      }

      // Update path-specific visit count and visited elements
      const newVisitedElements = [...visitedElements, elementId];
      const newPathSpecificVisits = new Map(pathSpecificVisits);
      newPathSpecificVisits.set(elementId, (newPathSpecificVisits.get(elementId) || 0) + 1);

      // Get outgoing flows
      const outgoingFlows = graph.edges.get(elementId) || [];
      
      // For each outgoing flow, create a path that leads to the target
      outgoingFlows.forEach((flow, flowIndex) => {
        const targetId = typeof flow.targetRef === 'string' ? flow.targetRef : (flow.targetRef as any)?.id;
        if (!graph.nodes.has(targetId)) return;

        const flowDuration = extractDuration(flow) || 0;
        const nextTime = pathElement.endTime + flowDuration;

        // Create a unique path key for this execution sequence
        // For multiple outgoing flows, each gets its own path
        const nextPathKey = outgoingFlows.length === 1 
          ? pathKey 
          : `${pathKey}_${elementId}_${flowIndex}`;

        pathsToExplore.push({
          elementId: targetId,
          pathKey: nextPathKey,
          currentTime: nextTime,
          visitedElements: newVisitedElements,
          pathSpecificVisits: newPathSpecificVisits,
          sourceInstanceId: pathElement.instanceId,
          flowId: flow.id,
        });
      });
    }
    
    if (iterationCount >= MAX_ITERATIONS) {
      console.error(`Path traversal exceeded maximum iterations (${MAX_ITERATIONS}), stopping to prevent infinite loop`);
    }
  }

  explorePaths();
  return { pathElements, dependencies };
}