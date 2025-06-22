/**
 * TypeScript interfaces for BPMN timeline transformation
 */

import type { GanttElementType, GanttDependency } from '@/components/gantt-chart-canvas/types';

// ============================================================================
// BPMN Element Interfaces
// ============================================================================

// Base types for all BPMN elements
export interface BPMNBaseElement {
  $type: string;
  id: string;
  name?: string;
  documentation?: Array<{ $type: string; text?: string }>;
  extensionElements?: BPMNExtensionElements;
}

export interface BPMNExtensionElements {
  $type: 'bpmn:ExtensionElements';
  values: Array<{
    $type: string;
    $children?: Array<{
      $type: string;
      name?: string;
      $body?: string;
    }>;
  }>;
}

// Main structure
export interface BPMNDefinitions {
  $type: 'bpmn:Definitions';
  id: string;
  name?: string;
  rootElements: BPMNProcess[];
  diagrams?: any[];
}

export interface BPMNProcess {
  $type: 'bpmn:Process';
  id: string;
  name?: string;
  isExecutable?: boolean;
  flowElements: BPMNFlowElement[];
  extensionElements?: BPMNExtensionElements;
}

// Flow elements union type
export type BPMNFlowElement = BPMNTask | BPMNSequenceFlow | BPMNEvent | BPMNGateway | BPMNSubProcess;

// Task types
export interface BPMNTask extends BPMNBaseElement {
  $type: 'bpmn:Task' | 'bpmn:ManualTask' | 'bpmn:UserTask' | 'bpmn:ServiceTask' | 
         'bpmn:ScriptTask' | 'bpmn:BusinessRuleTask' | 'bpmn:SendTask' | 'bpmn:ReceiveTask' |
         'bpmn:CallActivity';
  incoming?: string[];
  outgoing?: string[];
  loopCharacteristics?: {
    $type: 'bpmn:StandardLoopCharacteristics' | 'bpmn:MultiInstanceLoopCharacteristics';
    isSequential?: boolean;
  };
}

// Sequence Flow
export interface BPMNSequenceFlow extends BPMNBaseElement {
  $type: 'bpmn:SequenceFlow';
  sourceRef: string | any; // Can be string or ModdleElement with id property
  targetRef: string | any; // Can be string or ModdleElement with id property
  conditionExpression?: any;
}

// Events
export interface BPMNEvent extends BPMNBaseElement {
  $type: 'bpmn:StartEvent' | 'bpmn:EndEvent' | 'bpmn:IntermediateThrowEvent' | 
         'bpmn:IntermediateCatchEvent' | 'bpmn:BoundaryEvent';
  incoming?: string[];
  outgoing?: string[];
  eventDefinitions?: Array<{
    $type: 'bpmn:MessageEventDefinition' | 'bpmn:TimerEventDefinition' | 'bpmn:SignalEventDefinition' |
           'bpmn:ErrorEventDefinition' | 'bpmn:EscalationEventDefinition' | 'bpmn:CancelEventDefinition' |
           'bpmn:CompensateEventDefinition' | 'bpmn:ConditionalEventDefinition' | 'bpmn:LinkEventDefinition' |
           'bpmn:TerminateEventDefinition';
  }>;
}

// Gateways (for future implementation)
export interface BPMNGateway extends BPMNBaseElement {
  $type: 'bpmn:ExclusiveGateway' | 'bpmn:InclusiveGateway' | 'bpmn:ParallelGateway' | 
         'bpmn:ComplexGateway' | 'bpmn:EventBasedGateway';
  incoming?: string[];
  outgoing?: string[];
}

// SubProcess (for future implementation)
export interface BPMNSubProcess extends BPMNBaseElement {
  $type: 'bpmn:SubProcess' | 'bpmn:AdHocSubProcess';
  incoming?: string[];
  outgoing?: string[];
  flowElements: BPMNFlowElement[];
}

// ============================================================================
// Transformation State Interfaces
// ============================================================================

export interface TransformationError {
  elementId: string;
  elementType: string;
  elementName?: string;
  reason: string;
}

export interface DefaultDurationInfo {
  elementId: string;
  elementType: string;
  elementName?: string;
  appliedDuration: number;
  durationType: 'task' | 'event' | 'sequenceFlow';
}

export interface ElementTiming {
  elementId: string;
  startTime: number;
  endTime: number;
  duration: number;
}

export interface TransformationResult {
  elements: GanttElementType[];
  dependencies: GanttDependency[];
  errors: TransformationError[];
  defaultDurations: DefaultDurationInfo[];
}

// ============================================================================
// Component Props
// ============================================================================

export type BPMNTimelineProps = React.HTMLAttributes<HTMLDivElement> & {
  process: { name: string; id: string; bpmn: string };
};

// ============================================================================
// Constants
// ============================================================================

export const DEFAULT_DURATIONS = {
  task: 3600000,      // 1 hour in milliseconds
  event: 0,           // 0 ms
  sequenceFlow: 0     // 0 ms
} as const;