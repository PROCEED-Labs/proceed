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
import { applyLoopStatus } from '../utils/loop-helpers';
import {
  parseInstanceId,
  getBaseElementId,
  extractSourceId,
  extractTargetId,
} from '../utils/id-helpers';

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
 * Transfer loop cut status from hidden gateway instances to previous non-gateway elements
 */
function transferLoopCutFromGateways(
  pathTimings: Map<string, any[]>,
  supportedElements: BPMNFlowElement[],
  renderGateways: boolean,
): void {
  if (renderGateways) return; // No need to transfer if gateways are visible

  pathTimings.forEach((timingInstances, elementId) => {
    const element = supportedElements.find((el) => el.id === elementId);
    if (element && element.$type !== 'bpmn:SequenceFlow' && isGatewayElement(element)) {
      // This is a gateway - check if any instances have loop cut
      timingInstances.forEach((gatewayTiming) => {
        if (gatewayTiming.isLoopCut) {
          // Find the previous non-gateway element in the path that should show the loop cut
          // Look through all elements to find the one with the highest instance number that's not a gateway
          let previousElement = null;
          let previousTiming = null;
          let maxInstanceNumber = 0;

          pathTimings.forEach((otherTimingInstances, otherElementId) => {
            const otherElement = supportedElements.find((el) => el.id === otherElementId);
            if (
              otherElement &&
              otherElement.$type !== 'bpmn:SequenceFlow' &&
              !isGatewayElement(otherElement)
            ) {
              otherTimingInstances.forEach((otherTiming) => {
                // Extract instance numbers using utility function
                const { instanceNumber } = parseInstanceId(otherTiming.instanceId);
                const { instanceNumber: gatewayInstanceNumber } = parseInstanceId(
                  gatewayTiming.instanceId,
                );

                if (instanceNumber > maxInstanceNumber && instanceNumber < gatewayInstanceNumber) {
                  maxInstanceNumber = instanceNumber;
                  previousElement = otherElement;
                  previousTiming = otherTiming;
                }
              });
            }
          });

          if (previousTiming) {
            (previousTiming as any).isLoopCut = true;
            (previousTiming as any).isLoop = false; // Prioritize loop cut over loop
          }
        }
      });
    }
  });
}

/**
 * Calculate boundary event timing based on their attached tasks
 */
function calculateBoundaryEventTiming(
  boundaryEvent: BPMNEvent,
  attachedTaskTiming: any,
  supportedElements: BPMNFlowElement[],
  defaultDurations: any[],
): { startTime: number; duration: number } {
  const attachedTask = supportedElements.find(
    (el) => extractSourceId(boundaryEvent.attachedToRef) === el.id,
  );

  if (!attachedTask || !attachedTaskTiming) {
    // Fallback: place at the start of the process
    return { startTime: attachedTaskTiming?.startTime || 0, duration: 0 };
  }

  // Get boundary event duration
  const boundaryEventDuration = extractDuration(boundaryEvent);

  let startTime: number;

  if (boundaryEventDuration > 0) {
    // If boundary event has duration, position at task start + event duration
    startTime = attachedTaskTiming.startTime + boundaryEventDuration;
  } else {
    // If no duration, position at the horizontal center of the task
    const taskDuration = attachedTaskTiming.endTime - attachedTaskTiming.startTime;
    startTime = attachedTaskTiming.startTime + taskDuration / 2;
  }

  return { startTime, duration: boundaryEventDuration };
}

/**
 * Process boundary events and add them to the gantt elements with proper timing
 * Creates only one boundary event per attached task (not per task instance)
 */
