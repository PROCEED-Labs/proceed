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
  DefaultDurationInfo,
} from '../types/types';
import {
  transformTask,
  transformEvent,
  transformGateway,
  transformBoundaryEvent,
  transformExpandedSubProcess,
  getFlowType,
  isGatewayElement,
  createBoundaryEventDependency,
} from './element-transformers';
import {
  isTaskElement,
  isSupportedEventElement,
  isBoundaryEventElement,
  isExpandedSubProcess,
  assignFlowColors,
  findConnectedComponents,
  extractDuration,
  flattenExpandedSubProcesses,
} from '../utils/utils';
import { buildSynchronizationRequirements } from '../core/synchronization';
import { applyLoopStatus } from '../utils/loop-helpers';
import { DEFAULT_TASK_DURATION_MS } from '../constants';
import { addBoundaryEventDependencies } from '../utils/boundary-dependencies';
import { processElementTimings, type ElementProcessingOptions } from '../utils/element-processing';
import {
  selectSubProcessTimings,
  selectSubProcessChildren,
  buildSubProcessHierarchy,
  createStandardDependencies,
  createEveryOccurrenceDependencies,
  processGhostDependencies,
  findSubProcessInstances,
  findChildElements,
  updateInstanceNumbering,
  type SubProcessSelectionOptions,
} from '../utils/iterator-patterns';
import { parseInstanceId, getBaseElementId } from '../utils/id-helpers';
import {
  extractOriginalElementIds,
  extractSourceId,
  extractTargetId,
} from '../utils/reference-extractor';
import { createElementMaps, extractBaseElementId } from '../utils/element-maps';
import { initializeModeHandler } from '../utils/mode-initialization';

export interface ModeHandlerResult {
  ganttElements: GanttElementType[];
  ganttDependencies: GanttDependency[];
  elementToComponent: Map<string, number>;
}

/**
 * Create a standard Gantt dependency object
 */
function createGanttDependency(
  flowId: string,
  sourceId: string,
  targetId: string,
  flow: BPMNSequenceFlow,
  mode: string,
  index: number,
  isGhost = false,
  sourceInstanceId?: string,
  targetInstanceId?: string,
): GanttDependency {
  const dependency: GanttDependency = {
    id: `${flowId}_${mode}_${index}`,
    sourceId,
    targetId,
    type: DependencyType.FINISH_TO_START,
    name: flow.name,
    flowType: getFlowType(flow),
  };

  if (isGhost) {
    dependency.isGhost = true;
    if (sourceInstanceId) dependency.sourceInstanceId = sourceInstanceId;
    if (targetInstanceId) dependency.targetInstanceId = targetInstanceId;
  }

  return dependency;
}

/**
 * Calculate boundary event timing based on their attached tasks
 */
function calculateBoundaryEventTiming(
  boundaryEvent: BPMNEvent,
  attachedTaskTiming: any,
  supportedElements: BPMNFlowElement[],
  defaultDurations: any[],
  elementMap?: Map<string, BPMNFlowElement>, // Optional pre-built map for performance
): { startTime: number; duration: number } {
  // Use provided map or create one if not available
  const elementLookup = elementMap || new Map(supportedElements.map((el) => [el.id, el]));
  const attachedTaskId = extractSourceId(boundaryEvent.attachedToRef);
  const attachedTask = attachedTaskId ? elementLookup.get(attachedTaskId) : undefined;

  if (!attachedTask || !attachedTaskTiming) {
    // Fallback: place at the start of the process
    return { startTime: attachedTaskTiming?.startTime || 0, duration: 0 };
  }

  // Get boundary event duration
  const boundaryEventDuration = extractDuration(boundaryEvent);

  let startTime: number;
  let taskDuration: number;

  // Special handling for sub-processes: ensure proper duration calculation
  if (isExpandedSubProcess(attachedTask)) {
    // For expanded sub-processes, use the calculated duration from timing
    // The timing should already have the correct duration calculated from child elements
    if (attachedTaskTiming.duration !== undefined) {
      taskDuration = attachedTaskTiming.duration;
    } else if (attachedTaskTiming.endTime && attachedTaskTiming.startTime) {
      taskDuration = attachedTaskTiming.endTime - attachedTaskTiming.startTime;
    } else {
      // Fallback to a minimal duration if sub-process timing is not properly calculated
      taskDuration = DEFAULT_TASK_DURATION_MS;
    }
  } else {
    // For regular tasks, calculate duration normally
    taskDuration = attachedTaskTiming.endTime - attachedTaskTiming.startTime;
  }

  if (boundaryEventDuration > 0) {
    // If boundary event has duration, position at task start + event duration
    startTime = attachedTaskTiming.startTime + boundaryEventDuration;
  } else {
    // If no duration, position at the horizontal center of the task
    startTime = attachedTaskTiming.startTime + taskDuration / 2;
  }

  return { startTime, duration: boundaryEventDuration };
}

/**
 * Handle "every-occurrence" mode transformation
 * Creates a separate gantt element for each instance of BPMN elements that appear multiple times
 *
 * @param pathTimings - Map of element ID to timing instances from path traversal
 * @param pathDependencies - Array of dependencies between element instances
 * @param supportedElements - All supported BPMN elements
 * @param renderGateways - Whether to render gateway elements in the timeline
 * @param defaultDurations - Array to track default durations applied
 * @returns Gantt elements, dependencies, and component mapping for rendering
 */
