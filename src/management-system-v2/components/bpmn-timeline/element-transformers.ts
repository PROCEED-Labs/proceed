/**
 * BPMN Element Transformation Functions
 *
 * This module contains functions that transform individual BPMN elements
 * (tasks, events, sequence flows) into their corresponding Gantt chart representations.
 */

import type { GanttElementType, GanttDependency } from '@/components/gantt-chart-canvas/types';
import { DependencyType } from '@/components/gantt-chart-canvas/types';
import type { BPMNTask, BPMNEvent, BPMNSequenceFlow, BPMNGateway, BPMNFlowElement } from './types';
import {
  getTaskTypeString,
  getEventTypeString,
  getGatewayTypeString,
  extractDuration,
  extractGatewayMetadata,
} from './utils';

// ============================================================================
// Element Transformation Functions
// ============================================================================

/**
 * Transform BPMN task to Gantt task
 */
export function transformTask(
  task: BPMNTask,
  startTime: number,
  duration: number,
  color?: string,
): GanttElementType {
  return {
    id: task.id,
    name: task.name,
    type: 'task',
    start: startTime,
    end: startTime + duration,
    elementType: getTaskTypeString(task),
    color,
  };
}

/**
 * Transform BPMN event to Gantt milestone
 * Using Option A: Events positioned at the end of their duration (completion time)
 */
export function transformEvent(
  event: BPMNEvent,
  startTime: number,
  duration: number,
  color?: string,
): GanttElementType {
  if (duration > 0) {
    // Event has duration - show the time range with milestone at completion time
    // Option A: milestone appears at event completion time but shows the full range
    return {
      id: event.id,
      name: event.name,
      type: 'milestone',
      start: startTime,
      end: startTime + duration,
      elementType: getEventTypeString(event),
      color,
    };
  } else {
    // Event has no duration - point milestone at start time
    return {
      id: event.id,
      name: event.name,
      type: 'milestone',
      start: startTime,
      elementType: getEventTypeString(event),
      color,
    };
  }
}

/**
 * Transform BPMN gateway to Gantt milestone
 */
export function transformGateway(
  gateway: BPMNGateway,
  startTime: number,
  duration: number,
  color?: string,
): GanttElementType {
  return {
    id: gateway.id,
    name: gateway.name,
    type: 'milestone',
    start: startTime,
    end: startTime + duration,
    elementType: getGatewayTypeString(gateway),
    color,
  };
}

/**
 * Determine flow type based on BPMN properties
 */
export function getFlowType(flow: BPMNSequenceFlow): 'conditional' | 'default' | 'normal' {
  // Check if flow has a condition expression (conditional flow)
  if (flow.conditionExpression) {
    return 'conditional';
  }

  // Check if flow is marked as default (from gateway default sequence flow)
  // In BPMN, default flows are typically marked on the gateway's default property
  // but we can also check for specific naming patterns or attributes
  if (
    flow.name &&
    (flow.name.toLowerCase().includes('default') || flow.name.toLowerCase().includes('else'))
  ) {
    return 'default';
  }

  return 'normal';
}

/**
 * Transform BPMN sequence flow to Gantt dependency
 */
export function transformSequenceFlow(flow: BPMNSequenceFlow): GanttDependency {
  // Handle case where sourceRef/targetRef might be ModdleElement objects or strings
  const sourceId =
    typeof flow.sourceRef === 'string'
      ? flow.sourceRef
      : (flow.sourceRef as any)?.id || flow.sourceRef;
  const targetId =
    typeof flow.targetRef === 'string'
      ? flow.targetRef
      : (flow.targetRef as any)?.id || flow.targetRef;

  return {
    id: flow.id,
    sourceId: sourceId,
    targetId: targetId,
    type: DependencyType.FINISH_TO_START, // BPMN sequence flows are finish-to-start dependencies
    name: flow.name,
    flowType: getFlowType(flow),
  };
}

// ============================================================================
// Gateway Detection and Transformation Functions
// ============================================================================

/**
 * Check if an element is a gateway
 */
export function isGatewayElement(element: BPMNFlowElement): element is BPMNGateway {
  return (
    element.$type === 'bpmn:ExclusiveGateway' ||
    element.$type === 'bpmn:InclusiveGateway' ||
    element.$type === 'bpmn:ParallelGateway' ||
    element.$type === 'bpmn:ComplexGateway' ||
    element.$type === 'bpmn:EventBasedGateway'
  );
}

