/**
 * Mode-specific transformation handlers for BPMN timeline
 */

import type { GanttElementType, GanttDependency } from '@/components/gantt-chart-canvas/types';
import { DependencyType } from '@/components/gantt-chart-canvas/types';
import type {
  BPMNFlowElement,
  BPMNTask,
  BPMNEvent,
  BPMNGateway,
  BPMNSequenceFlow,
} from '../types/types';
import {
  transformTask,
  transformEvent,
  transformGateway,
  getFlowType,
  isGatewayElement,
} from './element-transformers';
import {
  isTaskElement,
  isSupportedEventElement,
  assignFlowColors,
  findConnectedComponents,
} from '../utils/utils';

export interface ModeHandlerResult {
  ganttElements: GanttElementType[];
  ganttDependencies: GanttDependency[];
  elementToComponent: Map<string, number>;
}

/**
 * Handle "every-occurrence" mode transformation
 * Creates a separate gantt element for each instance of BPMN elements that appear multiple times
 *
 * @param pathTimings - Map of element ID to timing instances from path traversal
 * @param pathDependencies - Array of dependencies between element instances
 * @param supportedElements - All supported BPMN elements
 * @param renderGateways - Whether to render gateway elements in the timeline
 * @returns Gantt elements, dependencies, and component mapping for rendering
 */
export function handleEveryOccurrenceMode(
  pathTimings: Map<string, any[]>,
  pathDependencies: Array<{ sourceInstanceId: string; targetInstanceId: string; flowId: string }>,
  supportedElements: BPMNFlowElement[],
  renderGateways: boolean,
): ModeHandlerResult {
  const ganttElements: GanttElementType[] = [];
  const ganttDependencies: GanttDependency[] = [];

  // Assign colors based on connected components
  const elementColors = assignFlowColors(supportedElements);
  const originalElementToComponent = findConnectedComponents(supportedElements);

  // Create map to track instance to component mapping
  const instanceToComponent = new Map<string, number>();

  // Create a flat list of all elements in execution order
  const allTimings: Array<{
    elementId: string;
    timing: any;
    element: BPMNFlowElement;
    color: string;
  }> = [];

  pathTimings.forEach((timingInstances, elementId) => {
    const element = supportedElements.find((el) => el.id === elementId);
    if (!element || element.$type === 'bpmn:SequenceFlow') return;

    const elementColor = elementColors.get(elementId);

    timingInstances.forEach((timing) => {
      allTimings.push({ elementId, timing, element, color: elementColor || '#666' });
    });
  });

  // Sort by start time to get execution order
  allTimings.sort((a, b) => a.timing.startTime - b.timing.startTime);

  // Transform elements in execution order and assign sequential component numbers
  allTimings.forEach((item, executionOrder) => {
    const { elementId, timing, element, color } = item;

    // Count instances per element for numbering
    const elementInstanceCount = new Map<string, number>();
    for (let i = 0; i <= executionOrder; i++) {
      const prevElementId = allTimings[i].elementId;
      elementInstanceCount.set(prevElementId, (elementInstanceCount.get(prevElementId) || 0) + 1);
    }

    const instanceNumber = elementInstanceCount.get(elementId)!;
    const totalInstances = pathTimings.get(elementId)!.length;

    const ganttElement = createGanttElement(element, timing, color, renderGateways);
    if (ganttElement) {
      ganttElement.id = timing.instanceId || ganttElement.id;
      ganttElement.name = ganttElement.name || element.id;
      ganttElement.instanceNumber = instanceNumber;
      ganttElement.totalInstances = totalInstances;
      ganttElement.isPathCutoff = timing.isPathCutoff;
      ganttElement.isLoop = timing.isLoop;
      ganttElement.isLoopCut = timing.isLoopCut;
      ganttElements.push(ganttElement);

      // Map instance to its original element's component
      const originalComponent = originalElementToComponent.get(elementId) || 0;
      instanceToComponent.set(ganttElement.id, originalComponent);
    }
  });

  // Create dependencies from path traversal results
  pathDependencies.forEach((dep, index) => {
    const flow = supportedElements.find((el) => el.id === dep.flowId) as BPMNSequenceFlow;
    if (flow) {
      const dependencyId = `${dep.flowId}_${index}`;

      ganttDependencies.push({
        id: dependencyId,
        sourceId: dep.sourceInstanceId,
        targetId: dep.targetInstanceId,
        type: DependencyType.FINISH_TO_START,
        name: flow.name,
        flowType: getFlowType(flow),
      });
    }
  });

  return {
    ganttElements,
    ganttDependencies,
    elementToComponent: instanceToComponent,
  };
}

