/**
 * Helper functions for BPMN transformation
 */

import type {
  BPMNDefinitions,
  BPMNFlowElement,
  TransformationIssue,
  DefaultDurationInfo,
} from './types';
import { isGatewayElement, isExclusiveGateway, isParallelGateway } from './element-transformers';
import {
  isTaskElement,
  isSupportedEventElement,
  isSequenceFlowElement,
  getUnsupportedElementReason,
  detectGatewayMismatches,
} from './utils';
import { calculatePathBasedTimings } from './path-traversal';

export interface ProcessValidationResult {
  supportedElements: BPMNFlowElement[];
  issues: TransformationIssue[];
  process: any;
}

/**
 * Validate and extract process from BPMN definitions
 */
export function validateAndExtractProcess(definitions: BPMNDefinitions): ProcessValidationResult {
  const issues: TransformationIssue[] = [];

  // Get the first process (main process)
  const process = definitions.rootElements?.[0];
  if (!process || process.$type !== 'bpmn:Process') {
    issues.push({
      elementId: 'root',
      elementType: 'Process',
      reason: 'No valid process found in definitions',
      severity: 'error',
    });
    return { supportedElements: [], issues, process: null };
  }

  return { supportedElements: [], issues, process };
}

/**
 * Detect and report gateway issues
 */
export function detectAndReportGatewayIssues(
  flowElements: BPMNFlowElement[],
  renderGateways: boolean,
): TransformationIssue[] {
  const issues: TransformationIssue[] = [];

  // Detect gateway mismatches (exclusive → parallel join patterns)
  const gatewayMismatches = detectGatewayMismatches(flowElements);
  gatewayMismatches.forEach((mismatch) => {
    const exclusiveGatewayNames = mismatch.exclusiveOrigins
      .map((origin) => origin.gatewayName || origin.gatewayId)
      .join(', ');
    const pathDescription = mismatch.exclusiveOrigins
      .map(
        (origin) =>
          `Path through ${origin.gatewayName || origin.gatewayId}: [${origin.pathElements.join(' → ')}]`,
      )
      .join('; ');

    issues.push({
      elementId: mismatch.parallelJoinId,
      elementType: 'bpmn:ParallelGateway',
      elementName: mismatch.parallelJoinName,
      reason: `Potential deadlock detected: Parallel join gateway '${mismatch.parallelJoinName || mismatch.parallelJoinId}' receives flows from exclusive gateway(s) '${exclusiveGatewayNames}'. In real BPMN execution, this could cause the parallel join to wait indefinitely for flows that may never arrive. Paths: ${pathDescription}`,
      severity: 'warning',
    });
  });

  // Check for unsupported gateway types
  if (!renderGateways) {
    const gateways = flowElements.filter(isGatewayElement);
    for (const gateway of gateways) {
      if (!isExclusiveGateway(gateway) && !isParallelGateway(gateway)) {
        issues.push({
          elementId: gateway.id,
          elementType: gateway.$type,
          elementName: gateway.name,
          reason: `Gateway type ${gateway.$type} is not supported. Only exclusive and parallel gateways are currently supported.`,
          severity: 'error',
        });
      }
    }
  }

  return issues;
}

/**
 * Separate supported and unsupported elements
 */
export function separateSupportedElements(elementsToProcess: BPMNFlowElement[]): {
  supportedElements: BPMNFlowElement[];
  issues: TransformationIssue[];
} {
  const supportedElements: BPMNFlowElement[] = [];
  const issues: TransformationIssue[] = [];

  elementsToProcess.forEach((element) => {
    if (
      isSequenceFlowElement(element) ||
      isTaskElement(element) ||
      isSupportedEventElement(element) ||
      isGatewayElement(element)
    ) {
      // Always include gateways in supported elements for path traversal
      // They'll be filtered out during rendering if renderGateways is false
      supportedElements.push(element);
    } else {
      // Other unsupported elements
      issues.push({
        elementId: element.id,
        elementType: element.$type,
        elementName: element.name,
        reason: getUnsupportedElementReason(element.$type),
        severity: 'error',
      });
    }
  });

  return { supportedElements, issues };
}

/**
 * Calculate timings using path-based traversal
 */
export function calculateTimingsForMode(
  supportedElements: BPMNFlowElement[],
  startTime: number,
  defaultDurations: DefaultDurationInfo[],
  loopDepth: number,
) {
  return calculatePathBasedTimings(supportedElements, startTime, defaultDurations, loopDepth);
}

/**
 * Filter dependencies to only include visible elements
 * When gateways are hidden, this will reconnect the dependency chain
 */
export function filterDependenciesForVisibleElements(
  ganttDependencies: any[],
  ganttElements: any[],
  renderGateways: boolean,
): any[] {
  if (!renderGateways) {
    const visibleIds = new Set(ganttElements.map((el) => el.id));

    // Build a map of gateway bypass connections
    const gatewayBypass = new Map<string, string[]>(); // gateway instance ID -> source instance IDs that lead to it
    const gatewayTargets = new Map<string, string[]>(); // gateway instance ID -> target instance IDs it leads to

    // First pass: identify gateway connections
    ganttDependencies.forEach((dep) => {
      // If target is a gateway (not visible), track the source
      if (!visibleIds.has(dep.targetId)) {
        if (!gatewayBypass.has(dep.targetId)) {
          gatewayBypass.set(dep.targetId, []);
        }
        gatewayBypass.get(dep.targetId)!.push(dep.sourceId);
      }

      // If source is a gateway (not visible), track the target
      if (!visibleIds.has(dep.sourceId)) {
        if (!gatewayTargets.has(dep.sourceId)) {
          gatewayTargets.set(dep.sourceId, []);
        }
        gatewayTargets.get(dep.sourceId)!.push(dep.targetId);
      }
    });

    // Second pass: create bypass dependencies
    const bypassDependencies: any[] = [];
    const processedPairs = new Set<string>();

    gatewayBypass.forEach((sources, gatewayId) => {
      const targets = gatewayTargets.get(gatewayId) || [];

      // Connect each source to each target, bypassing the gateway
      sources.forEach((sourceId) => {
        targets.forEach((targetId) => {
          // Only create bypass if both source and target are visible
          if (visibleIds.has(sourceId) && visibleIds.has(targetId)) {
            const pairKey = `${sourceId}->${targetId}`;
            if (!processedPairs.has(pairKey)) {
              processedPairs.add(pairKey);

              // Find the original flow through the gateway for metadata
              const throughGatewayDep =
                ganttDependencies.find(
                  (d) => d.sourceId === sourceId && !visibleIds.has(d.targetId),
                ) ||
                ganttDependencies.find(
                  (d) => d.targetId === targetId && !visibleIds.has(d.sourceId),
                );

              bypassDependencies.push({
                id: `${sourceId}_to_${targetId}_bypass`,
                sourceId,
                targetId,
                type: throughGatewayDep?.type || 'FINISH_TO_START',
                name: throughGatewayDep?.name,
                flowType: throughGatewayDep?.flowType,
              });
            }
          }
        });
      });
    });

    // Return original dependencies that don't involve gateways + bypass dependencies
    const directDependencies = ganttDependencies.filter(
      (dep) => visibleIds.has(dep.sourceId) && visibleIds.has(dep.targetId),
    );

    return [...directDependencies, ...bypassDependencies];
  }
  return ganttDependencies;
}