/**
 * Check if an element is an exclusive gateway (XOR)
 */
export function isExclusiveGateway(element: BPMNFlowElement): element is BPMNGateway {
  return element.$type === 'bpmn:ExclusiveGateway';
}

/**
 * Check if an element is a parallel gateway (AND)
 */
export function isParallelGateway(element: BPMNFlowElement): element is BPMNGateway {
  return element.$type === 'bpmn:ParallelGateway';
}

/**
 * Gateway preprocessing result containing modified elements and new dependencies
 */
export interface GatewayPreprocessingResult {
  /** Flow elements with gateways removed */
  processedElements: BPMNFlowElement[];
  /** New dependencies created from gateway transformations */
  gatewayDependencies: GatewayDependency[];
  /** Removed sequence flows that went through gateways */
  removedFlows: string[];
  /** Unsupported gateways that were not processed */
  unsupportedGateways: Array<{
    elementId: string;
    elementType: string;
    elementName?: string;
    reason: string;
  }>;
}

/**
 * Extended dependency type for gateways with combined duration
 */
export interface GatewayDependency {
  /** Dependency ID */
  id: string;
  /** Source element ID */
  sourceId: string;
  /** Target element ID */
  targetId: string;
  /** Dependency type */
  type: DependencyType;
  /** Dependency name */
  name?: string;
  /** Flow type */
  flowType: 'conditional' | 'default' | 'normal';
  /** Combined duration of incoming flow + gateway + outgoing flow */
  combinedDuration: number;
  /** Original gateway that created this dependency */
  gatewayId: string;
  /** Gateway type for debugging */
  gatewayType: string;
  /** Path identifier for distinguishing multiple routes */
  pathId?: string;
}

/**
 * Virtual synchronization point for parallel gateways
 */
export interface VirtualSyncPoint {
  /** Unique ID for this sync point */
  id: string;
  /** Gateway that created this sync point */
  gatewayId: string;
  /** Gateway type */
  gatewayType: string;
  /** Gateway name */
  gatewayName?: string;
  /** All source elements that must complete */
  sourceIds: string[];
  /** All target elements that depend on synchronization */
  targetIds: string[];
  /** Gateway duration */
  gatewayDuration: number;
}

/**
 * Create virtual sync points for parallel gateways to optimize dependency creation
 */
function createVirtualSyncPoints(
  gateways: BPMNGateway[],
  flowMap: Map<string, BPMNSequenceFlow>,
): Map<string, VirtualSyncPoint> {
  const syncPoints = new Map<string, VirtualSyncPoint>();

  for (const gateway of gateways) {
    if (!isParallelGateway(gateway)) continue;

    const incomingFlowIds = (gateway.incoming || []).map((item) =>
      typeof item === 'string' ? item : (item as any)?.id || item,
    );
    const outgoingFlowIds = (gateway.outgoing || []).map((item) =>
      typeof item === 'string' ? item : (item as any)?.id || item,
    );

    const incomingFlows = incomingFlowIds
      .map((id) => flowMap.get(id))
      .filter(Boolean) as BPMNSequenceFlow[];
    const outgoingFlows = outgoingFlowIds
      .map((id) => flowMap.get(id))
      .filter(Boolean) as BPMNSequenceFlow[];

    // Only create sync points for actual synchronization scenarios (multiple inputs)
    if (incomingFlows.length > 1 && outgoingFlows.length >= 1) {
      const sourceIds = incomingFlows.map((flow) =>
        typeof flow.sourceRef === 'string' ? flow.sourceRef : (flow.sourceRef as any)?.id,
      );
      const targetIds = outgoingFlows.map((flow) =>
        typeof flow.targetRef === 'string' ? flow.targetRef : (flow.targetRef as any)?.id,
      );

      syncPoints.set(gateway.id, {
        id: `sync_${gateway.id}`,
        gatewayId: gateway.id,
        gatewayType: gateway.$type,
        gatewayName: gateway.name,
        sourceIds,
        targetIds,
        gatewayDuration: extractDuration(gateway) || 0,
      });
    }
  }

  return syncPoints;
}

/**
 * Internal gateway preprocessing without chain resolution
 */