/**
 * Handle "latest-occurrence" mode transformation
 */
export function handleLatestOccurrenceMode(
  pathTimings: Map<string, any[]>,
  pathDependencies: Array<{ sourceInstanceId: string; targetInstanceId: string; flowId: string }>,
  supportedElements: BPMNFlowElement[],
  renderGateways: boolean,
  showGhostElements: boolean,
  showGhostDependencies: boolean,
): ModeHandlerResult {
  const ganttElements: GanttElementType[] = [];
  const ganttDependencies: GanttDependency[] = [];

  // Assign colors based on connected components
  const elementColors = assignFlowColors(supportedElements);
  const originalElementToComponent = findConnectedComponents(supportedElements);

  // Create a map to find the latest instance of each element
  const elementToLatestTiming = new Map<string, any>();

  // Find the latest occurrence of each element
  pathTimings.forEach((timingInstances, elementId) => {
    if (timingInstances.length > 0) {
      const latestTiming = timingInstances.reduce((latest, current) =>
        current.startTime > latest.startTime ? current : latest,
      );
      elementToLatestTiming.set(elementId, latestTiming);
    }
  });

  // Create dependency map for latest instances
  const latestInstanceIdMap = new Map<string, string>();
  elementToLatestTiming.forEach((timing, elementId) => {
    latestInstanceIdMap.set(elementId, timing.instanceId);
  });

  // Handle elements with only one instance
  pathTimings.forEach((timingInstances, elementId) => {
    if (!latestInstanceIdMap.has(elementId) && timingInstances.length > 0) {
      latestInstanceIdMap.set(elementId, timingInstances[0].instanceId!);
    }
  });

  // Transform dependencies to use latest instances
  const latestDependencies = createLatestDependencies(pathDependencies, latestInstanceIdMap);

  // Transform elements using only the latest occurrences
  const instanceToComponent = new Map<string, number>();

  pathTimings.forEach((timingInstances, elementId) => {
    const timing = elementToLatestTiming.get(elementId) || timingInstances[0];
    const element = supportedElements.find((el) => el.id === elementId);
    if (!element || element.$type === 'bpmn:SequenceFlow') return;

    const elementColor = elementColors.get(elementId);
    const ganttElement = createGanttElement(element, timing, elementColor, renderGateways);

    if (ganttElement) {
      ganttElement.id = elementId; // Use original element ID, not instance ID
      ganttElement.name = ganttElement.name || element.id;
      ganttElement.instanceNumber = undefined;
      ganttElement.totalInstances = undefined;
      ganttElement.isPathCutoff = timing.isPathCutoff;
      // In latest mode, prioritize showing termination over loop containment
      ganttElement.isLoop = timing.isLoopCut ? false : timing.isLoop;
      ganttElement.isLoopCut = timing.isLoopCut;

      // Add ghost occurrences if enabled and there are multiple occurrences
      if (showGhostElements && timingInstances.length > 1) {
        ganttElement.ghostOccurrences = timingInstances
          .filter((t) => t.instanceId !== timing.instanceId)
          .map((t) => ({
            start: t.startTime,
            end: t.endTime,
            instanceId: t.instanceId,
          }));
      }

      ganttElements.push(ganttElement);

      const originalComponent = originalElementToComponent.get(elementId) || 0;
      instanceToComponent.set(ganttElement.id, originalComponent);
    }
  });

  // Create dependencies from the filtered latest dependencies
  // Don't deduplicate here - let all latest dependencies become regular dependencies
  // The visual deduplication will be handled by the ghost dependency replacement logic
  latestDependencies.forEach((dep, index) => {
    const flow = supportedElements.find((el) => el.id === dep.flowId) as BPMNSequenceFlow;
    if (flow) {
      const sourceOriginalId = dep.sourceInstanceId!.split('_instance_')[0];
      const targetOriginalId = dep.targetInstanceId!.split('_instance_')[0];

      const regularDep = {
        id: `${dep.flowId}_latest_${index}`,
        sourceId: sourceOriginalId,
        targetId: targetOriginalId,
        type: DependencyType.FINISH_TO_START,
        name: flow.name,
        flowType: getFlowType(flow),
      };
      ganttDependencies.push(regularDep);
    }
  });

  // Add ghost dependencies if enabled
  if (showGhostDependencies && showGhostElements) {
    // Note: Ghost dependencies through gateways are not supported
    // This would require complex multi-gateway chain traversal logic

    pathDependencies.forEach((dep, index) => {
      const flow = supportedElements.find((el) => el.id === dep.flowId) as BPMNSequenceFlow;
      if (flow) {
        const sourceOriginalId = dep.sourceInstanceId.split('_instance_')[0];
        const targetOriginalId = dep.targetInstanceId.split('_instance_')[0];

        // Only create ghost dependency if at least one endpoint is a ghost occurrence
        const sourceElement = ganttElements.find((el) => el.id === sourceOriginalId);
        const targetElement = ganttElements.find((el) => el.id === targetOriginalId);

        const sourceIsGhost = sourceElement?.ghostOccurrences?.some(
          (ghost) => ghost.instanceId === dep.sourceInstanceId,
        );
        const targetIsGhost = targetElement?.ghostOccurrences?.some(
          (ghost) => ghost.instanceId === dep.targetInstanceId,
        );

        if (sourceIsGhost || targetIsGhost) {
          // Check if there's already a regular dependency for this flow that we should replace
          const regularDepIndex = ganttDependencies.findIndex(
            (d) =>
              d.sourceId === sourceOriginalId &&
              d.targetId === targetOriginalId &&
              d.flowType === getFlowType(flow) &&
              !d.isGhost,
          );

          const ghostDep = {
            id: `${dep.flowId}_ghost_${index}`,
            sourceId: sourceOriginalId,
            targetId: targetOriginalId,
            type: DependencyType.FINISH_TO_START,
            name: flow.name,
            flowType: getFlowType(flow),
            isGhost: true,
            sourceInstanceId: dep.sourceInstanceId,
            targetInstanceId: dep.targetInstanceId,
          };

          if (regularDepIndex >= 0) {
            // Replace the regular dependency with the ghost dependency
            ganttDependencies[regularDepIndex] = ghostDep;
          } else {
            // No regular dependency found, just add the ghost dependency
            ganttDependencies.push(ghostDep);
          }
        }
      }
    });
  }

  return {
    ganttElements,
    ganttDependencies,
    elementToComponent: instanceToComponent,
  };
}