function processBoundaryEvents(
  ganttElements: GanttElementType[],
  pathTimings: Map<string, any[]>,
  supportedElements: BPMNFlowElement[],
  defaultDurations: any[],
  elementColors: Map<string, string>,
  originalElementToComponent: Map<string, number>,
  instanceToComponent: Map<string, number>,
): void {
  // Find all boundary events in supported elements
  const boundaryEvents = supportedElements.filter((el) =>
    isBoundaryEventElement(el),
  ) as BPMNEvent[];

  boundaryEvents.forEach((boundaryEvent) => {
    const attachedToId = extractSourceId(boundaryEvent.attachedToRef);
    if (!attachedToId) {
      return;
    }

    // Find timing for the attached task
    const attachedTaskTimings = pathTimings.get(attachedToId);
    if (!attachedTaskTimings || attachedTaskTimings.length === 0) {
      return;
    }

    // Use the first/primary task timing for the boundary event
    const primaryTaskTiming = attachedTaskTimings[0];

    const { startTime, duration } = calculateBoundaryEventTiming(
      boundaryEvent,
      primaryTaskTiming,
      supportedElements,
      defaultDurations,
    );

    // Transform to gantt element
    const elementColor = elementColors.get(boundaryEvent.id);
    const ganttElement = transformBoundaryEvent(boundaryEvent, startTime, duration, elementColor);

    if (ganttElement) {
      // Use the original boundary event ID (not instance-based)
      ganttElement.id = boundaryEvent.id;
      ganttElement.instanceNumber = undefined;
      ganttElement.totalInstances = undefined;
      ganttElement.isPathCutoff = primaryTaskTiming.isPathCutoff;
      ganttElement.isLoop = primaryTaskTiming.isLoop;
      ganttElement.isLoopCut = primaryTaskTiming.isLoopCut;

      ganttElements.push(ganttElement);

      // Map to its original element's component (same as attached task)
      const originalComponent = originalElementToComponent.get(attachedToId) || 0;
      instanceToComponent.set(ganttElement.id, originalComponent);
    }
  });
}

/**
 * Process boundary events for latest/earliest occurrence modes (single instance per element)
 */
function processBoundaryEventsForSingleInstance(
  ganttElements: GanttElementType[],
  elementToLatestOrEarliestTiming: Map<string, any>,
  supportedElements: BPMNFlowElement[],
  defaultDurations: any[],
  elementColors: Map<string, string>,
  originalElementToComponent: Map<string, number>,
  instanceToComponent: Map<string, number>,
  showGhostElements: boolean,
  pathTimings: Map<string, any[]>,
): void {
  // Find all boundary events in supported elements
  const boundaryEvents = supportedElements.filter((el) =>
    isBoundaryEventElement(el),
  ) as BPMNEvent[];

  boundaryEvents.forEach((boundaryEvent) => {
    const attachedToId = extractSourceId(boundaryEvent.attachedToRef);
    if (!attachedToId) return;

    // Find timing for the attached task
    const attachedTaskTiming = elementToLatestOrEarliestTiming.get(attachedToId);
    if (!attachedTaskTiming) return;

    const { startTime, duration } = calculateBoundaryEventTiming(
      boundaryEvent,
      attachedTaskTiming,
      supportedElements,
      defaultDurations,
    );

    // Transform to gantt element
    const elementColor = elementColors.get(boundaryEvent.id);
    const ganttElement = transformBoundaryEvent(boundaryEvent, startTime, duration, elementColor);

    if (ganttElement) {
      // Use original element ID for single instance modes
      ganttElement.id = boundaryEvent.id;
      ganttElement.instanceNumber = undefined;
      ganttElement.totalInstances = undefined;
      ganttElement.isPathCutoff = attachedTaskTiming.isPathCutoff;
      ganttElement.isLoop = attachedTaskTiming.isLoop;
      ganttElement.isLoopCut = attachedTaskTiming.isLoopCut;

      // Add ghost occurrences if enabled and there are multiple occurrences
      if (showGhostElements) {
        const allTimingInstances = pathTimings.get(attachedToId) || [];
        if (allTimingInstances.length > 1) {
          ganttElement.ghostOccurrences = allTimingInstances
            .filter((t) => t.instanceId !== attachedTaskTiming.instanceId)
            .map((t) => {
              const { startTime: ghostStart, duration: ghostDuration } =
                calculateBoundaryEventTiming(boundaryEvent, t, supportedElements, defaultDurations);
              return {
                start: ghostStart,
                end: ghostDuration > 0 ? ghostStart + ghostDuration : undefined,
                instanceId: `${boundaryEvent.id}_instance_ghost_${t.instanceId}`,
              };
            });
        }
      }

      ganttElements.push(ganttElement);

      // Map to same component as attached task
      const originalComponent = originalElementToComponent.get(attachedToId) || 0;
      instanceToComponent.set(ganttElement.id, originalComponent);
    }
  });
}