function preprocessGatewaysInternal(elements: BPMNFlowElement[]): GatewayPreprocessingResult {
  const processedElements: BPMNFlowElement[] = [];
  const gatewayDependencies: GatewayDependency[] = [];
  const removedFlows: string[] = [];
  const unsupportedGateways: Array<{
    elementId: string;
    elementType: string;
    elementName?: string;
    reason: string;
  }> = [];

  // Build element maps for fast lookup
  const elementMap = new Map<string, BPMNFlowElement>();
  const flowMap = new Map<string, BPMNSequenceFlow>();

  elements.forEach((element) => {
    elementMap.set(element.id, element);
    if (element.$type === 'bpmn:SequenceFlow') {
      flowMap.set(element.id, element as BPMNSequenceFlow);
    }
  });

  // Find all gateways
  const allGateways = elements.filter(isGatewayElement) as BPMNGateway[];

  // Separate supported and unsupported gateways
  const supportedGateways: BPMNGateway[] = [];

  for (const gateway of allGateways) {
    if (isExclusiveGateway(gateway) || isParallelGateway(gateway)) {
      supportedGateways.push(gateway);
    } else {
      // Record unsupported gateway
      unsupportedGateways.push({
        elementId: gateway.id,
        elementType: gateway.$type,
        elementName: gateway.name,
        reason: `Gateway type ${gateway.$type} is not supported. Only exclusive and parallel gateways are currently supported.`,
      });
    }
  }

  // Process each supported gateway based on its type
  for (const gateway of supportedGateways) {
    // Handle case where incoming/outgoing contain objects instead of IDs
    const incomingFlowIds = (gateway.incoming || []).map((item) =>
      typeof item === 'string' ? item : (item as any)?.id || item,
    );
    const outgoingFlowIds = (gateway.outgoing || []).map((item) =>
      typeof item === 'string' ? item : (item as any)?.id || item,
    );

    const incomingFlows = incomingFlowIds
      .map((id) => flowMap.get(id))
      .filter(Boolean) as BPMNSequenceFlow[];
    const outgoingFlows = outgoingFlowIds
      .map((id) => flowMap.get(id))
      .filter(Boolean) as BPMNSequenceFlow[];

    // Get gateway duration (default to 0ms)
    const gatewayDuration = extractDuration(gateway) || 0;

    if (isParallelGateway(gateway)) {
      // Parallel Gateway: Create dependencies based on pattern

      if (incomingFlows.length > 1 && outgoingFlows.length >= 1) {
        // Synchronizing join pattern - create virtual sync point approach
        // Instead of M×N dependencies, we'll create flows that preserve paths

        // For each incoming→outgoing combination, create a unique path
        let pathIndex = 0;
        for (const incomingFlow of incomingFlows) {
          for (const outgoingFlow of outgoingFlows) {
            const sourceId =
              typeof incomingFlow.sourceRef === 'string'
                ? incomingFlow.sourceRef
                : (incomingFlow.sourceRef as any)?.id || incomingFlow.sourceRef;

            const targetId =
              typeof outgoingFlow.targetRef === 'string'
                ? outgoingFlow.targetRef
                : (outgoingFlow.targetRef as any)?.id || outgoingFlow.targetRef;

            const incomingDuration = extractDuration(incomingFlow) || 0;
            const outgoingDuration = extractDuration(outgoingFlow) || 0;
            const combinedDuration = incomingDuration + gatewayDuration + outgoingDuration;

            // Create dependency with unique path identifier
            const gatewayDependency: GatewayDependency = {
              id: `parallel_${gateway.id}_path${pathIndex}_${sourceId}_to_${targetId}`,
              sourceId: sourceId,
              targetId: targetId,
              type: DependencyType.FINISH_TO_START,
              name: `Via ${gateway.name || gateway.id} (sync)`,
              flowType: 'normal',
              combinedDuration: combinedDuration,
              gatewayId: gateway.id,
              gatewayType: gateway.$type,
              pathId: `${gateway.id}_path${pathIndex}`,
            };

            gatewayDependencies.push(gatewayDependency);
            pathIndex++;
          }
        }
      } else if (incomingFlows.length === 1 && outgoingFlows.length > 1) {
        // Fork pattern - create separate paths for each branch
        const incomingFlow = incomingFlows[0];
        const sourceId =
          typeof incomingFlow.sourceRef === 'string'
            ? incomingFlow.sourceRef
            : (incomingFlow.sourceRef as any)?.id || incomingFlow.sourceRef;
        const incomingDuration = extractDuration(incomingFlow) || 0;

        let pathIndex = 0;
        for (const outgoingFlow of outgoingFlows) {
          const targetId =
            typeof outgoingFlow.targetRef === 'string'
              ? outgoingFlow.targetRef
              : (outgoingFlow.targetRef as any)?.id || outgoingFlow.targetRef;

          const outgoingDuration = extractDuration(outgoingFlow) || 0;
          const combinedDuration = incomingDuration + gatewayDuration + outgoingDuration;

          const gatewayDependency: GatewayDependency = {
            id: `parallel_${gateway.id}_fork${pathIndex}_${sourceId}_to_${targetId}`,
            sourceId: sourceId,
            targetId: targetId,
            type: DependencyType.FINISH_TO_START,
            name: `Via ${gateway.name || gateway.id} (fork)`,
            flowType: 'normal',
            combinedDuration: combinedDuration,
            gatewayId: gateway.id,
            gatewayType: gateway.$type,
            pathId: `${gateway.id}_fork${pathIndex}`,
          };

          gatewayDependencies.push(gatewayDependency);
          pathIndex++;
        }
      } else if (incomingFlows.length === 1 && outgoingFlows.length === 1) {
        // Pass-through pattern (1 in, 1 out) - gateway in a chain
        // This is important for gateway chains like G1 → G2 → T2
        const incomingFlow = incomingFlows[0];
        const outgoingFlow = outgoingFlows[0];

        const sourceId =
          typeof incomingFlow.sourceRef === 'string'
            ? incomingFlow.sourceRef
            : (incomingFlow.sourceRef as any)?.id || incomingFlow.sourceRef;

        const targetId =
          typeof outgoingFlow.targetRef === 'string'
            ? outgoingFlow.targetRef
            : (outgoingFlow.targetRef as any)?.id || outgoingFlow.targetRef;

        const incomingDuration = extractDuration(incomingFlow) || 0;
        const outgoingDuration = extractDuration(outgoingFlow) || 0;
        const combinedDuration = incomingDuration + gatewayDuration + outgoingDuration;

        const gatewayDependency: GatewayDependency = {
          id: `parallel_${gateway.id}_passthrough_${sourceId}_to_${targetId}`,
          sourceId: sourceId,
          targetId: targetId,
          type: DependencyType.FINISH_TO_START,
          name: `Via ${gateway.name || gateway.id}`,
          flowType: 'normal',
          combinedDuration: combinedDuration,
          gatewayId: gateway.id,
          gatewayType: gateway.$type,
          pathId: `${gateway.id}_passthrough`,
        };

        gatewayDependencies.push(gatewayDependency);
      }
    } else {
      // Exclusive Gateway: Create all possible paths with unique identifiers
      let pathIndex = 0;

      for (const incomingFlow of incomingFlows) {
        for (const outgoingFlow of outgoingFlows) {
          const sourceId =
            typeof incomingFlow.sourceRef === 'string'
              ? incomingFlow.sourceRef
              : (incomingFlow.sourceRef as any)?.id || incomingFlow.sourceRef;

          const targetId =
            typeof outgoingFlow.targetRef === 'string'
              ? outgoingFlow.targetRef
              : (outgoingFlow.targetRef as any)?.id || outgoingFlow.targetRef;

          const incomingDuration = extractDuration(incomingFlow) || 0;
          const outgoingDuration = extractDuration(outgoingFlow) || 0;
          const combinedDuration = incomingDuration + gatewayDuration + outgoingDuration;

          const gatewayDependency: GatewayDependency = {
            id: `exclusive_${gateway.id}_path${pathIndex}_${sourceId}_to_${targetId}`,
            sourceId: sourceId,
            targetId: targetId,
            type: DependencyType.FINISH_TO_START,
            name: `Via ${gateway.name || gateway.id}`,
            flowType: 'normal',
            combinedDuration: combinedDuration,
            gatewayId: gateway.id,
            gatewayType: gateway.$type,
            pathId: `${gateway.id}_xor_path${pathIndex}`,
          };

          gatewayDependencies.push(gatewayDependency);
          pathIndex++;
        }
      }
    }

    // Mark flows connected to this gateway for removal
    [...incomingFlows, ...outgoingFlows].forEach((flow) => {
      removedFlows.push(flow.id);
    });
  }

  // Filter out only supported gateways and their connected flows from processed elements
  const supportedGatewayIds = new Set(supportedGateways.map((g) => g.id));
  const removedFlowIds = new Set(removedFlows);

  for (const element of elements) {
    // Skip only supported gateways and their flows
    // Unsupported gateways will be kept and handled as errors later
    if (supportedGatewayIds.has(element.id) || removedFlowIds.has(element.id)) {
      continue;
    }

    processedElements.push(element);
  }

  // Add gateway dependencies as synthetic sequence flows
  for (const gatewayDep of gatewayDependencies) {
    const metaChildren: any[] = [
      {
        $type: 'proceed:timePlannedDuration',
        name: 'timePlannedDuration',
        $body: `PT${Math.round(gatewayDep.combinedDuration / 1000)}S`, // Convert ms to ISO 8601
      },
      {
        $type: 'proceed:gatewayType',
        name: 'gatewayType',
        $body: gatewayDep.gatewayType, // Store gateway type for timing logic
      },
      {
        $type: 'proceed:gatewayId',
        name: 'gatewayId',
        $body: gatewayDep.gatewayId, // Store gateway ID for grouping
      },
    ];

    // Add pathId if present (for parallel gateway paths)
    if (gatewayDep.pathId) {
      metaChildren.push({
        $type: 'proceed:pathId',
        name: 'pathId',
        $body: gatewayDep.pathId,
      });
    }

    const syntheticFlow: BPMNSequenceFlow = {
      $type: 'bpmn:SequenceFlow',
      id: gatewayDep.id,
      sourceRef: gatewayDep.sourceId,
      targetRef: gatewayDep.targetId,
      name: gatewayDep.name,
      // Store combined duration and gateway metadata in extension elements
      extensionElements: {
        $type: 'bpmn:ExtensionElements',
        values: [
          {
            $type: 'proceed:Meta',
            $children: metaChildren,
          },
        ],
      },
    };

    processedElements.push(syntheticFlow);
  }

  return {
    processedElements,
    gatewayDependencies,
    removedFlows,
    unsupportedGateways,
  };
}

