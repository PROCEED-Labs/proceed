/**
 * Consolidated element processing pipeline for mode handlers
 *
 * This module consolidates the element processing pattern that was duplicated across
 * all three mode handlers (Every, Latest, Earliest) with ~53% code reduction.
 *
 * The consolidated pattern includes:
 * - Element timing iteration and filtering
 * - Gantt element creation and property assignment
 * - Ghost element handling for multiple occurrences
 * - Component mapping for visual grouping
 * - Instance numbering for every-occurrence mode
 */

import type { GanttElementType } from '@/components/gantt-chart-canvas/types';
import type { BPMNFlowElement, BPMNTask, BPMNEvent, BPMNGateway } from '../types/types';
import { defaultElementTransformerFactory } from './element-transformer-factory';
import { transformExpandedSubProcess } from '../transformers/element-transformers';

/**
 * Get the hierarchy level of the element that a boundary event is attached to
 */
function getAttachedElementHierarchyLevel(
  attachedToId: string,
  pathTimings: Map<string, any[]>,
  elementMap: Map<string, BPMNFlowElement>,
): number {
  // Remove instance suffix if present (e.g., "task_instance_1" -> "task")
  const baseElementId = attachedToId.split('_instance_')[0];

  // Look up the timing for the attached element
  const attachedTimings = pathTimings.get(baseElementId);
  if (attachedTimings && attachedTimings.length > 0) {
    // Use the hierarchy level from the first timing (all instances should have the same hierarchy level)
    return attachedTimings[0].hierarchyLevel || 0;
  }

  // Fallback: look up the element in the element map and check if it has hierarchy level
  const attachedElement = elementMap.get(baseElementId);
  if (attachedElement && (attachedElement as any).hierarchyLevel !== undefined) {
    return (attachedElement as any).hierarchyLevel;
  }

  // Default to hierarchy level 0 if not found
  return 0;
}

/**
 * Element processing strategy for different traversal modes
 */
export type ElementProcessingStrategy = 'every' | 'latest' | 'earliest';

/**
 * Options for element processing pipeline
 */
export interface ElementProcessingOptions {
  renderGateways: boolean;
  showGhostElements: boolean;
  strategy: ElementProcessingStrategy;
}

/**
 * Result from element processing pipeline
 */
export interface ElementProcessingResult {
  ganttElements: GanttElementType[];
  instanceToComponent: Map<string, number>;
}

/**
 * Consolidated element processing pipeline
 *
 * This function replaces the near-identical element processing loops in all three mode handlers.
 * It handles timing selection, element creation, property assignment, and ghost element rendering.
 *
 * @param pathTimings - Map of element ID to timing instances from path traversal
 * @param elementTimingSelection - Pre-selected timing for each element (latest/earliest modes)
 * @param elementMap - O(1) lookup map for BPMN elements
 * @param elementColors - Color assignments for visual grouping
 * @param originalElementToComponent - Component mapping for original elements
 * @param options - Processing options (strategy, rendering flags, ghost elements)
 * @returns Processed gantt elements and component mapping
 */
export function processElementTimings(
  pathTimings: Map<string, any[]>,
  elementTimingSelection: Map<string, any> | null,
  elementMap: Map<string, BPMNFlowElement>,
  elementColors: Map<string, string>,
  originalElementToComponent: Map<string, number>,
  options: ElementProcessingOptions,
): ElementProcessingResult {
  const ganttElements: GanttElementType[] = [];
  const instanceToComponent = new Map<string, number>();

  if (options.strategy === 'every') {
    return processEveryOccurrenceElements(
      pathTimings,
      elementMap,
      elementColors,
      originalElementToComponent,
      options,
    );
  } else {
    return processLatestEarliestElements(
      pathTimings,
      elementTimingSelection!,
      elementMap,
      elementColors,
      originalElementToComponent,
      options,
    );
  }
}

/**
 * Process elements for every-occurrence mode
 * Creates separate gantt elements for each timing instance with sequential numbering
 */
function processEveryOccurrenceElements(
  pathTimings: Map<string, any[]>,
  elementMap: Map<string, BPMNFlowElement>,
  elementColors: Map<string, string>,
  originalElementToComponent: Map<string, number>,
  options: ElementProcessingOptions,
): ElementProcessingResult {
  const ganttElements: GanttElementType[] = [];
  const instanceToComponent = new Map<string, number>();

  // Create a flat list of all elements in execution order
  const allTimings: Array<{
    elementId: string;
    timing: any;
    element: BPMNFlowElement;
    color: string;
  }> = [];

  pathTimings.forEach((timingInstances, elementId) => {
    const element = elementMap.get(elementId);
    if (!element || element.$type === 'bpmn:SequenceFlow') {
      return;
    }

    const elementColor = elementColors.get(elementId);

    timingInstances.forEach((timing) => {
      allTimings.push({ elementId, timing, element, color: elementColor || '#666' });
    });
  });

  // Sort by start time to maintain execution order
  allTimings.sort((a, b) => a.timing.startTime - b.timing.startTime);

  // Transform elements in execution order and assign sequential component numbers
  const elementInstanceCount = new Map<string, number>();

  allTimings.forEach((item, executionOrder) => {
    const { elementId, timing, element, color } = item;

    // Increment instance count for this base element ID
    const currentCount = (elementInstanceCount.get(elementId) || 0) + 1;
    elementInstanceCount.set(elementId, currentCount);

    const instanceNumber = currentCount;
    const totalInstances = pathTimings.get(elementId)!.length;

    const ganttElement = createGanttElement(element, timing, color, options.renderGateways);
    if (ganttElement) {
      // Every-occurrence specific properties
      ganttElement.id = timing.instanceId || ganttElement.id;
      ganttElement.name = ganttElement.name || element.id;
      ganttElement.instanceNumber = instanceNumber;
      ganttElement.totalInstances = totalInstances;

      // Common properties
      // Special handling for boundary events: look up attached element's hierarchy level
      if (ganttElement.isBoundaryEvent && ganttElement.attachedToId) {
        timing.attachedElementHierarchyLevel = getAttachedElementHierarchyLevel(
          ganttElement.attachedToId,
          pathTimings,
          elementMap,
        );
      }
      assignCommonElementProperties(ganttElement, timing);

      ganttElements.push(ganttElement);

      // Map instance to its original element's component
      const originalComponent = originalElementToComponent.get(elementId) || 0;
      instanceToComponent.set(ganttElement.id, originalComponent);
    }
  });

  return { ganttElements, instanceToComponent };
}

