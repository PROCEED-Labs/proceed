/**
 * Boundary event dependency utilities for mode handlers
 *
 * This module consolidates the boundary event dependency creation pattern that was
 * duplicated across all three mode handlers (Every, Latest, Earliest).
 *
 * The pattern includes:
 * - Creating boundary event dependencies (task → boundary event connections)
 * - Creating boundary event outgoing dependencies (boundary event → next element connections)
 * - Adding both dependency types to the main dependencies array
 */

import type { GanttElementType, GanttDependency } from '@/components/gantt-chart-canvas/types';
import { DependencyType } from '@/components/gantt-chart-canvas/types';
import type { BPMNFlowElement, BPMNEvent } from '../types/types';
import { getBaseElementId } from '../utils/id-helpers';
import { extractTargetId } from '../utils/reference-extractor';
import { isBoundaryEventElement } from '../utils/utils';
import { createBoundaryEventDependency } from '../transformers/element-transformers';

/**
 * Create boundary event dependencies for all boundary events
 *
 * This function was originally duplicated in mode-handlers.ts and is moved here
 * as part of the boundary event dependency pattern consolidation.
 */
function createBoundaryEventDependencies(
  ganttElements: GanttElementType[],
  supportedElements: BPMNFlowElement[],
): GanttDependency[] {
  const boundaryDependencies: GanttDependency[] = [];
  ganttElements.forEach((ganttElement) => {
    // Check if this is a boundary event
    if ((ganttElement as any).isBoundaryEvent && (ganttElement as any).attachedToId) {
      const attachedToId = (ganttElement as any).attachedToId;
      // Find the boundary event element to get its properties
      const boundaryEventElement = supportedElements.find(
        (el) => el.id === ganttElement.id,
      ) as BPMNEvent;
      const isInterrupting = (ganttElement as any).cancelActivity !== false; // Default to true if not specified
      // Find the attached task element to get its name
      const attachedElement = supportedElements.find((el) => el.id === attachedToId);
      // The attachedToId should already be set to the correct task instance
      // after our boundary event mapping update in transform.ts
      let actualTaskId = attachedToId;

      // Verify the task exists in the gantt elements
      const attachedTaskExists = ganttElements.some((el) => el.id === attachedToId);

      if (!attachedTaskExists) {
        // Fallback: try to find a task with matching base ID
        const baseTaskId = attachedToId.includes('_instance_')
          ? attachedToId.split('_instance_')[0]
          : attachedToId;
        const attachedTaskGanttElement = ganttElements.find(
          (el) => el.id === baseTaskId || el.id.startsWith(baseTaskId + '_instance_'),
        );
        actualTaskId = attachedTaskGanttElement?.id || attachedToId;
      }

      // Create the visual dependency
      const dependency = createBoundaryEventDependency(
        ganttElement.id,
        actualTaskId,
        isInterrupting,
        attachedElement?.name || `Attached to ${attachedToId}`,
      );
      boundaryDependencies.push(dependency);
    }
  });
  return boundaryDependencies;
}

/**
 * Create boundary event outgoing dependencies
 *
 * This function was originally duplicated in mode-handlers.ts and handles
 * dependencies from boundary events to subsequent elements in the process flow.
 */
