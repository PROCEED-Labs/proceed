/**
 * Helper functions for BPMN transformation
 */

import type {
  BPMNDefinitions,
  BPMNFlowElement,
  TransformationIssue,
  DefaultDurationInfo,
} from '../types/types';
import {
  isGatewayElement,
  isExclusiveGateway,
  isParallelGateway,
  isInclusiveGateway,
  isComplexGateway,
  isEventBasedGateway,
} from '../transformers/element-transformers';
import {
  isTaskElement,
  isSupportedEventElement,
  isSequenceFlowElement,
  getUnsupportedElementReason,
  detectGatewayMismatches,
} from '../utils/utils';
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
      reason: `Potential deadlock detected in parallel join gateway '${mismatch.parallelJoinName || mismatch.parallelJoinId}' - it expects multiple incoming flows but receives them from exclusive gateway(s) '${exclusiveGatewayNames}' which only executes one path. The parallel join will wait indefinitely for flows that never arrive. ${pathDescription}`,
      severity: 'warning',
    });
  });

  // Check for unsupported gateway types
  if (!renderGateways) {
    const gateways = flowElements.filter(isGatewayElement);
    for (const gateway of gateways) {
      if (
        !isExclusiveGateway(gateway) &&
        !isParallelGateway(gateway) &&
        !isInclusiveGateway(gateway) &&
        !isComplexGateway(gateway) &&
        !isEventBasedGateway(gateway)
      ) {
        issues.push({
          elementId: (gateway as any).id,
          elementType: (gateway as any).$type,
          elementName: (gateway as any).name,
          reason: `Gateway type ${(gateway as any).$type} is not supported. Only exclusive, parallel, inclusive, complex, and event-based gateways are currently supported.`,
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
): {
  timingsMap: Map<string, any[]>;
  dependencies: Array<{ sourceInstanceId: string; targetInstanceId: string; flowId: string }>;
  issues: Array<{
    elementId: string;
    elementType: string;
    elementName?: string;
    reason: string;
    severity: 'warning' | 'error';
  }>;
} {
  return calculatePathBasedTimings(supportedElements, startTime, defaultDurations, loopDepth);
}

/**
 * Filter dependencies to only include visible elements
 *
 * When gateways are hidden (renderGateways=false), this function creates "bypass dependencies"
 * that connect sources directly to targets, skipping the hidden gateway instances.
 *
 * **Algorithm**:
 * 1. Identify all gateway connections (dependencies involving hidden elements)
 * 2. Map gateway inputs (sources that connect TO gateways)
 * 3. Map gateway outputs (targets that connect FROM gateways)
 * 4. Create direct source→target bypass dependencies
 * 5. Return combination of direct dependencies + bypass dependencies
 *
 * **Example**:
 * ```
 * Original: TaskA → Gateway → TaskB
 * Filtered: TaskA → TaskB (bypass dependency)
 * ```
 *
 * This preserves logical flow while hiding implementation details (gateways)
 * from the user interface.
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

    // Second pass: create transitive bypass dependencies for gateway chains
    const bypassDependencies: any[] = [];
    const processedPairs = new Set<string>();

    // Helper function to find all reachable targets from a source through gateway chains
    function findTransitiveTargets(sourceId: string, visited = new Set<string>()): string[] {
      if (visited.has(sourceId)) return []; // Prevent cycles

      const newVisited = new Set(visited);
      newVisited.add(sourceId);

      const directTargets = gatewayTargets.get(sourceId) || [];
      const allTargets: string[] = [];

      directTargets.forEach((targetId) => {
        if (visibleIds.has(targetId)) {
          // Target is visible - add it
          allTargets.push(targetId);
        } else {
          // Target is another hidden gateway - recurse through it
          const transitiveTargets = findTransitiveTargets(targetId, newVisited);
          allTargets.push(...transitiveTargets);
        }
      });

      return allTargets;
    }

    // For each gateway, find all visible sources and connect them to all reachable visible targets
    gatewayBypass.forEach((sources, gatewayId) => {
      sources.forEach((sourceId) => {
        if (visibleIds.has(sourceId)) {
          // Source is visible - find all reachable targets through gateway chains
          const reachableTargets = findTransitiveTargets(gatewayId);

          reachableTargets.forEach((targetId) => {
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

              const bypassDep = {
                id: `${sourceId}_to_${targetId}_bypass`,
                sourceId,
                targetId,
                type: throughGatewayDep?.type || 'FINISH_TO_START',
                name: throughGatewayDep?.name,
                flowType: throughGatewayDep?.flowType,
              };

              bypassDependencies.push(bypassDep);
            }
          });
        }
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