export function handleEveryOccurrenceMode(
  pathTimings: Map<string, any[]>,
  pathDependencies: Array<{ sourceInstanceId: string; targetInstanceId: string; flowId: string }>,
  supportedElements: BPMNFlowElement[],
  renderGateways: boolean,
  defaultDurations: any[] = [],
  originalElementsForColorAssignment: BPMNFlowElement[],
  boundaryEventMapping?: Map<string, string>,
): ModeHandlerResult {
  const ganttDependencies: GanttDependency[] = [];

  // Perform shared initialization for all mode handlers
  const { elementMap, sequenceFlowMap, elementColors, originalElementToComponent } =
    initializeModeHandler(pathTimings, supportedElements, renderGateways);

  // Use consolidated element processing pipeline
  const processingOptions: ElementProcessingOptions = {
    renderGateways,
    showGhostElements: false, // Every-occurrence mode doesn't use ghost elements
    strategy: 'every',
  };

  const { ganttElements, instanceToComponent } = processElementTimings(
    pathTimings,
    null, // No pre-selection for every-occurrence mode
    elementMap,
    elementColors,
    originalElementToComponent,
    processingOptions,
  );

  // Update boundary event attachedToId based on the mapping
  if (boundaryEventMapping) {
    ganttElements.forEach((element) => {
      if ((element as any).isBoundaryEvent && element.id) {
        const taskInstanceId = boundaryEventMapping.get(element.id);
        if (taskInstanceId) {
          (element as any).attachedToId = taskInstanceId;
        }
      }
    });
  }

  // Create dependencies from path traversal results using consolidated utility
  const everyDependencies = createEveryOccurrenceDependencies(pathDependencies, elementMap);

  ganttDependencies.push(...everyDependencies);

  // Add boundary event dependencies
  addBoundaryEventDependencies(ganttDependencies, ganttElements, supportedElements);

  // Fix parent-child relationships: ensure children point to correct parent instances
  // Parent-child relationships are established during scoped traversal
  // fixSubProcessParentChildRelationships(ganttElements); // Not needed with scoped traversal

  // Set child relationship properties for subprocess elements
  validateSubProcessRelationships(ganttElements);

  // Child relationships already populated in validateSubProcessRelationships

  // Update total instances for elements that were duplicated
  updateTotalInstances(ganttElements);

  // Map any unmapped elements to their original component
  ganttElements.forEach((element) => {
    if (!instanceToComponent.has(element.id)) {
      const baseId = extractBaseElementId(element.id);
      const originalComponent = originalElementToComponent.get(baseId) || 0;
      instanceToComponent.set(element.id, originalComponent);
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
  defaultDurations: any[] = [],
  originalElementsForColorAssignment: BPMNFlowElement[],
  boundaryEventMapping?: Map<string, string>,
): ModeHandlerResult {
  const ganttDependencies: GanttDependency[] = [];

  // Perform shared initialization for all mode handlers
  const { elementMap, sequenceFlowMap, elementColors, originalElementToComponent } =
    initializeModeHandler(pathTimings, supportedElements, renderGateways);

  // Create a map to find the latest instance of each element
  const elementToLatestTiming = new Map<string, any>();

  // Find the latest occurrence of each element, with special handling for sub-process children
  // For nested sub-processes, we need to consider parent relationships
  const subProcessLatestTimings = new Map<string, any>();

  // Build hierarchy map for nested sub-processes
  const subProcessHierarchy = new Map<string, string>(); // child -> parent mapping
  pathTimings.forEach((timingInstances, elementId) => {
    if (timingInstances.length > 0 && timingInstances[0].isExpandedSubProcess) {
      const parentSubProcessId = timingInstances[0].parentSubProcessId;
      if (parentSubProcessId) {
        const parentParts = parentSubProcessId.split('_instance_');
        const parentBaseId = parentParts.length > 0 ? parentParts[0] : parentSubProcessId;
        subProcessHierarchy.set(elementId, parentBaseId);
      }
    }
  });

  // Process root sub-processes first, then nested ones
  const rootSubProcesses = new Set<string>();
  const nestedSubProcesses = new Set<string>();

  pathTimings.forEach((timingInstances, elementId) => {
    if (timingInstances.length > 0 && timingInstances[0].isExpandedSubProcess) {
      if (subProcessHierarchy.has(elementId)) {
        nestedSubProcesses.add(elementId);
      } else {
        rootSubProcesses.add(elementId);
      }
    }
  });

  // Process root sub-processes first
  rootSubProcesses.forEach((elementId) => {
    const timingInstances = pathTimings.get(elementId)!;
    const latestTiming = timingInstances.reduce((latest, current) =>
      current.startTime > latest.startTime ? current : latest,
    );

    applyLoopStatus(latestTiming, timingInstances);
    subProcessLatestTimings.set(elementId, latestTiming);
    elementToLatestTiming.set(elementId, latestTiming);
  });

  // Process nested sub-processes, selecting instances that align with selected parent
  nestedSubProcesses.forEach((elementId) => {
    const timingInstances = pathTimings.get(elementId)!;
    const parentBaseId = subProcessHierarchy.get(elementId)!;
    const selectedParent = subProcessLatestTimings.get(parentBaseId);

    // Process nested sub-process instances that align with selected parent

    if (selectedParent) {
      // Find the nested sub-process instance that belongs to the selected parent instance
      const alignedInstance = timingInstances.find(
        (timing) => timing.parentSubProcessId === selectedParent.instanceId,
      );

      const selectedTiming =
        alignedInstance ||
        timingInstances.reduce((latest, current) =>
          current.startTime > latest.startTime ? current : latest,
        );

      applyLoopStatus(selectedTiming, timingInstances);
      subProcessLatestTimings.set(elementId, selectedTiming);
      elementToLatestTiming.set(elementId, selectedTiming);

      // Selected timing for nested sub-process is now set
    }
  });

  // For each sub-process, find all its children and select the child instances that belong to the latest sub-process instance
  const selectedChildTimings = new Map<string, any>();
  subProcessLatestTimings.forEach((subProcessTiming, subProcessId) => {
    // Find all children of this sub-process
    pathTimings.forEach((timingInstances, elementId) => {
      if (
        timingInstances.length > 0 &&
        !subProcessLatestTimings.has(elementId) &&
        !selectedChildTimings.has(elementId)
      ) {
        // Check if any instance of this element belongs to this sub-process
        const childInstancesOfThisSubProcess = timingInstances.filter((timing) => {
          const parentId = timing.parentSubProcessId;
          if (!parentId) return false;
          const parentParts = parentId.split('_instance_');
          const parentBaseId = parentParts.length > 0 ? parentParts[0] : parentId;
          return parentBaseId === subProcessId;
        });

        if (childInstancesOfThisSubProcess.length > 0) {
          // Find child instances that belong to the latest sub-process instance
          // First try exact parent instance ID match for aligned children
          const exactMatchChildren = childInstancesOfThisSubProcess.filter((childTiming) => {
            return childTiming.parentSubProcessId === subProcessTiming.instanceId;
          });

          let matchingChildTiming;
          if (exactMatchChildren.length > 0) {
            // Use the latest timing among exact matches
            matchingChildTiming = exactMatchChildren.reduce((latest, current) =>
              current.startTime > latest.startTime ? current : latest,
            );
          } else {
            // Fallback: Find children that temporally belong to this sub-process instance
            // by finding children whose timing falls within this sub-process instance's timeframe
            const subProcessStart = subProcessTiming.startTime;
            const subProcessEnd = subProcessTiming.endTime || subProcessStart + 1;

            const temporalMatchChildren = childInstancesOfThisSubProcess.filter((childTiming) => {
              const childStart = childTiming.startTime;
              // Child should start at or after the sub-process starts
              // and before the sub-process ends (or within a reasonable timeframe)
              return childStart >= subProcessStart && childStart <= subProcessEnd;
            });

            if (temporalMatchChildren.length > 0) {
              matchingChildTiming = temporalMatchChildren.reduce((latest, current) =>
                current.startTime > latest.startTime ? current : latest,
              );
            }
          }

          if (matchingChildTiming) {
            applyLoopStatus(matchingChildTiming, timingInstances);
            selectedChildTimings.set(elementId, matchingChildTiming);
            elementToLatestTiming.set(elementId, matchingChildTiming);
          }
        }
      }
    });
  });

  // For non-sub-process elements that aren't children of sub-processes, use regular latest logic
  pathTimings.forEach((timingInstances, elementId) => {
    if (
      timingInstances.length > 0 &&
      !elementToLatestTiming.has(elementId) &&
      !selectedChildTimings.has(elementId)
    ) {
      const latestTiming = timingInstances.reduce((latest, current) =>
        current.startTime > latest.startTime ? current : latest,
      );

      // Using regular latest logic for non-sub-process elements

      // Apply merged loop status from all instances
      applyLoopStatus(latestTiming, timingInstances);

      elementToLatestTiming.set(elementId, latestTiming);
    }
  });

  // Add the selected child timings to the main map

  selectedChildTimings.forEach((timing, elementId) => {
    elementToLatestTiming.set(elementId, timing);
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

  // Handle loop dependencies when ghost elements are disabled
  if (!showGhostElements) {
    const loopDependencies = createLoopDependencies(pathDependencies, latestInstanceIdMap);
    latestDependencies.push(...loopDependencies);
  }

  // Use consolidated element processing pipeline
  const processingOptions: ElementProcessingOptions = {
    renderGateways,
    showGhostElements,
    strategy: 'latest',
  };

  const { ganttElements, instanceToComponent } = processElementTimings(
    pathTimings,
    elementToLatestTiming,
    elementMap,
    elementColors,
    originalElementToComponent,
    processingOptions,
  );

  // Update boundary event attachedToId based on the mapping
  if (boundaryEventMapping) {
    ganttElements.forEach((element) => {
      if ((element as any).isBoundaryEvent && element.id) {
        const taskInstanceId = boundaryEventMapping.get(element.id);
        if (taskInstanceId) {
          (element as any).attachedToId = taskInstanceId;
        }
      }
    });
  }

  // Process boundary events and add them to gantt elements
  // Boundary events are processed during path traversal

  // Process elements reachable through boundary event outgoing flows
  // Boundary event reachable elements handled by path traversal - skipping duplicate processing

  // Create dependencies from the filtered latest dependencies
  latestDependencies.forEach((dep, index) => {
    const flow = sequenceFlowMap.get(dep.flowId);
    if (flow) {
      // CRITICAL FIX: Use instance IDs to match gantt element IDs
      const sourceInstanceId = latestInstanceIdMap.get(dep.sourceOriginalId);
      const targetInstanceId = latestInstanceIdMap.get(dep.targetOriginalId);

      const regularDep = {
        id: `${dep.flowId}_latest_${index}`,
        sourceId: sourceInstanceId || dep.sourceOriginalId, // Use instance ID, fallback to base
        targetId: targetInstanceId || dep.targetOriginalId, // Use instance ID, fallback to base
        type: DependencyType.FINISH_TO_START,
        name: (flow as BPMNSequenceFlow).name,
        flowType: getFlowType(flow as BPMNSequenceFlow),
      };

      // Mark loop dependencies
      if ((dep as any).isLoop) {
        (regularDep as any).isLoop = true;
      }

      ganttDependencies.push(regularDep);
    }
  });

  // Add ghost dependencies if enabled
  if (showGhostDependencies && showGhostElements) {
    // Note: Ghost dependencies through gateways are not supported
    // This would require complex multi-gateway chain traversal logic

    pathDependencies.forEach((dep, index) => {
      const flow = sequenceFlowMap.get(dep.flowId);
      const isBoundaryAttachment =
        dep.flowId.includes('_to_') && dep.flowId.includes('_attachment');

      if (flow || isBoundaryAttachment) {
        const { sourceOriginalId, targetOriginalId } = extractOriginalElementIds(
          dep.sourceInstanceId,
          dep.targetInstanceId,
        );

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
          const flowType = flow ? getFlowType(flow as BPMNSequenceFlow) : 'normal';
          const regularDepIndex = ganttDependencies.findIndex(
            (d) =>
              d.sourceId === sourceOriginalId &&
              d.targetId === targetOriginalId &&
              d.flowType === flowType &&
              !d.isGhost,
          );

          const ghostDep = {
            id: `${dep.flowId}_ghost_${index}`,
            sourceId: sourceOriginalId,
            targetId: targetOriginalId,
            type: DependencyType.FINISH_TO_START,
            name: flow ? (flow as BPMNSequenceFlow).name : undefined,
            flowType: flowType,
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

  // Add boundary event dependencies
  addBoundaryEventDependencies(ganttDependencies, ganttElements, supportedElements);

  // Fix parent-child relationships: ensure children point to correct parent instances
  fixSubProcessParentChildRelationships(ganttElements);

  // Set child relationship properties for subprocess elements
  validateSubProcessRelationships(ganttElements);

  // Child relationships already populated in validateSubProcessRelationships

  // Recalculate sub-process bounds after mode filtering
  recalculateSubProcessBounds(ganttElements);

  // Recalculate boundary event positions after all timing adjustments
  recalculateBoundaryEventPositions(ganttElements);

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
  defaultDurations: any[] = [],
  originalElementsForColorAssignment: BPMNFlowElement[],
  boundaryEventMapping?: Map<string, string>,
): ModeHandlerResult {
  const ganttDependencies: GanttDependency[] = [];

  // Perform shared initialization for all mode handlers
  const { elementMap, sequenceFlowMap, elementColors, originalElementToComponent } =
    initializeModeHandler(pathTimings, supportedElements, renderGateways);

  // Create a map to find the earliest instance of each element
  const elementToEarliestTiming = new Map<string, any>();

  // Find the earliest occurrence of each element, with special handling for sub-process children
  // Build hierarchy map for nested sub-processes (same logic as latest-occurrence mode)
  const subProcessHierarchy = new Map<string, string>(); // child -> parent mapping
  pathTimings.forEach((timingInstances, elementId) => {
    if (timingInstances.length > 0 && timingInstances[0].isExpandedSubProcess) {
      const parentSubProcessId = timingInstances[0].parentSubProcessId;
      if (parentSubProcessId) {
        const parentParts = parentSubProcessId.split('_instance_');
        const parentBaseId = parentParts.length > 0 ? parentParts[0] : parentSubProcessId;
        subProcessHierarchy.set(elementId, parentBaseId);
      }
    }
  });

  // Process root sub-processes first, then nested ones
  const rootSubProcesses = new Set<string>();
  const nestedSubProcesses = new Set<string>();

  pathTimings.forEach((timingInstances, elementId) => {
    if (timingInstances.length > 0 && timingInstances[0].isExpandedSubProcess) {
      if (subProcessHierarchy.has(elementId)) {
        nestedSubProcesses.add(elementId);
      } else {
        rootSubProcesses.add(elementId);
      }
    }
  });

  // First, identify all sub-process elements and their earliest occurrences
  const subProcessEarliestTimings = new Map<string, any>();

  // Process root sub-processes first
  rootSubProcesses.forEach((elementId) => {
    const timingInstances = pathTimings.get(elementId)!;
    const earliestTiming = timingInstances.reduce((earliest, current) =>
      current.startTime < earliest.startTime ? current : earliest,
    );
    applyLoopStatus(earliestTiming, timingInstances);
    subProcessEarliestTimings.set(elementId, earliestTiming);
    elementToEarliestTiming.set(elementId, earliestTiming);
  });

  // Process nested sub-processes, selecting instances that align with selected parent
  nestedSubProcesses.forEach((elementId) => {
    const timingInstances = pathTimings.get(elementId)!;
    const parentBaseId = subProcessHierarchy.get(elementId)!;
    const selectedParent = subProcessEarliestTimings.get(parentBaseId);

    if (selectedParent) {
      // Find the nested sub-process instance that belongs to the selected parent instance
      const matchingTiming = timingInstances.find(
        (timing) => timing.parentSubProcessId === selectedParent.instanceId,
      );

      if (matchingTiming) {
        applyLoopStatus(matchingTiming, timingInstances);
        subProcessEarliestTimings.set(elementId, matchingTiming);
        elementToEarliestTiming.set(elementId, matchingTiming);
      } else {
        // Fallback: select earliest timing for this nested sub-process
        const earliestTiming = timingInstances.reduce((earliest, current) =>
          current.startTime < earliest.startTime ? current : earliest,
        );
        applyLoopStatus(earliestTiming, timingInstances);
        subProcessEarliestTimings.set(elementId, earliestTiming);
        elementToEarliestTiming.set(elementId, earliestTiming);
      }
    }
  });

  // For each sub-process, find all its children and select the child instances that belong to the earliest sub-process instance
  const selectedChildTimings = new Map<string, any>();
  subProcessEarliestTimings.forEach((subProcessTiming, subProcessId) => {
    // Find all children of this sub-process
    pathTimings.forEach((timingInstances, elementId) => {
      if (
        timingInstances.length > 0 &&
        !subProcessEarliestTimings.has(elementId) &&
        !selectedChildTimings.has(elementId)
      ) {
        // Check if any instance of this element belongs to this sub-process
        const childInstancesOfThisSubProcess = timingInstances.filter((timing) => {
          const parentId = timing.parentSubProcessId;
          if (!parentId) return false;
          const parentParts = parentId.split('_instance_');
          const parentBaseId = parentParts.length > 0 ? parentParts[0] : parentId;
          return parentBaseId === subProcessId;
        });

        if (childInstancesOfThisSubProcess.length > 0) {
          // Find the child instance that corresponds to the earliest sub-process instance
          // This is the child instance whose parent instance ID matches the earliest sub-process instance
          // Since children have base parent IDs, we need to find the child instance
          // that temporally belongs to this specific sub-process instance
          const matchingChildTiming = childInstancesOfThisSubProcess.find((childTiming) => {
            const childParentId = childTiming.parentSubProcessId;
            const subProcessInstanceId = subProcessTiming.instanceId;
            const exactMatch = childParentId === subProcessInstanceId;

            // Simple logic: child instances should start at the same time as their parent sub-process instance
            const childParentParts = childParentId?.split('_instance_');
            const baseIdMatch =
              childParentParts && childParentParts.length > 0
                ? childParentParts[0] === subProcessId
                : false;
            if (!exactMatch && baseIdMatch) {
              const subProcessStart = subProcessTiming.startTime;
              const childStart = childTiming.startTime;
              const startTimeMatch = childStart === subProcessStart;

              return startTimeMatch;
            }

            return exactMatch;
          });

          if (matchingChildTiming) {
            applyLoopStatus(matchingChildTiming, timingInstances);
            selectedChildTimings.set(elementId, matchingChildTiming);
            elementToEarliestTiming.set(elementId, matchingChildTiming);
          }
        }
      }
    });
  });

  // For non-sub-process elements that aren't children of sub-processes, use regular earliest logic
  // But handle boundary events specially to maintain task-boundary relationships
  const boundaryEventElements = new Map<string, any[]>();
  const regularElements = new Map<string, any[]>();

  pathTimings.forEach((timingInstances, elementId) => {
    if (
      timingInstances.length > 0 &&
      !elementToEarliestTiming.has(elementId) &&
      !selectedChildTimings.has(elementId)
    ) {
      // Check if this is a boundary event
      const element = elementMap.get(elementId);
      if (element && isBoundaryEventElement(element)) {
        boundaryEventElements.set(elementId, timingInstances);
      } else {
        regularElements.set(elementId, timingInstances);
      }
    }
  });

  // Process regular elements first
  regularElements.forEach((timingInstances, elementId) => {
    const earliestTiming = timingInstances.reduce((earliest, current) =>
      current.startTime < earliest.startTime ? current : earliest,
    );

    // Apply merged loop status from all instances
    applyLoopStatus(earliestTiming, timingInstances);

    elementToEarliestTiming.set(elementId, earliestTiming);
  });

  // Process boundary events using the mapping if available
  boundaryEventElements.forEach((timingInstances, elementId) => {
    if (boundaryEventMapping && timingInstances.length > 0) {
      // Find the boundary event instance that matches a selected task instance
      const matchingInstance = timingInstances.find((timing) => {
        const taskInstanceId = boundaryEventMapping.get(timing.instanceId);
        if (!taskInstanceId) return false;

        // Check if this task instance was selected
        const taskBaseId = taskInstanceId.split('_instance_')[0];
        const selectedTaskTiming = elementToEarliestTiming.get(taskBaseId);
        const matches = selectedTaskTiming && selectedTaskTiming.instanceId === taskInstanceId;
        return matches;
      });

      if (matchingInstance) {
        // Update the attachedToId to use the base task element ID (to match task gantt element IDs in earliest/latest modes)
        const taskInstanceId = boundaryEventMapping.get(matchingInstance.instanceId);
        if (taskInstanceId) {
          const baseTaskId = taskInstanceId.includes('_instance_')
            ? taskInstanceId.split('_instance_')[0]
            : taskInstanceId;
          matchingInstance.attachedToId = baseTaskId;
        }

        applyLoopStatus(matchingInstance, timingInstances);
        elementToEarliestTiming.set(elementId, matchingInstance);
      } else {
        // Fallback to earliest if no matching instance found
        const earliestTiming = timingInstances.reduce((earliest, current) =>
          current.startTime < earliest.startTime ? current : earliest,
        );
        // Update the attachedToId to use the base task element ID even for fallback
        if (boundaryEventMapping) {
          const taskInstanceId = boundaryEventMapping.get(earliestTiming.instanceId);
          if (taskInstanceId) {
            const baseTaskId = taskInstanceId.includes('_instance_')
              ? taskInstanceId.split('_instance_')[0]
              : taskInstanceId;
            earliestTiming.attachedToId = baseTaskId;
          }
        }

        applyLoopStatus(earliestTiming, timingInstances);
        elementToEarliestTiming.set(elementId, earliestTiming);
      }
    } else {
      // No mapping available, use earliest
      const earliestTiming = timingInstances.reduce((earliest, current) =>
        current.startTime < earliest.startTime ? current : earliest,
      );
      applyLoopStatus(earliestTiming, timingInstances);
      elementToEarliestTiming.set(elementId, earliestTiming);
    }
  });

  // Add the selected child timings to the main map
  selectedChildTimings.forEach((timing, elementId) => {
    elementToEarliestTiming.set(elementId, timing);
  });

  // Create dependency map for earliest instances
  const earliestInstanceIdMap = new Map<string, string>();
  elementToEarliestTiming.forEach((timing, elementId) => {
    earliestInstanceIdMap.set(elementId, timing.instanceId);
  });

  const earliestDependencies = createEarliestDependencies(
    pathDependencies,
    earliestInstanceIdMap,
    showGhostDependencies,
  );

  // Handle loop dependencies when ghost elements are disabled
  if (!showGhostElements) {
    const loopDependencies = createLoopDependencies(pathDependencies, earliestInstanceIdMap);
    earliestDependencies.push(...loopDependencies);
  }

  // Use consolidated element processing pipeline
  const processingOptions: ElementProcessingOptions = {
    renderGateways,
    showGhostElements,
    strategy: 'earliest',
  };

  const { ganttElements, instanceToComponent } = processElementTimings(
    pathTimings,
    elementToEarliestTiming,
    elementMap,
    elementColors,
    originalElementToComponent,
    processingOptions,
  );

  // Update boundary event attachedToId based on the mapping
  if (boundaryEventMapping) {
    ganttElements.forEach((element) => {
      if ((element as any).isBoundaryEvent && element.id) {
        const taskInstanceId = boundaryEventMapping.get(element.id);
        if (taskInstanceId) {
          (element as any).attachedToId = taskInstanceId;
        }
      }
    });
  }

  // Boundary events are now handled by path traversal - no separate processing needed

  // Create dependencies from selected flows, pointing to earliest instances
  earliestDependencies.forEach((dep, index) => {
    const flow = sequenceFlowMap.get(dep.flowId);
    if (flow) {
      // CRITICAL FIX: Use instance IDs to match gantt element IDs
      const sourceInstanceId = earliestInstanceIdMap.get(dep.sourceOriginalId);
      const targetInstanceId = earliestInstanceIdMap.get(dep.targetOriginalId);

      const dependency = {
        id: `${dep.flowId}_earliest_${index}`,
        sourceId: sourceInstanceId || dep.sourceOriginalId, // Use instance ID, fallback to base
        targetId: targetInstanceId || dep.targetOriginalId, // Use instance ID, fallback to base
        type: DependencyType.FINISH_TO_START,
        name: (flow as BPMNSequenceFlow).name,
        flowType: getFlowType(flow as BPMNSequenceFlow),
      };

      // Mark loop dependencies
      if ((dep as any).isLoop) {
        (dependency as any).isLoop = true;
      }

      ganttDependencies.push(dependency);
    }
  });

  // Add ghost dependencies if enabled
  if (showGhostDependencies && showGhostElements) {
    // Note: Ghost dependencies through gateways are not supported
    // This would require complex multi-gateway chain traversal logic

    pathDependencies.forEach((dep, index) => {
      const flow = sequenceFlowMap.get(dep.flowId);
      const isBoundaryAttachment =
        dep.flowId.includes('_to_') && dep.flowId.includes('_attachment');

      if (flow || isBoundaryAttachment) {
        const { sourceOriginalId, targetOriginalId } = extractOriginalElementIds(
          dep.sourceInstanceId,
          dep.targetInstanceId,
        );

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
              name: (flow as BPMNSequenceFlow).name,
              flowType: getFlowType(flow as BPMNSequenceFlow),
              isGhost: true,
              sourceInstanceId: dep.sourceInstanceId, // This should be the main instance
              targetInstanceId: dep.targetInstanceId, // This is the ghost instance
            };

            ganttDependencies.push(mainToGhostDep);
          } else {
            // Regular ghost dependency logic
            // Check if there's already a regular dependency for this flow that we should replace
            const flowType = flow ? getFlowType(flow as BPMNSequenceFlow) : 'normal';
            const regularDepIndex = ganttDependencies.findIndex(
              (d) =>
                d.sourceId === sourceOriginalId &&
                d.targetId === targetOriginalId &&
                d.flowType === flowType &&
                !d.isGhost,
            );

            const ghostDep = {
              id: `${dep.flowId}_ghost_${index}`,
              sourceId: sourceOriginalId,
              targetId: targetOriginalId,
              type: DependencyType.FINISH_TO_START,
              name: flow ? (flow as BPMNSequenceFlow).name : undefined,
              flowType: flowType,
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

  // Add boundary event dependencies
  addBoundaryEventDependencies(ganttDependencies, ganttElements, supportedElements);

  // Fix parent-child relationships: ensure children point to correct parent instances
  fixSubProcessParentChildRelationships(ganttElements);

  // Set child relationship properties for subprocess elements
  validateSubProcessRelationships(ganttElements);

  // Child relationships already populated in validateSubProcessRelationships

  // Recalculate sub-process bounds after mode filtering
  recalculateSubProcessBounds(ganttElements);

  // Recalculate boundary event positions after all timing adjustments
  recalculateBoundaryEventPositions(ganttElements);

  return {
    ganttElements,
    ganttDependencies,
    elementToComponent: instanceToComponent,
  };
}

/**
 * Create a gantt element based on the BPMN element type
 */

/**
 * Fix parent-child relationships to ensure children point to specific parent instances
 * This addresses the issue where children have base parent IDs but should point to specific instances
 */
function fixSubProcessParentChildRelationships(ganttElements: GanttElementType[]): void {
  // Find all sub-process instances
  const subProcessInstances = ganttElements.filter(
    (el) => el.type === 'group' && (el as any).isSubProcess,
  );

  // Find all elements that claim to be children of sub-processes
  const potentialChildren = ganttElements.filter((el) => {
    const parentId = (el as any).parentSubProcessId;
    return parentId && el.type !== 'group';
  });

  // For each potential child, find the correct parent instance based on timing overlap
  potentialChildren.forEach((child) => {
    const originalParentId = (child as any).parentSubProcessId;
    if (!originalParentId) return;

    // Get the base parent ID (remove instance suffix if present)
    const parentParts = originalParentId.split('_instance_');
    const baseParentId = parentParts.length > 0 ? parentParts[0] : originalParentId;

    // Find all sub-process instances that match this base ID
    const candidateParents = subProcessInstances.filter((parent) => {
      const parentParts = parent.id.split('_instance_');
      const parentBaseId = parentParts.length > 0 ? parentParts[0] : parent.id;
      return parentBaseId === baseParentId;
    });

    if (candidateParents.length === 0) {
      // No matching parent found, keep original
      return;
    }

    if (candidateParents.length === 1) {
      // Only one candidate, assign directly
      (child as any).parentSubProcessId = candidateParents[0].id;
      return;
    }

    // Multiple candidates: find the one whose timing contains this child
    const matchingParent = candidateParents.find((parent) => {
      if (!('end' in parent) || parent.end === undefined) {
        // Parent has no end time, use a large value
        return parent.start <= child.start;
      }

      // Child should be contained within parent's timespan
      const childEnd = 'end' in child ? child.end || child.start : child.start;
      return (
        parent.start <= child.start &&
        parent.end >= (childEnd !== undefined ? childEnd : child.start)
      );
    });

    if (matchingParent) {
      (child as any).parentSubProcessId = matchingParent.id;
    } else {
      // No timing match found, assign to first candidate as fallback
      (child as any).parentSubProcessId = candidateParents[0].id;
    }
  });
}

/**
 * Set child relationship properties for subprocess elements
 */
function validateSubProcessRelationships(ganttElements: GanttElementType[]): void {
  const subProcesses = ganttElements.filter(
    (el) => el.type === 'group' && (el as any).isSubProcess,
  );
  const children = ganttElements.filter((el) => (el as any).parentSubProcessId);

  // Check for orphaned children (children with no matching parent)
  const orphanedChildren = children.filter((child) => {
    const parentId = (child as any).parentSubProcessId;
    if (!parentId) return true;

    // Extract base ID from complex aligned parent IDs
    // Handle patterns like: Activity_04vzwbt_aligned_Activity_1c6bl41_instance_10_1753705987092
    const extractBaseId = (id: string) => {
      if (id.includes('_aligned_')) {
        const alignedParts = id.split('_aligned_');
        return alignedParts.length > 0 ? alignedParts[0] : id;
      }
      const instanceParts = id.split('_instance_');
      return instanceParts.length > 0 ? instanceParts[0] : id;
    };

    const parentBaseId = extractBaseId(parentId);

    // Check if any sub-process matches this base ID
    return !subProcesses.some((sp) => {
      const spBaseId = extractBaseId(sp.id);
      return sp.id === parentId || spBaseId === parentBaseId;
    });
  });

  if (orphanedChildren.length > 0) {
  }

  // Check distribution of children across sub-process instances
  const childDistribution = new Map<string, number[]>();
  subProcesses.forEach((sp) => {
    const childCount = children.filter(
      (child) => (child as any).parentSubProcessId === sp.id,
    ).length;
    const baseParts = sp.id.split('_instance_');
    const baseId = baseParts.length > 0 ? baseParts[0] : sp.id;
    const existing = childDistribution.get(baseId) || [];
    childDistribution.set(baseId, [...existing, childCount]);
  });

  subProcesses.forEach((subProcess) => {
    // Get the base sub-process ID (without instance suffix)
    const baseSubProcessId = getBaseElementId(subProcess.id);

    // Find all child elements for this specific sub-process instance
    const childElements = ganttElements.filter((el) => {
      const elParentId = (el as any).parentSubProcessId;

      // Check if this element belongs to this specific sub-process instance ONLY
      // Do not include children from the base sub-process for instances
      return elParentId === subProcess.id && el.id !== subProcess.id;
    });

    if (subProcess.type === 'group') {
      (subProcess as any).childIds = childElements.map((child) => child.id);
      (subProcess as any).hasChildren = childElements.length > 0;
    }
  });
}

/**
 * Create latest dependencies with deduplication
 * Fixed to handle loop scenarios where only selected instances should have dependencies
 */
function createLatestDependencies(
  pathDependencies: Array<{ sourceInstanceId: string; targetInstanceId: string; flowId: string }>,
  latestInstanceIdMap: Map<string, string>,
) {
  // Create a reverse map: instanceId -> baseElementId for selected instances only
  const selectedInstances = new Set<string>();
  latestInstanceIdMap.forEach((instanceId) => {
    selectedInstances.add(instanceId);
  });

  // FIXED: Map path dependencies to selected instances instead of filtering by exact instance match
  const mapped = pathDependencies
    .map((dep) => {
      const { sourceOriginalId, targetOriginalId } = extractOriginalElementIds(
        dep.sourceInstanceId,
        dep.targetInstanceId,
      );

      // Map to selected instances for source and target
      const selectedSourceInstanceId = latestInstanceIdMap.get(sourceOriginalId);
      const selectedTargetInstanceId = latestInstanceIdMap.get(targetOriginalId);

      // Only include if both source and target elements have selected instances
      if (!selectedSourceInstanceId || !selectedTargetInstanceId) {
        return null;
      }

      return {
        sourceInstanceId: selectedSourceInstanceId, // Use selected instance ID
        targetInstanceId: selectedTargetInstanceId, // Use selected instance ID
        flowId: dep.flowId,
        sourceOriginalId,
        targetOriginalId,
      };
    })
    .filter((dep): dep is NonNullable<typeof dep> => dep !== null);

  // Deduplicate by flow and endpoints to handle multiple paths through same elements
  const seen = new Set<string>();
  return mapped.filter((dep) => {
    const key = `${dep.sourceOriginalId}->${dep.targetOriginalId}-${dep.flowId}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

/**
 * Create earliest dependencies with deduplication
 * Fixed to handle loop scenarios where only selected instances should have dependencies
 */
function createEarliestDependencies(
  pathDependencies: Array<{ sourceInstanceId: string; targetInstanceId: string; flowId: string }>,
  earliestInstanceIdMap: Map<string, string>,
  showGhostDependencies: boolean,
) {
  // Create a reverse map: instanceId -> baseElementId for selected instances only
  const selectedInstances = new Set<string>();
  earliestInstanceIdMap.forEach((instanceId) => {
    selectedInstances.add(instanceId);
  });

  // FIXED: Map path dependencies to selected instances instead of filtering by exact instance match
  const mappedDependencies = pathDependencies
    .map((dep) => {
      const { sourceOriginalId, targetOriginalId } = extractOriginalElementIds(
        dep.sourceInstanceId,
        dep.targetInstanceId,
      );

      // Map to selected instances for source and target
      const selectedSourceInstanceId = earliestInstanceIdMap.get(sourceOriginalId);
      const selectedTargetInstanceId = earliestInstanceIdMap.get(targetOriginalId);

      // Only include if both source and target elements have selected instances
      if (!selectedSourceInstanceId || !selectedTargetInstanceId) {
        return null;
      }

      return {
        sourceOriginalId,
        targetOriginalId,
        flowId: dep.flowId,
        sourceInstanceId: selectedSourceInstanceId, // Use selected instance ID for ghost dependencies
        targetInstanceId: selectedTargetInstanceId, // Use selected instance ID for ghost dependencies
      };
    })
    .filter((dep): dep is NonNullable<typeof dep> => dep !== null);

  // Only deduplicate when ghost dependencies are disabled
  // When ghost dependencies are enabled, we need all path dependencies to be available
  // for the ghost dependency replacement logic
  if (showGhostDependencies) {
    return mappedDependencies;
  }

  // Deduplicate when ghost dependencies are disabled
  const seen = new Set<string>();
  return mappedDependencies.filter((dep) => {
    const key = `${dep.sourceOriginalId}->${dep.targetOriginalId}-${dep.flowId}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

/**
 * Create loop dependencies when ghost elements are disabled
 * Identifies loop patterns and creates self-loop dependencies to maintain connectivity
 */
function createLoopDependencies(
  pathDependencies: Array<{ sourceInstanceId: string; targetInstanceId: string; flowId: string }>,
  selectedInstanceIdMap: Map<string, string>,
) {
  const loopDependencies: any[] = [];

  // Find loop patterns: dependencies where source and target have the same base element ID
  // but different instance IDs (indicating a loop back to the same element)
  pathDependencies.forEach((dep) => {
    const { sourceOriginalId, targetOriginalId } = extractOriginalElementIds(
      dep.sourceInstanceId,
      dep.targetInstanceId,
    );

    // Check if this is a loop (same base element, different instances)
    if (sourceOriginalId === targetOriginalId && dep.sourceInstanceId !== dep.targetInstanceId) {
      const selectedInstanceId = selectedInstanceIdMap.get(sourceOriginalId);

      // Only create loop dependency if we have a selected instance for this element
      if (selectedInstanceId) {
        // Check if we already have a dependency from this element to itself
        const existingLoop = loopDependencies.find(
          (loop) =>
            loop.sourceOriginalId === sourceOriginalId &&
            loop.targetOriginalId === targetOriginalId,
        );

        if (!existingLoop) {
          loopDependencies.push({
            sourceInstanceId: selectedInstanceId,
            targetInstanceId: selectedInstanceId, // Self-loop
            flowId: dep.flowId,
            sourceOriginalId,
            targetOriginalId,
            isLoop: true, // Mark as loop dependency
          } as any);
        }
      }
    }
  });

  return loopDependencies;
}

/**
 * Update total instances count for all elements after duplication
 */
function updateTotalInstances(ganttElements: GanttElementType[]): void {
  // Group elements by base ID
  const elementGroups = new Map<string, GanttElementType[]>();

  ganttElements.forEach((element) => {
    const baseId = extractBaseElementId(element.id);
    if (!elementGroups.has(baseId)) {
      elementGroups.set(baseId, []);
    }
    elementGroups.get(baseId)!.push(element);
  });

  // Update total instances for each group
  elementGroups.forEach((instances) => {
    const totalInstances = instances.length;
    instances.forEach((instance, index) => {
      if (totalInstances > 1) {
        instance.totalInstances = totalInstances;
        // Preserve existing instance number or assign new one
        if (!instance.instanceNumber) {
          instance.instanceNumber = index + 1;
        }
      }
    });
  });
}

/**
 * Recalculate boundary event positions to be centered on their attached tasks
 * This is needed after any task timing adjustments
 */
function recalculateBoundaryEventPositions(ganttElements: GanttElementType[]): void {
  // Create a map of tasks by ID for quick lookup
  const taskMap = new Map<string, GanttElementType>();
  ganttElements.forEach((el) => {
    if (el.type === 'task' || el.type === 'group') {
      taskMap.set(el.id, el);
    }
  });

  // Update boundary event positions
  ganttElements.forEach((element) => {
    if ((element as any).isBoundaryEvent && (element as any).attachedToId) {
      const attachedTask = taskMap.get((element as any).attachedToId);
      if (attachedTask && attachedTask.start !== undefined) {
        const taskStart = attachedTask.start;
        const taskEnd = attachedTask.end || taskStart;
        const taskDuration = taskEnd - taskStart;

        // Position boundary event at the horizontal center of the task
        const centeredPosition = taskStart + taskDuration / 2;

        element.start = centeredPosition;
      }
    }
  });
}

/**
 * Recalculate sub-process bounds based on their filtered children
 * This is needed after mode filtering to ensure sub-process timing is correct
 */
function recalculateSubProcessBounds(ganttElements: GanttElementType[]): void {
  const subProcessElements = ganttElements.filter((el) => el.isSubProcess);

  subProcessElements.forEach((subProcess) => {
    // Find all direct children of this sub-process
    const children = ganttElements.filter((el) => el.parentSubProcessId === subProcess.id);

    if (children.length > 0) {
      // Include both tasks (with start/end) and events (with start only) in bounds calculation
      const validChildren = children.filter((c) => c.start !== undefined);

      if (validChildren.length > 0) {
        const earliestStart = Math.min(...validChildren.map((c) => c.start!));
        // For end calculation, use actual end time for tasks, start time for events
        const latestEnd = Math.max(...validChildren.map((c) => c.end || c.start!));

        // Update sub-process timing
        const oldEnd = subProcess.end;
        subProcess.start = earliestStart;
        subProcess.end = latestEnd;

        // If sub-process end time changed, update downstream elements
        if (oldEnd !== latestEnd) {
          const timeDelta = latestEnd - (oldEnd as number);

          // Find elements that might be affected by this sub-process timing change
          // Exclude boundary events as they should maintain their calculated position
          const potentialDownstreamElements = ganttElements.filter(
            (el) =>
              el.start &&
              (el.start as number) >= (oldEnd as number) &&
              !el.parentSubProcessId &&
              !(el as any).isBoundaryEvent,
          );

          // Update downstream elements timing
          potentialDownstreamElements.forEach((downstreamElement) => {
            const oldStart = downstreamElement.start as number;
            const oldEnd = downstreamElement.end as number;
            const newStart = latestEnd; // Start immediately after sub-process ends (no flow duration)
            const newEnd = oldEnd ? oldEnd + timeDelta : undefined;

            downstreamElement.start = newStart;
            if (downstreamElement.end) {
              downstreamElement.end = newEnd;
            }
          });
        }
      }
    }
  });
}