/**
 * Process elements reachable through boundary event outgoing flows
 */
function processBoundaryEventReachableElements(
  ganttElements: GanttElementType[],
  supportedElements: BPMNFlowElement[],
  allTimings: Map<string, any[]>,
  defaultDurations: DefaultDurationInfo[],
  elementColors: Map<string, string>,
  originalElementToComponent: Map<string, number>,
  instanceToComponent: Map<string, number>,
): void {
  // Find all boundary events that have outgoing flows
  const boundaryEventsWithOutgoing = supportedElements.filter(
    (el) => isBoundaryEventElement(el) && (el as any).outgoing && (el as any).outgoing.length > 0,
  ) as BPMNEvent[];

  boundaryEventsWithOutgoing.forEach((boundaryEvent) => {
    // Find the boundary event's gantt element to get its timing
    const boundaryGanttElement = ganttElements.find((el) => el.id === boundaryEvent.id);
    if (!boundaryGanttElement) {
      return;
    }

    // Calculate the boundary event trigger time (when outgoing flows start)
    // For boundary events, outgoing flows start at the event position, not after its duration
    const boundaryCompletionTime = boundaryGanttElement.start;

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

      // First check if target element already exists as a loop instance
      const existingLoopInstances = ganttElements.filter((el) => {
        // Check for both exact ID match and instance pattern match
        return (
          el.id === targetId ||
          el.id.startsWith(targetId + '_instance_') ||
          getBaseElementId(el.id) === targetId
        );
      });

      // Calculate the new start time for the boundary event flow
      const flowDuration = extractDuration(sequenceFlow) || 0;
      const newStartTime = boundaryCompletionTime + flowDuration;

      if (existingLoopInstances.length > 0) {
        // Update timing for existing loop instances if boundary event triggers later
        const existingTimings = allTimings.get(targetId);
        if (existingTimings && existingTimings.length > 0) {
          existingTimings.forEach((timing: any) => {
            if (timing.startTime < newStartTime) {
              const duration = timing.endTime - timing.startTime;
              timing.startTime = newStartTime;
              timing.endTime = newStartTime + duration;

              // Also update the corresponding gantt element
              const correspondingGanttElement = ganttElements.find(
                (el) =>
                  el.id === timing.instanceId ||
                  (el.id.startsWith(targetId) && el.start === timing.startTime),
              );
              if (correspondingGanttElement) {
                correspondingGanttElement.start = newStartTime;
                correspondingGanttElement.end = newStartTime + duration;
              }
            }
          });
        }
        // Don't create a new element - the loop instances already exist
      } else {
        // No existing instances found, check for boundary-specific instance
        const uniqueInstanceId = `${targetId}_from_boundary_${boundaryEvent.id}_${flowId}`;
        const existingBoundaryInstance = ganttElements.find((el) => el.id === uniqueInstanceId);

        if (existingBoundaryInstance) {
          // This specific boundary instance already exists, update timing if needed
          const existingTimings = allTimings.get(targetId);
          if (existingTimings && existingTimings.length > 0) {
            existingTimings.forEach((timing: any) => {
              if (timing.startTime < newStartTime) {
                const duration = timing.endTime - timing.startTime;
                timing.startTime = newStartTime;
                timing.endTime = newStartTime + duration;
              }
            });
          }
        } else {
          // Element doesn't exist, create it
          const targetElement = supportedElements.find((el) => el.id === targetId);

          if (
            !targetElement ||
            targetElement.$type === 'bpmn:SequenceFlow' ||
            isBoundaryEventElement(targetElement)
          ) {
            return;
          }

          // Calculate timing for the new element
          const flowDuration = extractDuration(sequenceFlow) || 0;
          const startTime = boundaryCompletionTime + flowDuration;

          // Get element duration
          let elementDuration = extractDuration(targetElement);
          if (
            elementDuration === 0 &&
            (isTaskElement(targetElement) || isSupportedEventElement(targetElement))
          ) {
            if (isTaskElement(targetElement)) {
              elementDuration = 3600000; // 1 hour default
              defaultDurations.push({
                elementId: targetElement.id,
                elementType: targetElement.$type,
                elementName: targetElement.name,
                appliedDuration: elementDuration,
                durationType: 'task',
              });
            }
          }

          const endTime = startTime + elementDuration;

          // Create timing entry
          if (!allTimings.has(targetId)) {
            allTimings.set(targetId, []);
          }
          allTimings.get(targetId)!.push({
            elementId: targetId,
            startTime,
            endTime,
            duration: elementDuration,
            instanceId: `${targetId}_boundary_instance`,
          });

          // Create gantt element
          const elementColor = elementColors.get(targetId);
          let ganttElement: GanttElementType | undefined;

          if (isTaskElement(targetElement)) {
            ganttElement = transformTask(
              targetElement as any,
              startTime,
              elementDuration,
              elementColor,
            );
          } else if (isSupportedEventElement(targetElement)) {
            ganttElement = transformEvent(
              targetElement as any,
              startTime,
              elementDuration,
              elementColor,
            );
          } else if (isGatewayElement(targetElement)) {
            ganttElement = transformGateway(
              targetElement as any,
              startTime,
              elementDuration,
              elementColor,
            );
          }

          if (ganttElement) {
            // Use the unique instance ID for boundary event targets
            ganttElement.id = uniqueInstanceId;
            ganttElements.push(ganttElement);

            // Map to component
            const originalComponent = originalElementToComponent.get(targetId) || 0;
            instanceToComponent.set(ganttElement.id, originalComponent);
          }
        }
      }
    });
  });
}

