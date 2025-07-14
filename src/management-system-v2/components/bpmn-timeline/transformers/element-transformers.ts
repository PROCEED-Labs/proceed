/**
 * BPMN Element Transformation Functions
 *
 * This module contains functions that transform individual BPMN elements
 * (tasks, events, sequence flows) into their corresponding Gantt chart representations.
 */

import type { GanttElementType, GanttDependency } from '@/components/gantt-chart-canvas/types';
import { DependencyType } from '@/components/gantt-chart-canvas/types';
import type {
  BPMNTask,
  BPMNEvent,
  BPMNSequenceFlow,
  BPMNGateway,
  BPMNFlowElement,
} from '../types/types';
import { getTaskTypeString, getEventTypeString, getGatewayTypeString } from '../utils/utils';

// ============================================================================
// Element Transformation Functions
// ============================================================================

/**
 * Transform BPMN task to Gantt task
 */
export function transformTask(
  task: BPMNTask,
  startTime: number,
  duration: number,
  color?: string,
): GanttElementType {
  return {
    id: task.id,
    name: task.name,
    type: 'task',
    start: startTime,
    end: startTime + duration,
    elementType: getTaskTypeString(task),
    color,
  };
}

/**
 * Transform BPMN event to Gantt milestone
 * Using Option A: Events positioned at the end of their duration (completion time)
 */
export function transformEvent(
  event: BPMNEvent,
  startTime: number,
  duration: number,
  color?: string,
): GanttElementType {
  if (duration > 0) {
    // Event has duration - show the time range with milestone at completion time
    // Option A: milestone appears at event completion time but shows the full range
    return {
      id: event.id,
      name: event.name,
      type: 'milestone',
      start: startTime,
      end: startTime + duration,
      elementType: getEventTypeString(event),
      color,
    };
  } else {
    // Event has no duration - point milestone at start time
    return {
      id: event.id,
      name: event.name,
      type: 'milestone',
      start: startTime,
      elementType: getEventTypeString(event),
      color,
    };
  }
}

/**
 * Transform BPMN gateway to Gantt milestone
 */
export function transformGateway(
  gateway: BPMNGateway,
  startTime: number,
  duration: number,
  color?: string,
): GanttElementType {
  return {
    id: gateway.id,
    name: gateway.name,
    type: 'milestone',
    start: startTime,
    end: startTime + duration,
    elementType: getGatewayTypeString(gateway),
    color,
  };
}

/**
 * Determine flow type based on BPMN properties
 */
export function getFlowType(flow: BPMNSequenceFlow): 'conditional' | 'default' | 'normal' {
  // Check if flow has a condition expression (conditional flow)
  if (flow.conditionExpression) {
    return 'conditional';
  }

  // Check if flow is marked as default (from gateway default sequence flow)
  // In BPMN, default flows are typically marked on the gateway's default property
  // but we can also check for specific naming patterns or attributes
  if (
    flow.name &&
    (flow.name.toLowerCase().includes('default') || flow.name.toLowerCase().includes('else'))
  ) {
    return 'default';
  }

  return 'normal';
}

/**
 * Transform BPMN sequence flow to Gantt dependency
 */
export function transformSequenceFlow(flow: BPMNSequenceFlow): GanttDependency {
  // Handle case where sourceRef/targetRef might be ModdleElement objects or strings
  const sourceId =
    typeof flow.sourceRef === 'string'
      ? flow.sourceRef
      : (flow.sourceRef as any)?.id || flow.sourceRef;
  const targetId =
    typeof flow.targetRef === 'string'
      ? flow.targetRef
      : (flow.targetRef as any)?.id || flow.targetRef;

  return {
    id: flow.id,
    sourceId: sourceId,
    targetId: targetId,
    type: DependencyType.FINISH_TO_START, // BPMN sequence flows are finish-to-start dependencies
    name: flow.name,
    flowType: getFlowType(flow),
  };
}

// ============================================================================
// Gateway Detection and Transformation Functions
// ============================================================================

/**
 * Check if an element is a gateway
 */
export function isGatewayElement(element: BPMNFlowElement): element is BPMNGateway {
  return (
    element.$type === 'bpmn:ExclusiveGateway' ||
    element.$type === 'bpmn:InclusiveGateway' ||
    element.$type === 'bpmn:ParallelGateway' ||
    element.$type === 'bpmn:ComplexGateway' ||
    element.$type === 'bpmn:EventBasedGateway'
  );
}

/**
 * Check if an element is an exclusive gateway (XOR)
 */
export function isExclusiveGateway(element: BPMNFlowElement): element is BPMNGateway {
  return element.$type === 'bpmn:ExclusiveGateway';
}

/**
 * Check if an element is a parallel gateway (AND)
 */
export function isParallelGateway(element: BPMNFlowElement): element is BPMNGateway {
  return element.$type === 'bpmn:ParallelGateway';
}
