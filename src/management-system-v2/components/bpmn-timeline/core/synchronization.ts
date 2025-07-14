/**
 * Synchronization logic for BPMN path traversal
 */

import type { BPMNFlowElement, BPMNSequenceFlow } from '../types/types';
import { isGatewayElement } from '../transformers/element-transformers';

export interface SynchronizationRequirement {
  requiredSources: Set<string>;
  gatewayId: string;
  gatewayType: string;
}

export interface SyncQueue {
  elementId: string;
  pathKey: string;
  currentTime: number;
  visitedElements: string[];
  pathSpecificVisits: Map<string, number>;
  sourceInstanceId?: string;
  flowId?: string;
  sourceElementId?: string;
}

export interface SyncArrival {
  arrivedSources: Set<string>;
  completionTimes: Map<string, number>;
}

/**
 * Build a map of which flows require synchronization
 * Focuses on detecting parallel join patterns where multiple paths converge
 *
 * @param allElements - All BPMN flow elements in the process
 * @returns Map where key is target element ID and value contains synchronization requirements
 */
export function buildSynchronizationRequirements(
  allElements: BPMNFlowElement[],
): Map<string, SynchronizationRequirement> {
  const syncReqs = new Map<string, SynchronizationRequirement>();

  // Find all parallel gateways
  const parallelGateways = allElements.filter((el) => el.$type === 'bpmn:ParallelGateway');

  for (const gateway of parallelGateways) {
    const { incomingFlows, outgoingFlows } = getGatewayFlows(gateway, allElements);

    // Only create synchronization requirements for JOINS (multiple incoming, one or more outgoing)
    if (incomingFlows.length > 1 && outgoingFlows.length >= 1) {
      const sourcesFromIncoming = extractSourcesFromIncomingFlows(incomingFlows, allElements);

      // Create synchronization requirements for all targets of this parallel join
      for (const outFlow of outgoingFlows) {
        const targetId = extractTargetId(outFlow);
        const targetElement = allElements.find((el) => el.id === targetId);

        if (targetElement && !isGatewayElement(targetElement) && incomingFlows.length > 1) {
          syncReqs.set(targetId, {
            requiredSources: sourcesFromIncoming,
            gatewayId: gateway.id,
            gatewayType: 'bpmn:ParallelGateway',
          });
        }
      }
    }
  }

  return syncReqs;
}

/**
 * Count the number of incoming flows to a gateway
 */
export function incomingFlowsCountForGateway(
  gatewayId: string,
  elements: BPMNFlowElement[],
): number {
  const incomingFlows = elements.filter(
    (el) =>
      el.$type === 'bpmn:SequenceFlow' && extractTargetId(el as BPMNSequenceFlow) === gatewayId,
  ) as BPMNSequenceFlow[];

  return incomingFlows.length;
}

/**
 * Check if synchronization is ready (all expected sources have arrived)
 */
export function isSynchronizationReady(syncInfo: SyncArrival, expectedArrivals: number): boolean {
  return syncInfo.arrivedSources.size >= expectedArrivals;
}

/**
 * Calculate the synchronization time (latest completion time)
 */
export function calculateSyncTime(syncInfo: SyncArrival): number {
  return Math.max(...Array.from(syncInfo.completionTimes.values()));
}

/**
 * Create sync key for tracking synchronization points
 */
export function createSyncKey(elementId: string, gatewayId: string): string {
  return `${elementId}:${gatewayId}`;
}

/**
 * Initialize sync tracking for a new synchronization point
 */
export function initializeSyncTracking(): SyncArrival {
  return {
    arrivedSources: new Set(),
    completionTimes: new Map(),
  };
}

/**
 * Record arrival of a source at a synchronization point
 */
export function recordSourceArrival(
  syncInfo: SyncArrival,
  sourceInstanceId: string,
  currentTime: number,
): void {
  syncInfo.arrivedSources.add(sourceInstanceId || 'unknown');
  syncInfo.completionTimes.set(sourceInstanceId || 'unknown', currentTime);
}

// Helper functions

/**
 * Get incoming and outgoing flows for a gateway
 */
function getGatewayFlows(gateway: BPMNFlowElement, allElements: BPMNFlowElement[]) {
  const incomingFlows = allElements.filter(
    (el) =>
      el.$type === 'bpmn:SequenceFlow' && extractTargetId(el as BPMNSequenceFlow) === gateway.id,
  ) as BPMNSequenceFlow[];

  const outgoingFlows = allElements.filter(
    (el) =>
      el.$type === 'bpmn:SequenceFlow' && extractSourceId(el as BPMNSequenceFlow) === gateway.id,
  ) as BPMNSequenceFlow[];

  return { incomingFlows, outgoingFlows };
}

/**
 * Extract source elements from incoming flows
 */
function extractSourcesFromIncomingFlows(
  incomingFlows: BPMNSequenceFlow[],
  allElements: BPMNFlowElement[],
): Set<string> {
  const sourcesFromIncoming = new Set<string>();

  for (const flow of incomingFlows) {
    const sourceId = extractSourceId(flow);
    // Only include non-gateway sources (actual task/event elements)
    const sourceElement = allElements.find((el) => el.id === sourceId);
    if (sourceElement && !isGatewayElement(sourceElement)) {
      sourcesFromIncoming.add(sourceId);
    }
  }

  return sourcesFromIncoming;
}

/**
 * Extract source ID from a sequence flow
 */
function extractSourceId(flow: BPMNSequenceFlow): string {
  return typeof flow.sourceRef === 'string'
    ? flow.sourceRef
    : (flow.sourceRef as any)?.id || flow.sourceRef;
}

/**
 * Extract target ID from a sequence flow
 */
function extractTargetId(flow: BPMNSequenceFlow): string {
  return typeof flow.targetRef === 'string'
    ? flow.targetRef
    : (flow.targetRef as any)?.id || flow.targetRef;
}