/**
 * Process boundary event outgoing flows and update subsequent element timings
 */
function processBoundaryEventOutgoingFlows(
  ganttElements: GanttElementType[],
  supportedElements: BPMNFlowElement[],
  allTimings: Map<string, any[]>,
  defaultDurations: DefaultDurationInfo[],
): void {
  // Find all boundary events that have outgoing flows
  const boundaryEventsWithOutgoing = supportedElements.filter(
    (el) => isBoundaryEventElement(el) && (el as any).outgoing && (el as any).outgoing.length > 0,
  ) as BPMNEvent[];

  boundaryEventsWithOutgoing.forEach((boundaryEvent) => {
    // Find the boundary event's gantt element to get its timing
    const boundaryGanttElement = ganttElements.find((el) => el.id === boundaryEvent.id);
    if (!boundaryGanttElement) return;

    // Calculate the boundary event trigger time (when outgoing flows start)
    // For boundary events, outgoing flows start at the event position, not after its duration
    const boundaryCompletionTime = boundaryGanttElement.start;

    // Process each outgoing flow
    (boundaryEvent as any).outgoing?.forEach((flow: any) => {
      const flowId = typeof flow === 'string' ? flow : flow.id;
      const sequenceFlow = supportedElements.find((el) => el.id === flowId) as any;
      if (!sequenceFlow || sequenceFlow.$type !== 'bpmn:SequenceFlow') return;

      const targetId = extractTargetId(sequenceFlow.targetRef);
      if (!targetId) return;

      // Find existing timing for the target element
      const existingTimings = allTimings.get(targetId);
      if (!existingTimings || existingTimings.length === 0) return;

      // Calculate flow duration
      const flowDuration = extractDuration(sequenceFlow) || 0;
      const newStartTime = boundaryCompletionTime + flowDuration;

      // Update target element timing if boundary event completion is later
      existingTimings.forEach((timing: any) => {
        if (timing.startTime < newStartTime) {
          const duration = timing.endTime - timing.startTime;
          timing.startTime = newStartTime;
          timing.endTime = newStartTime + duration;
        }
      });
    });
  });
}