/**
 * Handle "earliest-occurrence" mode transformation
 */
export function handleEarliestOccurrenceMode(
  pathTimings: Map<string, any[]>,
  pathDependencies: Array<{ sourceInstanceId: string; targetInstanceId: string; flowId: string }>,
  supportedElements: BPMNFlowElement[],
  renderGateways: boolean,
  showGhostElements: boolean,
  showGhostDependencies: boolean,
): ModeHandlerResult {
  const ganttElements: GanttElementType[] = [];
  const ganttDependencies: GanttDependency[] = [];

  // Assign colors based on connected components
  const elementColors = assignFlowColors(supportedElements);
  const originalElementToComponent = findConnectedComponents(supportedElements);

  // Create a map to find the earliest instance of each element
  const elementToEarliestTiming = new Map<string, any>();

  // Find the earliest occurrence of each element
  pathTimings.forEach((timingInstances, elementId) => {
    if (timingInstances.length > 0) {
      const earliestTiming = timingInstances.reduce((earliest, current) =>
        current.startTime < earliest.startTime ? current : earliest,
      );
      elementToEarliestTiming.set(elementId, earliestTiming);
    }
  });

  // Create dependency map for earliest instances
  const earliestInstanceIdMap = new Map<string, string>();
  elementToEarliestTiming.forEach((timing, elementId) => {
    earliestInstanceIdMap.set(elementId, timing.instanceId);
  });

  const earliestDependencies = createEarliestDependencies(pathDependencies, showGhostDependencies);

  // Transform elements using only the earliest occurrences
  const instanceToComponent = new Map<string, number>();

  pathTimings.forEach((timingInstances, elementId) => {
    const timing = elementToEarliestTiming.get(elementId) || timingInstances[0];
    const element = supportedElements.find((el) => el.id === elementId);
    if (!element || element.$type === 'bpmn:SequenceFlow') return;

    const elementColor = elementColors.get(elementId);
    const ganttElement = createGanttElement(element, timing, elementColor, renderGateways);

    if (ganttElement) {
      ganttElement.id = elementId; // Use original element ID, not instance ID
      ganttElement.name = ganttElement.name || element.id;
      ganttElement.instanceNumber = undefined;
      ganttElement.totalInstances = undefined;
      ganttElement.isPathCutoff = timing.isPathCutoff;
      ganttElement.isLoop = timing.isLoop;
      ganttElement.isLoopCut = timing.isLoopCut;

      // Add ghost occurrences if enabled and there are multiple occurrences
      if (showGhostElements && timingInstances.length > 1) {
        ganttElement.ghostOccurrences = timingInstances
          .filter((t) => t.instanceId !== timing.instanceId)
          .map((t) => ({
            start: t.startTime,
            end: t.endTime,
            instanceId: t.instanceId,
          }));
      }

      ganttElements.push(ganttElement);

      const originalComponent = originalElementToComponent.get(elementId) || 0;
      instanceToComponent.set(ganttElement.id, originalComponent);
    }
  });

  // Create dependencies from ALL unique flows, pointing to earliest instances
  earliestDependencies.forEach((dep, index) => {
    const flow = supportedElements.find((el) => el.id === dep.flowId) as BPMNSequenceFlow;
    if (flow) {
      ganttDependencies.push({
        id: `${dep.flowId}_earliest_${index}`,
        sourceId: dep.sourceOriginalId,
        targetId: dep.targetOriginalId,
        type: DependencyType.FINISH_TO_START,
        name: flow.name,
        flowType: getFlowType(flow),
      });
    }
  });

  // Add ghost dependencies if enabled
  if (showGhostDependencies && showGhostElements) {
    // Note: Ghost dependencies through gateways are not supported
    // This would require complex multi-gateway chain traversal logic

    pathDependencies.forEach((dep, index) => {
      const flow = supportedElements.find((el) => el.id === dep.flowId) as BPMNSequenceFlow;
      if (flow) {
        const sourceOriginalId = dep.sourceInstanceId.split('_instance_')[0];
        const targetOriginalId = dep.targetInstanceId.split('_instance_')[0];

        // Only create ghost dependency if at least one endpoint is a ghost occurrence
        const sourceElement = ganttElements.find((el) => el.id === sourceOriginalId);
        const targetElement = ganttElements.find((el) => el.id === targetOriginalId);

        const sourceIsGhost = sourceElement?.ghostOccurrences?.some(
          (ghost) => ghost.instanceId === dep.sourceInstanceId,
        );
        const targetIsGhost = targetElement?.ghostOccurrences?.some(
          (ghost) => ghost.instanceId === dep.targetInstanceId,
        );

        if (sourceIsGhost || targetIsGhost) {
          // Special case: if this is a self-loop pattern (same base element) with ghost occurrences,
          // create a direct main-to-ghost dependency instead of gateway dependencies
          if (sourceOriginalId === targetOriginalId && targetIsGhost && !sourceIsGhost) {
            // Create direct main-to-ghost dependency
            const mainToGhostDep = {
              id: `${dep.flowId}_main_to_ghost_${index}`,
              sourceId: sourceOriginalId,
              targetId: targetOriginalId,
              type: DependencyType.FINISH_TO_START,
              name: flow.name,
              flowType: getFlowType(flow),
              isGhost: true,
              sourceInstanceId: dep.sourceInstanceId, // This should be the main instance
              targetInstanceId: dep.targetInstanceId, // This is the ghost instance
            };

            ganttDependencies.push(mainToGhostDep);
          } else {
            // Regular ghost dependency logic
            // Check if there's already a regular dependency for this flow that we should replace
            const regularDepIndex = ganttDependencies.findIndex(
              (d) =>
                d.sourceId === sourceOriginalId &&
                d.targetId === targetOriginalId &&
                d.flowType === getFlowType(flow) &&
                !d.isGhost,
            );

            const ghostDep = {
              id: `${dep.flowId}_ghost_${index}`,
              sourceId: sourceOriginalId,
              targetId: targetOriginalId,
              type: DependencyType.FINISH_TO_START,
              name: flow.name,
              flowType: getFlowType(flow),
              isGhost: true,
              sourceInstanceId: dep.sourceInstanceId,
              targetInstanceId: dep.targetInstanceId,
            };

            if (regularDepIndex >= 0) {
              // Replace the regular dependency with the ghost dependency
              ganttDependencies[regularDepIndex] = ghostDep;
            } else {
              // No regular dependency found, just add the ghost dependency
              ganttDependencies.push(ghostDep);
            }
          }
        }
      }
    });
  }

  return {
    ganttElements,
    ganttDependencies,
    elementToComponent: instanceToComponent,
  };
}