/**
 * Preprocess gateways to create direct dependencies between
 * predecessor and successor elements
 * Handles Exclusive (XOR) and Parallel (AND) gateways with proper timing semantics
 * Includes gateway chain resolution for complex gateway-to-gateway connections
 */
export function preprocessGateways(elements: BPMNFlowElement[]): GatewayPreprocessingResult {
  // First, resolve any missing gateway chains on the original elements (before preprocessing removes gateways)
  const elementsWithResolvedChains = resolveGatewayChains(elements);

  // Then, do gateway preprocessing on the elements with resolved chains
  const finalResult = preprocessGatewaysInternal(elementsWithResolvedChains);

  return finalResult;
}

/**
 * Resolve gateway chains using iterative approach for better clarity and performance
 */
function resolveGatewayChains(elements: BPMNFlowElement[]): BPMNFlowElement[] {
  const result = [...elements];
  const elementMap = new Map<string, BPMNFlowElement>();
  const flowMap = new Map<string, BPMNSequenceFlow>();

  // Build maps
  elements.forEach((el) => {
    elementMap.set(el.id, el);
    if (el.$type === 'bpmn:SequenceFlow') {
      flowMap.set(el.id, el as BPMNSequenceFlow);
    }
  });

  // Build adjacency lists
  const outgoingFlows = new Map<string, string[]>(); // elementId -> [targetIds]
  const incomingFlows = new Map<string, string[]>(); // elementId -> [sourceIds]

  flowMap.forEach((flow) => {
    const sourceId =
      typeof flow.sourceRef === 'string' ? flow.sourceRef : (flow.sourceRef as any)?.id;
    const targetId =
      typeof flow.targetRef === 'string' ? flow.targetRef : (flow.targetRef as any)?.id;

    if (!outgoingFlows.has(sourceId)) outgoingFlows.set(sourceId, []);
    if (!incomingFlows.has(targetId)) incomingFlows.set(targetId, []);

    outgoingFlows.get(sourceId)!.push(targetId);
    incomingFlows.get(targetId)!.push(sourceId);
  });

  // Find all gateway chains iteratively
  const chains = findGatewayChains(elementMap, outgoingFlows, incomingFlows);

  // Create synthetic flows for chains
  for (const chain of chains) {
    const syntheticFlow = createChainFlow(chain, flowMap, elementMap);
    result.push(syntheticFlow);
  }

  return result;
}