/**
 * Process boundary event outgoing flows for single instance modes (latest/earliest)
 */
function processBoundaryEventOutgoingFlowsForSingleInstance(
  ganttElements: GanttElementType[],
  supportedElements: BPMNFlowElement[],
  elementTimings: Map<string, any>,
  defaultDurations: DefaultDurationInfo[],
): void {
  // Find all boundary events that have outgoing flows
  const boundaryEventsWithOutgoing = supportedElements.filter(
    (el) => isBoundaryEventElement(el) && (el as any).outgoing && (el as any).outgoing.length > 0,
  ) as BPMNEvent[];

  boundaryEventsWithOutgoing.forEach((boundaryEvent) => {
    // Find the boundary event's gantt element to get its timing
    const boundaryGanttElement = ganttElements.find((el) => el.id === boundaryEvent.id);
    if (!boundaryGanttElement) return;

    // Calculate the boundary event trigger time (when outgoing flows start)
    // For boundary events, outgoing flows start at the event position, not after its duration
    const boundaryCompletionTime = boundaryGanttElement.start;

    // Process each outgoing flow
    (boundaryEvent as any).outgoing?.forEach((flow: any) => {
      const flowId = typeof flow === 'string' ? flow : flow.id;
      const sequenceFlow = supportedElements.find((el) => el.id === flowId) as any;
      if (!sequenceFlow || sequenceFlow.$type !== 'bpmn:SequenceFlow') return;

      const targetId = extractTargetId(sequenceFlow.targetRef);
      if (!targetId) return;

      // Find existing timing for the target element
      const existingTiming = elementTimings.get(targetId);
      if (!existingTiming) return;

      // Calculate flow duration
      const flowDuration = extractDuration(sequenceFlow) || 0;
      const newStartTime = boundaryCompletionTime + flowDuration;

      // Update target element timing if boundary event completion is later
      if (existingTiming.startTime < newStartTime) {
        const duration = existingTiming.endTime - existingTiming.startTime;
        existingTiming.startTime = newStartTime;
        existingTiming.endTime = newStartTime + duration;
      }
    });
  });
}

/**
 * Process elements reachable through boundary event outgoing flows for single instance modes
 */
