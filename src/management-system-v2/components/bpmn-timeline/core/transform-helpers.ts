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
      const instanceParts = id.split('_instance_');
      return instanceParts.length > 0 ? instanceParts[0] : id;
    }

    // Helper function to check if an element is visible
    function isElementVisible(id: string): boolean {
      const baseId = getBaseElementId(id);
      // Check if it's a gateway - gateways are NOT visible when renderGateways=false
      if (baseId.includes('Gateway') || id.includes('Gateway')) {
        return false;
      }
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
 *
 * When gateways are hidden (renderGateways=false) and ghost dependencies exist,
 * they become unsupported because the bypass dependencies skip gateway logic.
 */
export function detectGhostDependenciesThroughGateways(
  ganttElements: any[],
  pathDependencies: Array<{ sourceInstanceId: string; targetInstanceId: string; flowId: string }>,
  supportedElements: BPMNFlowElement[],
  renderGateways: boolean = true,
): TransformationIssue[] {
  const issues: TransformationIssue[] = [];
  const elementsWithGhosts = ganttElements.filter(
    (el) => el.ghostOccurrences && el.ghostOccurrences.length > 0,
  );

  if (elementsWithGhosts.length === 0) {
    return issues; // No ghost elements, no need to check
  }

  // Check if there are gateways in the process
  const hasGateways = supportedElements.some((el) => isGatewayElement(el));

  if (!hasGateways) {
    return issues; // No gateways, no potential for gateway-related ghost dependency issues
  }

  // If gateways are hidden and there are ghost elements, this is problematic
  if (!renderGateways) {
    // When gateways are hidden, identify which gateways cause ghost dependency issues
    // and warn only about those gateways, not the elements with ghosts
    const affectedGateways = new Set<string>();
    const gatewayConnections = new Map<
      string,
      { previousElements: Set<string>; nextElements: Set<string> }
    >();

    // Find which gateways would be involved in ghost dependencies
    elementsWithGhosts.forEach((element) => {
      const elementId = element.id;

      // Check path dependencies to find gateways this element connects through
      pathDependencies.forEach((dep) => {
        const dep1SourceParts = dep.sourceInstanceId.split('_instance_');
        const dep1TargetParts = dep.targetInstanceId.split('_instance_');
        const dep1SourceId = dep1SourceParts.length > 0 ? dep1SourceParts[0] : dep.sourceInstanceId;
        const dep1TargetId = dep1TargetParts.length > 0 ? dep1TargetParts[0] : dep.targetInstanceId;

        // If this dependency involves our element and passes through a gateway
        if (dep1SourceId === elementId || dep1TargetId === elementId) {
          // Check if any element in the dependency chain is a gateway
          const sourceElement = supportedElements.find((el) => el.id === dep1SourceId);
          const targetElement = supportedElements.find((el) => el.id === dep1TargetId);

          if (sourceElement && isGatewayElement(sourceElement)) {
            affectedGateways.add(dep1SourceId);
            if (!gatewayConnections.has(dep1SourceId)) {
              gatewayConnections.set(dep1SourceId, {
                previousElements: new Set(),
                nextElements: new Set(),
              });
            }
            gatewayConnections.get(dep1SourceId)!.nextElements.add(dep1TargetId);
          }

          if (targetElement && isGatewayElement(targetElement)) {
            affectedGateways.add(dep1TargetId);
            if (!gatewayConnections.has(dep1TargetId)) {
              gatewayConnections.set(dep1TargetId, {
                previousElements: new Set(),
                nextElements: new Set(),
              });
            }
            gatewayConnections.get(dep1TargetId)!.previousElements.add(dep1SourceId);
          }
        }
      });
    });

    // Create warnings only for the affected gateways
    affectedGateways.forEach((gatewayId) => {
      const gateway = supportedElements.find((el) => el.id === gatewayId);
      const connections = gatewayConnections.get(gatewayId);

      let reason = `Ghost dependencies through gateway "${gateway?.name || gatewayId}" are not supported when gateways are hidden. Enable "Show Gateways" or disable ghost dependencies.`;

      if (connections) {
        const prevElementNames = Array.from(connections.previousElements)
          .map((id) => supportedElements.find((el) => el.id === id)?.name || id)
          .filter((name) => name !== gatewayId) // Don't include self-references
          .join(', ');
        const nextElementNames = Array.from(connections.nextElements)
          .map((id) => supportedElements.find((el) => el.id === id)?.name || id)
          .filter((name) => name !== gatewayId) // Don't include self-references
          .join(', ');

        if (prevElementNames || nextElementNames) {
          const fromPart = prevElementNames ? `from: ${prevElementNames}` : '';
          const toPart = nextElementNames ? `to: ${nextElementNames}` : '';
          const connectionPart = [fromPart, toPart].filter(Boolean).join(' → ');

          if (connectionPart) {
            reason = `Ghost dependencies through gateway "${gateway?.name || gatewayId}" (${connectionPart}) are not supported when gateways are hidden. Enable "Show Gateways" or disable ghost dependencies.`;
          }
        }
      }

      issues.push({
        elementId: gatewayId,
        elementType: gateway?.$type || 'unknown',
        elementName: gateway?.name,
        reason,
        severity: 'warning' as const,
      });
    });

    return issues;
  }

  // If gateways are visible, check if any paths between ghost occurrences go through gateways
  const affectedGateways = new Map<
    string,
    { previousElements: Set<string>; nextElements: Set<string> }
  >();

  elementsWithGhosts.forEach((element) => {
    const elementId = element.id;

    // Check all dependencies to see if there's a path through a gateway
    for (let i = 0; i < pathDependencies.length; i++) {
      const dep1 = pathDependencies[i];

      // Skip if not related to our element
      const dep1SourceParts = dep1.sourceInstanceId.split('_instance_');
      const dep1TargetParts = dep1.targetInstanceId.split('_instance_');
      const dep1SourceId = dep1SourceParts.length > 0 ? dep1SourceParts[0] : dep1.sourceInstanceId;
      const dep1TargetId = dep1TargetParts.length > 0 ? dep1TargetParts[0] : dep1.targetInstanceId;

      if (dep1SourceId !== elementId && dep1TargetId !== elementId) {
        continue;
      }

      // Look for a connecting dependency through a gateway
      for (let j = 0; j < pathDependencies.length; j++) {
        const dep2 = pathDependencies[j];

        // Check if dep1.target connects to dep2.source (potential gateway in between)
        if (dep1.targetInstanceId === dep2.sourceInstanceId) {
          const intermediateParts = dep1.targetInstanceId.split('_instance_');
          const finalTargetParts = dep2.targetInstanceId.split('_instance_');
          const intermediateId =
            intermediateParts.length > 0 ? intermediateParts[0] : dep1.targetInstanceId;
          const finalTargetId =
            finalTargetParts.length > 0 ? finalTargetParts[0] : dep2.targetInstanceId;

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
                // Track this gateway and its connected elements
                if (!affectedGateways.has(intermediateId)) {
                  affectedGateways.set(intermediateId, {
                    previousElements: new Set(),
                    nextElements: new Set(),
                  });
                }
                const gatewayInfo = affectedGateways.get(intermediateId)!;
                gatewayInfo.previousElements.add(dep1SourceId);
                gatewayInfo.nextElements.add(finalTargetId);
              }
            }
          }
        }
      }
    }
  });

  // Create warnings for affected gateways
  affectedGateways.forEach((info, gatewayId) => {
    const gateway = supportedElements.find((el) => el.id === gatewayId);
    const prevElementNames = Array.from(info.previousElements)
      .map((id) => supportedElements.find((el) => el.id === id)?.name || id)
      .join(', ');
    const nextElementNames = Array.from(info.nextElements)
      .map((id) => supportedElements.find((el) => el.id === id)?.name || id)
      .join(', ');

    issues.push({
      elementId: gatewayId,
      elementType: gateway?.$type || 'unknown',
      elementName: gateway?.name,
      reason: `Ghost dependencies through gateway "${gateway?.name || gatewayId}" (from: ${prevElementNames} → to: ${nextElementNames}) are not supported. Enable "Show Gateways" or disable ghost dependencies.`,
      severity: 'warning' as const,
    });
  });

  return issues;
}