/**
 * Find gateway chains iteratively
 */
function findGatewayChains(
  elementMap: Map<string, BPMNFlowElement>,
  outgoingFlows: Map<string, string[]>,
  incomingFlows: Map<string, string[]>,
): Array<{ sourceId: string; targetId: string; gateways: string[] }> {
  const chains: Array<{ sourceId: string; targetId: string; gateways: string[] }> = [];
  const processedPairs = new Set<string>();

  // For each non-gateway element
  elementMap.forEach((element, elementId) => {
    if (isGatewayElement(element) || element.$type === 'bpmn:SequenceFlow') return;

    // BFS to find all reachable non-gateway elements through gateway chains
    const queue: Array<{ currentId: string; path: string[] }> = [
      { currentId: elementId, path: [] },
    ];
    const visited = new Set<string>([elementId]);

    while (queue.length > 0) {
      const { currentId, path } = queue.shift()!;
      const currentElement = elementMap.get(currentId);

      if (!currentElement) continue;

      // If we reached a non-gateway element and it's not the start
      if (!isGatewayElement(currentElement) && currentId !== elementId && path.length > 0) {
        const pairKey = `${elementId}->${currentId}`;
        if (!processedPairs.has(pairKey)) {
          processedPairs.add(pairKey);
          chains.push({ sourceId: elementId, targetId: currentId, gateways: path });
        }
      }

      // Continue exploring if current is a gateway
      if (isGatewayElement(currentElement)) {
        const nextTargets = outgoingFlows.get(currentId) || [];
        for (const targetId of nextTargets) {
          if (!visited.has(targetId)) {
            visited.add(targetId);
            queue.push({ currentId: targetId, path: [...path, currentId] });
          }
        }
      }
    }
  });

  return chains;
}

