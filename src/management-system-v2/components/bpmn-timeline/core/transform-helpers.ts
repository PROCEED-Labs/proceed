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
  isInformationalArtifact,
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
    } else if (isInformationalArtifact(element)) {
      // Informational artifacts are handled separately and don't go into supported elements
      // They're not errors - they're just informational and displayed in process info
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
 * Extract informational artifacts from BPMN elements
 */
export function extractInformationalArtifacts(
  allElements: any[],
): import('../types/types').BPMNInformationalArtifact[] {
  const artifacts = allElements.filter((element) => isInformationalArtifact(element));

  // Filter out DataObjects that are referenced by DataObjectReferences
  // We only want to show the reference, not the object itself
  const dataObjectRefs = artifacts
    .filter((a) => a.$type === 'bpmn:DataObjectReference')
    .map((ref) => {
      const refId =
        typeof ref.dataObjectRef === 'string' ? ref.dataObjectRef : ref.dataObjectRef?.id;
      return refId;
    })
    .filter(Boolean);

  const filteredArtifacts = artifacts.filter((artifact) => {
    // Keep DataObject only if it's NOT referenced by any DataObjectReference
    if (artifact.$type === 'bpmn:DataObject') {
      return !dataObjectRefs.includes(artifact.id);
    }
    return true;
  });

  return filteredArtifacts;
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

    // Helper function to extract base element ID from instance ID
    function getBaseElementId(id: string): string {
      // Instance IDs have format: "ElementId_instance_N"
      // Base IDs are just: "ElementId"
      return id.split('_instance_')[0];
    }

    // Helper function to check if an element is visible
    function isElementVisible(id: string): boolean {
      const baseId = getBaseElementId(id);
      return visibleIds.has(baseId) || visibleIds.has(id);
    }

    // Build a map of gateway bypass connections
    const gatewayBypass = new Map<string, string[]>(); // gateway instance ID -> source instance IDs that lead to it
    const gatewayTargets = new Map<string, string[]>(); // gateway instance ID -> target instance IDs it leads to

    // First pass: identify gateway connections
    ganttDependencies.forEach((dep) => {
      // If target is a gateway (not visible), track the source
      if (!isElementVisible(dep.targetId)) {
        if (!gatewayBypass.has(dep.targetId)) {
          gatewayBypass.set(dep.targetId, []);
        }
        gatewayBypass.get(dep.targetId)!.push(dep.sourceId);
      }

      // If source is a gateway (not visible), track the target
      if (!isElementVisible(dep.sourceId)) {
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
        if (isElementVisible(targetId)) {
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
        if (isElementVisible(sourceId)) {
          // Source is visible - find all reachable targets through gateway chains
          const reachableTargets = findTransitiveTargets(gatewayId);

          reachableTargets.forEach((targetId) => {
            const pairKey = `${sourceId}->${targetId}`;

            // Check if this would be a self-loop (same element)
            if (sourceId === targetId) {
              // For self-loops, check if target element has ghost occurrences
              const targetElement = ganttElements.find((el) => el.id === targetId);
              if (
                targetElement &&
                targetElement.ghostOccurrences &&
                targetElement.ghostOccurrences.length > 0
              ) {
                return; // Skip creating self-loop bypass - this should be a ghost dependency
              }
            }

            if (!processedPairs.has(pairKey)) {
              processedPairs.add(pairKey);

              // Find the original flow through the gateway for metadata
              const throughGatewayDep =
                ganttDependencies.find(
                  (d) => d.sourceId === sourceId && !isElementVisible(d.targetId),
                ) ||
                ganttDependencies.find(
                  (d) => d.targetId === targetId && !isElementVisible(d.sourceId),
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
    // BUT preserve ghost dependencies even if they involve gateways
    const directDependencies = ganttDependencies.filter((dep) => {
      const bothVisible = isElementVisible(dep.sourceId) && isElementVisible(dep.targetId);
      const isGhost = dep.isGhost;
      return bothVisible || isGhost; // Keep if both visible OR if it's a ghost dependency
    });

    return [...directDependencies, ...bypassDependencies];
  }

  return ganttDependencies;
}

/**
 * Detect ghost dependencies that would go through gateways (unsupported)
 */
export function detectGhostDependenciesThroughGateways(
  ganttElements: any[],
  pathDependencies: Array<{ sourceInstanceId: string; targetInstanceId: string; flowId: string }>,
  supportedElements: BPMNFlowElement[],
): TransformationIssue[] {
  const issues: TransformationIssue[] = [];
  const elementsWithGhosts = ganttElements.filter(
    (el) => el.ghostOccurrences && el.ghostOccurrences.length > 0,
  );

  if (elementsWithGhosts.length === 0) {
    return issues; // No ghost elements, no need to check
  }

  // Check if any paths between ghost occurrences go through gateways
  const affectedElements = new Set<string>();

  // For each element with ghosts, check if any path between instances goes through a gateway
  elementsWithGhosts.forEach((element) => {
    const elementId = element.id;
    let hasGatewayPath = false;

    // Check all dependencies to see if there's a path through a gateway
    for (let i = 0; i < pathDependencies.length; i++) {
      const dep1 = pathDependencies[i];

      // Skip if not related to our element
      const dep1SourceId = dep1.sourceInstanceId.split('_instance_')[0];
      const dep1TargetId = dep1.targetInstanceId.split('_instance_')[0];

      if (dep1SourceId !== elementId && dep1TargetId !== elementId) {
        continue;
      }

      // Look for a connecting dependency through a gateway
      for (let j = 0; j < pathDependencies.length; j++) {
        const dep2 = pathDependencies[j];

        // Check if dep1.target connects to dep2.source (potential gateway in between)
        if (dep1.targetInstanceId === dep2.sourceInstanceId) {
          const intermediateId = dep1.targetInstanceId.split('_instance_')[0];
          const finalTargetId = dep2.targetInstanceId.split('_instance_')[0];

          // Check if the intermediate element is a gateway
          const intermediateElement = supportedElements.find((el) => el.id === intermediateId);

          if (intermediateElement && isGatewayElement(intermediateElement)) {
            // Check if this creates a path between main and ghost instances
            if (dep1SourceId === elementId && finalTargetId === elementId) {
              // This is a self-loop through a gateway
              const dep1IsFromMain = !element.ghostOccurrences.some(
                (ghost: any) => ghost.instanceId === dep1.sourceInstanceId,
              );
              const dep2IsToGhost = element.ghostOccurrences.some(
                (ghost: any) => ghost.instanceId === dep2.targetInstanceId,
              );

              if ((dep1IsFromMain && dep2IsToGhost) || (!dep1IsFromMain && !dep2IsToGhost)) {
                hasGatewayPath = true;
                break;
              }
            }
          }
        }
      }

      if (hasGatewayPath) break;
    }

    if (hasGatewayPath) {
      affectedElements.add(elementId);
    }
  });

  // Create warnings for affected elements
  affectedElements.forEach((elementId) => {
    const element = supportedElements.find((el) => el.id === elementId);
    issues.push({
      elementId: elementId,
      elementType: element?.$type || 'unknown',
      elementName: element?.name,
      reason:
        'Ghost dependencies through gateways are not supported. Enable "Show Gateways" or disable ghost dependencies for this element.',
      severity: 'warning' as const,
    });
  });

  return issues;
}