/**
 * Create a gantt element based on the BPMN element type
 */
function createGanttElement(
  element: BPMNFlowElement,
  timing: any,
  color: string | undefined,
  renderGateways: boolean,
): GanttElementType | null {
  if (isTaskElement(element)) {
    return transformTask(element as BPMNTask, timing.startTime, timing.duration, color);
  } else if (isSupportedEventElement(element)) {
    return transformEvent(element as BPMNEvent, timing.startTime, timing.duration, color);
  } else if (isGatewayElement(element) && renderGateways) {
    return transformGateway(element as BPMNGateway, timing.startTime, timing.duration, color, true);
  }
  return null;
}

/**
 * Create latest dependencies with deduplication
 */
function createLatestDependencies(
  pathDependencies: Array<{ sourceInstanceId: string; targetInstanceId: string; flowId: string }>,
  latestInstanceIdMap: Map<string, string>,
) {
  const mapped = pathDependencies.map((dep) => {
    const sourceOriginalId = dep.sourceInstanceId.split('_instance_')[0];
    const targetOriginalId = dep.targetInstanceId.split('_instance_')[0];

    const latestSourceInstanceId = latestInstanceIdMap.get(sourceOriginalId);
    const latestTargetInstanceId = latestInstanceIdMap.get(targetOriginalId);

    return {
      sourceInstanceId: latestSourceInstanceId,
      targetInstanceId: latestTargetInstanceId,
      flowId: dep.flowId,
    };
  });

  return mapped;
}

/**
 * Create earliest dependencies with deduplication
 */
function createEarliestDependencies(
  pathDependencies: Array<{ sourceInstanceId: string; targetInstanceId: string; flowId: string }>,
  showGhostDependencies: boolean,
) {
  const mappedDependencies = pathDependencies.map((dep) => {
    const sourceOriginalId = dep.sourceInstanceId.split('_instance_')[0];
    const targetOriginalId = dep.targetInstanceId.split('_instance_')[0];

    return {
      sourceOriginalId,
      targetOriginalId,
      flowId: dep.flowId,
    };
  });

  // Only deduplicate when ghost dependencies are disabled
  // When ghost dependencies are enabled, we need all path dependencies to be available
  // for the ghost dependency replacement logic
  if (showGhostDependencies) {
    return mappedDependencies;
  }

  // Deduplicate when ghost dependencies are disabled
  return mappedDependencies.filter((dep, index, arr) => {
    const key = `${dep.sourceOriginalId}->${dep.targetOriginalId}-${dep.flowId}`;
    const firstIndex = arr.findIndex(
      (d) => `${d.sourceOriginalId}->${d.targetOriginalId}-${d.flowId}` === key,
    );
    return firstIndex === index;
  });
}