/**
 * Process elements for latest/earliest occurrence modes
 * Uses pre-selected timing for each element with optional ghost element rendering
 */
function processLatestEarliestElements(
  pathTimings: Map<string, any[]>,
  elementTimingSelection: Map<string, any>,
  elementMap: Map<string, BPMNFlowElement>,
  elementColors: Map<string, string>,
  originalElementToComponent: Map<string, number>,
  options: ElementProcessingOptions,
): ElementProcessingResult {
  const ganttElements: GanttElementType[] = [];
  const instanceToComponent = new Map<string, number>();

  pathTimings.forEach((timingInstances, elementId) => {
    const timing = elementTimingSelection.get(elementId) || timingInstances[0];
    const element = elementMap.get(elementId);
    if (!element || element.$type === 'bpmn:SequenceFlow') return;

    const elementColor = elementColors.get(elementId);
    const ganttElement = createGanttElement(element, timing, elementColor, options.renderGateways);

    if (ganttElement) {
      // Latest/Earliest specific properties
      ganttElement.id = timing.instanceId || elementId; // Use selected instance ID, fallback to element ID
      ganttElement.name = ganttElement.name || element.id;
      ganttElement.instanceNumber = undefined;
      ganttElement.totalInstances = undefined;

      // Mode-specific loop handling
      if (options.strategy === 'latest') {
        // In latest mode, prioritize showing termination over loop containment
        ganttElement.isLoop = timing.isLoopCut ? false : timing.isLoop;
      } else {
        // Earliest mode uses regular loop status
        ganttElement.isLoop = timing.isLoop;
      }

      // Common properties
      // Special handling for boundary events: look up attached element's hierarchy level
      if (ganttElement.isBoundaryEvent && ganttElement.attachedToId) {
        timing.attachedElementHierarchyLevel = getAttachedElementHierarchyLevel(
          ganttElement.attachedToId,
          pathTimings,
          elementMap,
        );
      }
      assignCommonElementProperties(ganttElement, timing);

      // Keep exact parent instance ID - this is handled correctly later in assignCommonElementProperties

      // Add ghost occurrences if enabled and there are multiple occurrences
      if (options.showGhostElements && timingInstances.length > 1) {
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

  return { ganttElements, instanceToComponent };
}

/**
 * Assign common properties shared across all processing modes
 */
function assignCommonElementProperties(ganttElement: GanttElementType, timing: any): void {
  ganttElement.isPathCutoff = timing.isPathCutoff;
  ganttElement.isLoop = timing.isLoop;
  ganttElement.isLoopCut = timing.isLoopCut;
  ganttElement.hierarchyLevel = timing.hierarchyLevel;

  // CRITICAL: For sub-process children, use the exact parent instance ID from path traversal
  // The path traversal already determined the correct parent-child relationships
  if (timing.parentSubProcessId) {
    ganttElement.parentSubProcessId = timing.parentSubProcessId;
  }

  // Special handling for boundary events: they should inherit hierarchy level from their attached element
  if (
    ganttElement.isBoundaryEvent &&
    ganttElement.attachedToId &&
    timing.attachedElementHierarchyLevel !== undefined
  ) {
    ganttElement.hierarchyLevel = timing.attachedElementHierarchyLevel;
  }
}

/**
 * Create gantt element from BPMN element and timing information
 * Uses the consolidated element transformer factory for unified transformation
 */
function createGanttElement(
  element: BPMNFlowElement,
  timing: any,
  color: string | undefined,
  renderGateways: boolean,
): GanttElementType | null {
  if (timing.isExpandedSubProcess) {
    return transformExpandedSubProcess(
      element,
      timing.startTime,
      timing.duration,
      timing.hierarchyLevel || 0,
      timing.parentSubProcessId,
      true, // hasChildren - assume true for expanded sub-processes
      color,
    );
  }

  // Gateways are always processed for flow logic - renderGateways only affects visual rendering

  // Use the unified transformer factory for all other elements
  return defaultElementTransformerFactory.transform(
    element,
    timing.startTime,
    timing.duration,
    color,
    { timing },
  );
}