function processBoundaryEventReachableElementsForSingleInstance(
  ganttElements: GanttElementType[],
  supportedElements: BPMNFlowElement[],
  elementTimings: Map<string, any>,
  defaultDurations: DefaultDurationInfo[],
  elementColors: Map<string, string>,
  originalElementToComponent: Map<string, number>,
  instanceToComponent: Map<string, number>,
): void {
  // Find all boundary events that have outgoing flows
  const boundaryEventsWithOutgoing = supportedElements.filter(
    (el) => isBoundaryEventElement(el) && (el as any).outgoing && (el as any).outgoing.length > 0,
  ) as BPMNEvent[];

  boundaryEventsWithOutgoing.forEach((boundaryEvent) => {
    // Find the boundary event's gantt element to get its timing
    const boundaryGanttElement = ganttElements.find((el) => el.id === boundaryEvent.id);
    if (!boundaryGanttElement) return;

    // Calculate the boundary event trigger time (when outgoing flows start)
    // For boundary events, outgoing flows start at the event position, not after its duration
    const boundaryCompletionTime = boundaryGanttElement.start;

    // Process each outgoing flow
    (boundaryEvent as any).outgoing?.forEach((flow: any) => {
      const flowId = typeof flow === 'string' ? flow : flow.id;
      const sequenceFlow = supportedElements.find((el) => el.id === flowId) as any;
      if (!sequenceFlow || sequenceFlow.$type !== 'bpmn:SequenceFlow') return;

      const targetId = extractTargetId(sequenceFlow.targetRef);
      if (!targetId) return;

      // Check if target element already exists in gantt elements
      const existingGanttElement = ganttElements.find((el) => el.id === targetId);
      if (existingGanttElement) {
        // Element exists, just update its timing if needed
        const existingTiming = elementTimings.get(targetId);
        if (existingTiming) {
          const flowDuration = extractDuration(sequenceFlow) || 0;
          const newStartTime = boundaryCompletionTime + flowDuration;

          if (existingTiming.startTime < newStartTime) {
            const duration = existingTiming.endTime - existingTiming.startTime;
            existingTiming.startTime = newStartTime;
            existingTiming.endTime = newStartTime + duration;
          }
        }
      } else {
        // Element doesn't exist, create it
        const targetElement = supportedElements.find((el) => el.id === targetId);
        if (
          !targetElement ||
          targetElement.$type === 'bpmn:SequenceFlow' ||
          isBoundaryEventElement(targetElement)
        ) {
          return;
        }

        // Calculate timing for the new element
        const flowDuration = extractDuration(sequenceFlow) || 0;
        const startTime = boundaryCompletionTime + flowDuration;

        // Get element duration
        let elementDuration = extractDuration(targetElement);
        if (
          elementDuration === 0 &&
          (isTaskElement(targetElement) || isSupportedEventElement(targetElement))
        ) {
          if (isTaskElement(targetElement)) {
            elementDuration = 3600000; // 1 hour default
            defaultDurations.push({
              elementId: targetElement.id,
              elementType: targetElement.$type,
              elementName: targetElement.name,
              appliedDuration: elementDuration,
              durationType: 'task',
            });
          }
        }

        const endTime = startTime + elementDuration;

        // Create timing entry
        elementTimings.set(targetId, {
          elementId: targetId,
          startTime,
          endTime,
          duration: elementDuration,
        });

        // Create gantt element
        const elementColor = elementColors.get(targetId);
        let ganttElement: GanttElementType | undefined;

        if (isTaskElement(targetElement)) {
          ganttElement = transformTask(
            targetElement as any,
            startTime,
            elementDuration,
            elementColor,
          );
        } else if (isSupportedEventElement(targetElement)) {
          ganttElement = transformEvent(
            targetElement as any,
            startTime,
            elementDuration,
            elementColor,
          );
        } else if (isGatewayElement(targetElement)) {
          ganttElement = transformGateway(
            targetElement as any,
            startTime,
            elementDuration,
            elementColor,
          );
        }

        if (ganttElement) {
          ganttElements.push(ganttElement);

          // Map to component
          const originalComponent = originalElementToComponent.get(targetId) || 0;
          instanceToComponent.set(ganttElement.id, originalComponent);
        }
      }
    });
  });
}