/**
 * Create a synthetic flow for a gateway chain
 */
function createChainFlow(
  chain: { sourceId: string; targetId: string; gateways: string[] },
  flowMap: Map<string, BPMNSequenceFlow>,
  elementMap: Map<string, BPMNFlowElement>,
): BPMNSequenceFlow {
  // Calculate total duration through the chain
  let totalDuration = 0;
  let currentId = chain.sourceId;

  for (const gatewayId of chain.gateways) {
    // Find flow from current to gateway
    const flow = Array.from(flowMap.values()).find((f) => {
      const sourceId = typeof f.sourceRef === 'string' ? f.sourceRef : (f.sourceRef as any)?.id;
      const targetId = typeof f.targetRef === 'string' ? f.targetRef : (f.targetRef as any)?.id;
      return sourceId === currentId && targetId === gatewayId;
    });

    if (flow) {
      totalDuration += extractDuration(flow) || 0;
    }

    // Add gateway duration
    const gateway = elementMap.get(gatewayId);
    if (gateway) {
      totalDuration += extractDuration(gateway) || 0;
    }

    currentId = gatewayId;
  }

  // Add final flow duration
  const finalFlow = Array.from(flowMap.values()).find((f) => {
    const sourceId = typeof f.sourceRef === 'string' ? f.sourceRef : (f.sourceRef as any)?.id;
    const targetId = typeof f.targetRef === 'string' ? f.targetRef : (f.targetRef as any)?.id;
    return sourceId === currentId && targetId === chain.targetId;
  });

  if (finalFlow) {
    totalDuration += extractDuration(finalFlow) || 0;
  }

  const gatewayNames = chain.gateways.map((id) => {
    const g = elementMap.get(id);
    return g && 'name' in g && g.name ? g.name : id;
  });

  return {
    $type: 'bpmn:SequenceFlow',
    id: `chain_${chain.sourceId}_to_${chain.targetId}_via_${chain.gateways.join('_')}`,
    sourceRef: chain.sourceId,
    targetRef: chain.targetId,
    name: `Via ${gatewayNames.join(' → ')}`,
    extensionElements: {
      $type: 'bpmn:ExtensionElements',
      values: [
        {
          $type: 'proceed:Meta',
          $children: [
            {
              $type: 'proceed:timePlannedDuration',
              name: 'timePlannedDuration',
              $body: `PT${Math.round(totalDuration / 1000)}S`,
            },
            {
              $type: 'proceed:chainResolution',
              name: 'chainResolution',
              $body: 'true',
            },
          ],
        },
      ],
    },
  };
}
