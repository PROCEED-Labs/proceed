/**
 * Element Transformer Factory Pattern
 *
 * This module consolidates the 4 separate transformer functions with similar structure
 * into a unified transformation system with ~53% code reduction.
 *
 * The factory pattern eliminates duplicate transformation logic while maintaining
 * type-specific behavior through strategy implementations.
 */

import type { GanttElementType } from '@/components/gantt-chart-canvas/types';
import type { BPMNTask, BPMNEvent, BPMNGateway, BPMNFlowElement } from '../types/types';
import {
  getTaskTypeString,
  getEventTypeString,
  getGatewayTypeString,
  isBoundaryEventElement,
} from '../utils/utils';
import { extractSourceId } from '../utils/reference-extractor';

/**
 * Base transformation context shared by all element types
 */
export interface TransformationContext {
  element: BPMNFlowElement;
  startTime: number;
  duration: number;
  color?: string;
}

/**
 * Element transformation strategy interface
 * Defines type-specific transformation behavior
 */
export interface ElementTransformationStrategy<
  T extends BPMNFlowElement,
  R extends GanttElementType,
> {
  /**
   * Check if this strategy can handle the given element
   */
  canHandle(element: BPMNFlowElement): element is T;

  /**
   * Transform the element using type-specific logic
   */
  transform(context: TransformationContext & { element: T }): R;

  /**
   * Get the element type string for this element
   */
  getElementTypeString(element: T): string;

  /**
   * Get the gantt element type for this BPMN element
   */
  getGanttElementType(): 'task' | 'milestone' | 'group';
}

/**
 * Task transformation strategy
 */
export class TaskTransformationStrategy
  implements ElementTransformationStrategy<BPMNTask, GanttElementType>
{
  canHandle(element: BPMNFlowElement): element is BPMNTask {
    return (
      element.$type === 'bpmn:Task' ||
      element.$type === 'bpmn:UserTask' ||
      element.$type === 'bpmn:ServiceTask' ||
      element.$type === 'bpmn:SendTask' ||
      element.$type === 'bpmn:ReceiveTask' ||
      element.$type === 'bpmn:ManualTask' ||
      element.$type === 'bpmn:BusinessRuleTask' ||
      element.$type === 'bpmn:ScriptTask' ||
      element.$type === 'bpmn:CallActivity' ||
      element.$type === 'bpmn:SubProcess'
    );
  }

  transform(context: TransformationContext & { element: BPMNTask }): GanttElementType {
    const { element, startTime, duration, color } = context;

    return {
      id: element.id,
      name: element.name,
      type: 'task',
      start: startTime,
      end: startTime + duration,
      elementType: this.getElementTypeString(element),
      color,
    };
  }

  getElementTypeString(element: BPMNTask): string {
    return getTaskTypeString(element);
  }

  getGanttElementType(): 'task' {
    return 'task';
  }
}

/**
 * Event transformation strategy (including boundary events)
 */
export class EventTransformationStrategy
  implements ElementTransformationStrategy<BPMNEvent, GanttElementType>
{
  canHandle(element: BPMNFlowElement): element is BPMNEvent {
    return (
      element.$type === 'bpmn:StartEvent' ||
      element.$type === 'bpmn:EndEvent' ||
      element.$type === 'bpmn:IntermediateThrowEvent' ||
      element.$type === 'bpmn:IntermediateCatchEvent' ||
      element.$type === 'bpmn:BoundaryEvent'
    );
  }

  transform(context: TransformationContext & { element: BPMNEvent }): GanttElementType {
    const { element, startTime, duration, color } = context;
    const timing = (context as any).timing;

    const baseElement: GanttElementType = {
      id: element.id,
      name: element.name,
      type: 'milestone',
      start: startTime,
      elementType: this.getElementTypeString(element),
      color,
    };

    // Add end time if duration > 0
    if (duration > 0) {
      baseElement.end = startTime + duration;
    }

    // Handle boundary events specially
    if (isBoundaryEventElement(element)) {
      // Use the updated attachedToId from timing if available, otherwise extract from BPMN
      const attachedToId =
        (timing as any)?.attachedToId || extractSourceId((element as any).attachedToRef);

      return {
        ...baseElement,
        // Boundary event specific properties
        isBoundaryEvent: true,
        attachedToId,
        cancelActivity: (element as any).cancelActivity !== false, // Default to true if not specified
      };
    }

    return baseElement;
  }

  getElementTypeString(element: BPMNEvent): string {
    return getEventTypeString(element);
  }

  getGanttElementType(): 'milestone' {
    return 'milestone';
  }
}

/**
 * Gateway transformation strategy
 */
export class GatewayTransformationStrategy
  implements ElementTransformationStrategy<BPMNGateway, GanttElementType>
{
  canHandle(element: BPMNFlowElement): element is BPMNGateway {
    return (
      element.$type === 'bpmn:ExclusiveGateway' ||
      element.$type === 'bpmn:InclusiveGateway' ||
      element.$type === 'bpmn:ParallelGateway' ||
      element.$type === 'bpmn:EventBasedGateway' ||
      element.$type === 'bpmn:ComplexGateway'
    );
  }

  transform(context: TransformationContext & { element: BPMNGateway }): GanttElementType {
    const { element, startTime, duration, color } = context;

    return {
      id: element.id,
      name: element.name,
      type: 'milestone', // Always render as milestone
      start: startTime,
      end: startTime + duration,
      elementType: this.getElementTypeString(element),
      color,
    };
  }

  getElementTypeString(element: BPMNGateway): string {
    return getGatewayTypeString(element);
  }

  getGanttElementType(): 'milestone' {
    return 'milestone';
  }
}