/**
 * Create sequence flow dependencies for boundary event outgoing flows
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

          // Create a dependency to each instance from this boundary event instance
          allInstances.forEach((instance, index) => {
            const dependency: GanttDependency = {
              id: `${sequenceFlow.id}_from_${boundaryGanttElement.id}_to_instance_${index}`,
              sourceId: boundaryGanttElement.id,
              targetId: instance.id,
              type: DependencyType.FINISH_TO_START,
              name: sequenceFlow.name,
              flowType: getFlowType(sequenceFlow),
            };
            outgoingDependencies.push(dependency);
          });
        } else {
          // Single dependency for non-loop instances
          const dependency: GanttDependency = {
            id: `${sequenceFlow.id}_from_${boundaryGanttElement.id}`,
            sourceId: boundaryGanttElement.id,
            targetId: targetElement.id,
            type: DependencyType.FINISH_TO_START,
            name: sequenceFlow.name,
            flowType: getFlowType(sequenceFlow),
          };
          outgoingDependencies.push(dependency);
        }
      });
    });
  });

  return outgoingDependencies;
}

/**
 * Create boundary event dependencies for all boundary events
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

      // For boundary events with instance IDs, find the corresponding task instance
      // by matching timing - boundary events should be positioned within their task's timespan
      let actualTaskId = attachedToId;

      if (ganttElement.id.includes('_instance_')) {
        // Find all task instances for this attached element
        const taskInstances = ganttElements.filter(
          (el) => el.id === attachedToId || el.id.startsWith(attachedToId + '_instance_'),
        );

        // Find the task instance whose timespan contains this boundary event
        const matchingTaskInstance = taskInstances.find((task) => {
          if (!task.end) return false; // Skip if task has no end time

          const taskStart = task.start;
          const taskEnd = task.end;
          const boundaryStart = ganttElement.start;

          // Boundary event should be positioned within or at the task's timespan
          return boundaryStart >= taskStart && boundaryStart <= taskEnd;
        });

        if (matchingTaskInstance) {
          actualTaskId = matchingTaskInstance.id;
        }
      } else {
        // For non-instance boundary events, find the first matching task
        const attachedTaskGanttElement = ganttElements.find(
          (el) =>
            el.id === attachedToId || // Direct match for latest/earliest modes
            el.id.startsWith(attachedToId + '_instance_'), // Instance match for every-occurrence mode
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
): ModeHandlerResult {
  const ganttElements: GanttElementType[] = [];
  const ganttDependencies: GanttDependency[] = [];

  // Transfer loop cut status from hidden gateways
  transferLoopCutFromGateways(pathTimings, supportedElements, renderGateways);

  // Assign colors based on connected components using original elements
  const elementColors = assignFlowColors(originalElementsForColorAssignment);
  const originalElementToComponent = findConnectedComponents(originalElementsForColorAssignment);

  // Create map to track instance to component mapping
  const instanceToComponent = new Map<string, number>();

  // Create a flat list of all elements in execution order
  const allTimings: Array<{
    elementId: string;
    timing: any;
    element: BPMNFlowElement;
    color: string;
  }> = [];

  // Debug removed - keeping only essential logging

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
      // Add hierarchy information
      ganttElement.hierarchyLevel = timing.hierarchyLevel;
      ganttElement.parentSubProcessId = timing.parentSubProcessId;

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
      ganttDependencies.push(
        createGanttDependency(
          dep.flowId,
          dep.sourceInstanceId,
          dep.targetInstanceId,
          flow,
          'every',
          index,
        ),
      );
    }
  });

  // Add boundary event dependencies
  const boundaryDependencies = createBoundaryEventDependencies(ganttElements, supportedElements);
  ganttDependencies.push(...boundaryDependencies);

  // Add boundary event outgoing dependencies
  const outgoingDependencies = createBoundaryEventOutgoingDependencies(
    ganttElements,
    supportedElements,
  );
  ganttDependencies.push(...outgoingDependencies);

  // Populate child relationships for sub-processes
  populateSubProcessChildIds(ganttElements);

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
): ModeHandlerResult {
  const ganttElements: GanttElementType[] = [];
  const ganttDependencies: GanttDependency[] = [];

  // Transfer loop cut status from hidden gateways
  transferLoopCutFromGateways(pathTimings, supportedElements, renderGateways);

  // Assign colors based on connected components using original elements
  const elementColors = assignFlowColors(originalElementsForColorAssignment);
  const originalElementToComponent = findConnectedComponents(originalElementsForColorAssignment);

  // Create a map to find the latest instance of each element
  const elementToLatestTiming = new Map<string, any>();

  // Find the latest occurrence of each element and merge loop status from all instances
  pathTimings.forEach((timingInstances, elementId) => {
    if (timingInstances.length > 0) {
      const latestTiming = timingInstances.reduce((latest, current) =>
        current.startTime > latest.startTime ? current : latest,
      );

      // Apply merged loop status from all instances
      applyLoopStatus(latestTiming, timingInstances);

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
      // Add hierarchy information
      ganttElement.hierarchyLevel = timing.hierarchyLevel;
      ganttElement.parentSubProcessId = timing.parentSubProcessId;

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

  // Process boundary events and add them to gantt elements
  // Boundary events handled by path traversal - skipping duplicate processing

  // Process elements reachable through boundary event outgoing flows
  // Boundary event reachable elements handled by path traversal - skipping duplicate processing

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

  // Add boundary event dependencies
  const boundaryDependencies = createBoundaryEventDependencies(ganttElements, supportedElements);
  ganttDependencies.push(...boundaryDependencies);

  // Add boundary event outgoing dependencies
  const outgoingDependencies = createBoundaryEventOutgoingDependencies(
    ganttElements,
    supportedElements,
  );
  ganttDependencies.push(...outgoingDependencies);

  // Populate child relationships for sub-processes
  populateSubProcessChildIds(ganttElements);

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
): ModeHandlerResult {
  const ganttElements: GanttElementType[] = [];
  const ganttDependencies: GanttDependency[] = [];

  // Transfer loop cut status from hidden gateways
  transferLoopCutFromGateways(pathTimings, supportedElements, renderGateways);

  // Assign colors based on connected components using original elements
  const elementColors = assignFlowColors(originalElementsForColorAssignment);
  const originalElementToComponent = findConnectedComponents(originalElementsForColorAssignment);

  // Create a map to find the earliest instance of each element
  const elementToEarliestTiming = new Map<string, any>();

  // Find the earliest occurrence of each element and merge loop status from all instances
  pathTimings.forEach((timingInstances, elementId) => {
    if (timingInstances.length > 0) {
      const earliestTiming = timingInstances.reduce((earliest, current) =>
        current.startTime < earliest.startTime ? current : earliest,
      );

      // Apply merged loop status from all instances
      applyLoopStatus(earliestTiming, timingInstances);

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
      // Add hierarchy information
      ganttElement.hierarchyLevel = timing.hierarchyLevel;
      ganttElement.parentSubProcessId = timing.parentSubProcessId;

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

  // Boundary events are now handled by path traversal - no separate processing needed
  console.log(
    'MODE HANDLER DEBUG - Skipping separate boundary event processing (handled by path traversal)',
  );

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

  // Add boundary event dependencies
  const boundaryDependencies = createBoundaryEventDependencies(ganttElements, supportedElements);
  ganttDependencies.push(...boundaryDependencies);

  // Add boundary event outgoing dependencies
  const outgoingDependencies = createBoundaryEventOutgoingDependencies(
    ganttElements,
    supportedElements,
  );
  ganttDependencies.push(...outgoingDependencies);

  // Populate child relationships for sub-processes
  populateSubProcessChildIds(ganttElements);

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
  } else if (isTaskElement(element)) {
    // Handle collapsed sub-processes as regular tasks
    return transformTask(element as BPMNTask, timing.startTime, timing.duration, color);
  } else if (isBoundaryEventElement(element)) {
    // Use special boundary event transformer
    return transformBoundaryEvent(element as BPMNEvent, timing.startTime, timing.duration, color);
  } else if (isSupportedEventElement(element)) {
    return transformEvent(element as BPMNEvent, timing.startTime, timing.duration, color);
  } else if (isGatewayElement(element) && renderGateways) {
    return transformGateway(element as BPMNGateway, timing.startTime, timing.duration, color, true);
  }
  return null;
}

/**
 * Populate childIds for sub-process group elements
 */
function populateSubProcessChildIds(ganttElements: GanttElementType[]): void {
  // Find all sub-process elements
  const subProcessElements = ganttElements.filter((el) => (el as any).isSubProcess);

  subProcessElements.forEach((subProcess) => {
    // Get the base sub-process ID (without instance suffix)
    const baseSubProcessId = getBaseElementId(subProcess.id);

    // Find all child elements for this sub-process
    // Child elements have parentSubProcessId set to the base ID, not the instance ID
    const childElements = ganttElements.filter(
      (el) => (el as any).parentSubProcessId === baseSubProcessId && el.id !== subProcess.id,
    );

    if (subProcess.type === 'group') {
      (subProcess as any).childIds = childElements.map((child) => child.id);
      (subProcess as any).hasChildren = childElements.length > 0;
    }
  });
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