function createBoundaryEventOutgoingDependencies(
  ganttElements: GanttElementType[],
  supportedElements: BPMNFlowElement[],
): GanttDependency[] {
  const outgoingDependencies: GanttDependency[] = [];
  // Find all boundary events that have outgoing flows
  const boundaryEventsWithOutgoing = supportedElements.filter(
    (el) => isBoundaryEventElement(el) && (el as any).outgoing && (el as any).outgoing.length > 0,
  ) as BPMNEvent[];
  boundaryEventsWithOutgoing.forEach((boundaryEvent) => {
    // Process each outgoing flow
    (boundaryEvent as any).outgoing?.forEach((flow: any) => {
      const flowId = typeof flow === 'string' ? flow : flow.id;
      const sequenceFlow = supportedElements.find((el) => el.id === flowId) as any;
      if (!sequenceFlow || sequenceFlow.$type !== 'bpmn:SequenceFlow') {
        return;
      }
      const targetId = extractTargetId(sequenceFlow.targetRef);
      if (!targetId) {
        return;
      }
      // Check if target element exists in gantt elements
      // First look for loop instances, then boundary-specific instances
      let targetElement = ganttElements.find(
        (el) =>
          el.id === targetId ||
          el.id.startsWith(targetId + '_instance_') ||
          getBaseElementId(el.id) === targetId,
      );
      // If no loop instance found, look for boundary-specific instance
      if (!targetElement) {
        const expectedUniqueId = `${targetId}_from_boundary_${boundaryEvent.id}_${flowId}`;
        targetElement = ganttElements.find((el) => el.id === expectedUniqueId);
      }
      if (!targetElement) {
        return;
      }
      // Find all boundary event gantt elements (may have multiple instances)
      const boundaryGanttElements = ganttElements.filter(
        (el) => el.id === boundaryEvent.id || el.id.includes(`_boundary_${boundaryEvent.id}`),
      );
      // Create dependencies from each boundary event instance to target elements
      boundaryGanttElements.forEach((boundaryGanttElement, boundaryIndex) => {
        // For targets that might have multiple instances, find the appropriate target
        const targetBaseId = getBaseElementId(targetElement.id);
        const isLoopInstance = targetElement.id.includes('_instance_');
        if (isLoopInstance) {
          // Find all instances of this element
          const allInstances = ganttElements.filter(
            (el) => getBaseElementId(el.id) === targetBaseId && el.id.includes('_instance_'),
          );
          // For boundary events, target the first instance that starts after the boundary event
          const sortedInstances = allInstances.sort((a, b) => a.start - b.start);
          const targetInstance = sortedInstances.find(
            (instance) => instance.start >= boundaryGanttElement.start,
          );
          if (targetInstance) {
            const dependency: GanttDependency = {
              id: `${boundaryGanttElement.id}_to_${targetInstance.id}_${flowId}`,
              sourceId: boundaryGanttElement.id,
              targetId: targetInstance.id,
              type: DependencyType.FINISH_TO_START,
              name: sequenceFlow.name || `Flow from ${boundaryEvent.id}`,
              flowType: 'boundary',
            };
            outgoingDependencies.push(dependency);
          }
        } else {
          // Single instance target
          const dependency: GanttDependency = {
            id: `${boundaryGanttElement.id}_to_${targetElement.id}_${flowId}`,
            sourceId: boundaryGanttElement.id,
            targetId: targetElement.id,
            type: DependencyType.FINISH_TO_START,
            name: sequenceFlow.name || `Flow from ${boundaryEvent.id}`,
            flowType: 'boundary',
          };
          outgoingDependencies.push(dependency);
        }
      });
    });
  });
  return outgoingDependencies;
}

/**
 * Add all boundary event dependencies to the main dependencies array
 *
 * This consolidates the identical pattern that was duplicated across
 * handleEveryOccurrenceMode, handleLatestOccurrenceMode, and handleEarliestOccurrenceMode.
 *
 * @param ganttDependencies - Main dependencies array to add to
 * @param ganttElements - Array of gantt elements
 * @param supportedElements - Array of supported BPMN elements
 */
export function addBoundaryEventDependencies(
  ganttDependencies: GanttDependency[],
  ganttElements: GanttElementType[],
  supportedElements: BPMNFlowElement[],
): void {
  // Add boundary event dependencies (task → boundary event connections)
  const boundaryDependencies = createBoundaryEventDependencies(ganttElements, supportedElements);
  ganttDependencies.push(...boundaryDependencies);

  // Add boundary event outgoing dependencies (boundary event → next element connections)
  const outgoingDependencies = createBoundaryEventOutgoingDependencies(
    ganttElements,
    supportedElements,
  );
  ganttDependencies.push(...outgoingDependencies);
}