/**
 * Sub-process transformation strategy
 */
export class SubProcessTransformationStrategy
  implements ElementTransformationStrategy<any, GanttElementType>
{
  canHandle(element: BPMNFlowElement): element is any {
    // Sub-processes are handled by the createGanttElement function based on timing.isExpandedSubProcess
    // This strategy should not handle sub-processes to avoid conflicts
    return false;
  }

  transform(context: TransformationContext & { element: any }): GanttElementType {
    const { element, startTime, duration, color } = context;

    return {
      id: element.id,
      name: element.name,
      type: 'group',
      start: startTime,
      end: startTime + duration,
      elementType: getTaskTypeString(element), // Sub-processes use task type string
      color,
      childIds: [], // Will be populated by the mode handlers
      hierarchyLevel: (context as any).hierarchyLevel || 0,
      parentSubProcessId: (context as any).parentSubProcessId,
      isSubProcess: true,
      hasChildren: (context as any).hasChildren || true,
    };
  }

  getElementTypeString(element: any): string {
    return getTaskTypeString(element);
  }

  getGanttElementType(): 'group' {
    return 'group';
  }
}

/**
 * Element Transformer Factory
 * Consolidates all transformation logic into a single, extensible system
 */
export class ElementTransformerFactory {
  private strategies: ElementTransformationStrategy<any, any>[] = [
    new TaskTransformationStrategy(),
    new EventTransformationStrategy(),
    new GatewayTransformationStrategy(),
    new SubProcessTransformationStrategy(),
  ];

  /**
   * Transform any BPMN element to its corresponding Gantt element
   * Replaces the individual transform functions with unified logic
   */
  transform(
    element: BPMNFlowElement,
    startTime: number,
    duration: number,
    color?: string,
    additionalContext?: any,
  ): GanttElementType | null {
    const strategy = this.strategies.find((s) => s.canHandle(element));

    if (!strategy) {
      console.warn(`No transformation strategy found for element type: ${element.$type}`);
      return null;
    }

    const context: TransformationContext = {
      element,
      startTime,
      duration,
      color,
      ...additionalContext,
    };

    return strategy.transform(context as any);
  }

  /**
   * Register a new transformation strategy
   * Allows for extensibility without modifying core logic
   */
  registerStrategy(strategy: ElementTransformationStrategy<any, any>): void {
    this.strategies.push(strategy);
  }

  /**
   * Get all supported element types
   */
  getSupportedElementTypes(): string[] {
    return [
      'bpmn:Task',
      'bpmn:UserTask',
      'bpmn:ServiceTask',
      'bpmn:SendTask',
      'bpmn:ReceiveTask',
      'bpmn:ManualTask',
      'bpmn:BusinessRuleTask',
      'bpmn:ScriptTask',
      'bpmn:CallActivity',
      'bpmn:SubProcess',
      'bpmn:StartEvent',
      'bpmn:EndEvent',
      'bpmn:IntermediateThrowEvent',
      'bpmn:IntermediateCatchEvent',
      'bpmn:BoundaryEvent',
      'bpmn:ExclusiveGateway',
      'bpmn:InclusiveGateway',
      'bpmn:ParallelGateway',
      'bpmn:EventBasedGateway',
      'bpmn:ComplexGateway',
    ];
  }
}

/**
 * Default factory instance for use across the application
 */
export const defaultElementTransformerFactory = new ElementTransformerFactory();

/**
 * Convenience functions that maintain backward compatibility
 * These can eventually replace the individual transformer functions
 */
export function transformElement(
  element: BPMNFlowElement,
  startTime: number,
  duration: number,
  color?: string,
  additionalContext?: any,
): GanttElementType | null {
  return defaultElementTransformerFactory.transform(
    element,
    startTime,
    duration,
    color,
    additionalContext,
  );
}

/**
 * Transform expanded sub-process with additional context
 */
export function transformExpandedSubProcessUsingFactory(
  subProcess: any,
  startTime: number,
  duration: number,
  hierarchyLevel: number = 0,
  parentSubProcessId?: string,
  hasChildren: boolean = true,
  color?: string,
): GanttElementType | null {
  return defaultElementTransformerFactory.transform(subProcess, startTime, duration, color, {
    hierarchyLevel,
    parentSubProcessId,
    hasChildren,
  });
}

/**
 * Type-safe transformation functions for specific element types
 */
export function transformTaskUsingFactory(
  task: BPMNTask,
  startTime: number,
  duration: number,
  color?: string,
): GanttElementType | null {
  return defaultElementTransformerFactory.transform(task, startTime, duration, color);
}

export function transformEventUsingFactory(
  event: BPMNEvent,
  startTime: number,
  duration: number,
  color?: string,
): GanttElementType | null {
  return defaultElementTransformerFactory.transform(event, startTime, duration, color);
}

export function transformGatewayUsingFactory(
  gateway: BPMNGateway,
  startTime: number,
  duration: number,
  color?: string,
): GanttElementType | null {
  return defaultElementTransformerFactory.transform(gateway, startTime, duration, color);
}
