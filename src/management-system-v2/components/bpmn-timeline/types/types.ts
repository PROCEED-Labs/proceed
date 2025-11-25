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
export interface BPMNCollaboration {
  $type: 'bpmn:Collaboration';
  id: string;
  name?: string;
  participants?: BPMNParticipant[];
  messageFlows?: BPMNMessageFlow[];
}

export interface BPMNMessageFlow {
  $type: 'bpmn:MessageFlow';
  id: string;
  name?: string;
  sourceRef: string | { id: string }; // Can reference element or participant
  targetRef: string | { id: string }; // Can reference element or participant
}

export interface BPMNParticipant {
  $type: 'bpmn:Participant';
  id: string;
  name?: string;
  processRef?: string | BPMNProcess; // Can be string reference or actual process object
}

export interface BPMNDefinitions {
  $type: 'bpmn:Definitions';
  id: string;
  name?: string;
  rootElements: (BPMNProcess | BPMNCollaboration)[];
  diagrams?: any[];
}

export interface BPMNProcess {
  $type: 'bpmn:Process';
  id: string;
  name?: string;
  isExecutable?: boolean;
  flowElements: BPMNFlowElement[];
  laneSets?: BPMNLaneSet[]; // bpmn-js moddle uses this (plural)
  extensionElements?: BPMNExtensionElements;
  artifacts?: BPMNInformationalArtifact[];
  associations?: BPMNAssociation[];
}

// Flow elements union type
export type BPMNFlowElement =
  | BPMNTask
  | BPMNSequenceFlow
  | BPMNEvent
  | BPMNGateway
  | BPMNSubProcess;

// Task types
export interface BPMNTask extends BPMNBaseElement {
  $type:
    | 'bpmn:Task'
    | 'bpmn:ManualTask'
    | 'bpmn:UserTask'
    | 'bpmn:ServiceTask'
    | 'bpmn:ScriptTask'
    | 'bpmn:BusinessRuleTask'
    | 'bpmn:SendTask'
    | 'bpmn:ReceiveTask'
    | 'bpmn:CallActivity';
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
  $type:
    | 'bpmn:StartEvent'
    | 'bpmn:EndEvent'
    | 'bpmn:IntermediateThrowEvent'
    | 'bpmn:IntermediateCatchEvent'
    | 'bpmn:BoundaryEvent';
  incoming?: string[];
  outgoing?: string[];
  // Boundary event specific properties
  attachedToRef?: string | any; // Reference to the activity this boundary event is attached to
  cancelActivity?: boolean; // Whether this boundary event interrupts the attached activity
  eventDefinitions?: Array<{
    $type:
      | 'bpmn:MessageEventDefinition'
      | 'bpmn:TimerEventDefinition'
      | 'bpmn:SignalEventDefinition'
      | 'bpmn:ErrorEventDefinition'
      | 'bpmn:EscalationEventDefinition'
      | 'bpmn:CancelEventDefinition'
      | 'bpmn:CompensateEventDefinition'
      | 'bpmn:ConditionalEventDefinition'
      | 'bpmn:LinkEventDefinition'
      | 'bpmn:TerminateEventDefinition';
  }>;
}

// Gateways (for future implementation)
export interface BPMNGateway extends BPMNBaseElement {
  $type:
    | 'bpmn:ExclusiveGateway'
    | 'bpmn:InclusiveGateway'
    | 'bpmn:ParallelGateway'
    | 'bpmn:ComplexGateway'
    | 'bpmn:EventBasedGateway';
  incoming?: string[];
  outgoing?: string[];
}

// SubProcess (including Transaction support)
export interface BPMNSubProcess extends BPMNBaseElement {
  $type: 'bpmn:SubProcess' | 'bpmn:AdHocSubProcess' | 'bpmn:Transaction';
  incoming?: string[];
  outgoing?: string[];
  flowElements: BPMNFlowElement[];
}

// ============================================================================
// Informational Artifacts (not part of flow execution)
// ============================================================================

export interface BPMNTextAnnotation extends BPMNBaseElement {
  $type: 'bpmn:TextAnnotation';
  text?: string;
  textFormat?: string;
}

export interface BPMNDataObject extends BPMNBaseElement {
  $type: 'bpmn:DataObject' | 'bpmn:DataObjectReference';
  dataState?: {
    $type: 'bpmn:DataState';
    name?: string;
  };
  itemSubjectRef?: string;
  dataObjectRef?: string; // For DataObjectReference elements
}

export interface BPMNDataStore extends BPMNBaseElement {
  $type: 'bpmn:DataStore' | 'bpmn:DataStoreReference';
  capacity?: number;
  isUnlimited?: boolean;
  itemSubjectRef?: string;
  dataStoreRef?: string | { id: string }; // For DataStoreReference elements
}

export interface BPMNGroup extends BPMNBaseElement {
  $type: 'bpmn:Group';
  categoryValueRef?: string;
}

export interface BPMNGenericResource extends BPMNBaseElement {
  $type: 'proceed:genericResource' | 'proceed:GenericResource';
  resourceType?: string;
}

export interface BPMNAssociation extends BPMNBaseElement {
  $type: 'bpmn:Association';
  sourceRef: string;
  targetRef: string;
  associationDirection?: 'None' | 'One' | 'Both';
}

// Union type for all informational artifacts
export type BPMNInformationalArtifact =
  | BPMNTextAnnotation
  | BPMNDataObject
  | BPMNDataStore
  | BPMNGroup
  | BPMNGenericResource;

// Extended artifact type with association information
export type BPMNInformationalArtifactWithAssociations = BPMNInformationalArtifact & {
  _associatedElements?: Array<{
    elementId: string;
    elementName?: string;
    elementType: string;
  }>;
};

// ============================================================================
// Transformation State Interfaces
// ============================================================================

export interface TransformationIssue {
  elementId: string;
  elementType: string;
  elementName?: string;
  reason: string;
  severity: 'error' | 'warning';
}

// Legacy alias for backward compatibility
export type TransformationError = TransformationIssue;

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
  // Optional properties for path-based traversal
  pathId?: string;
  instanceId?: string;
  isLoopInstance?: boolean;
  isPathCutoff?: boolean; // Indicates this element is where path traversal stopped due to loop depth
  isLoop?: boolean; // Indicates this element is part of a loop
  isLoopCut?: boolean; // Indicates this element is where loop was cut off
  // Hierarchy properties for sub-processes (all sub-processes are treated as expanded)
  hierarchyLevel?: number; // Indentation level (0 = root, 1 = first sub-process level, etc.)
  parentSubProcessId?: string; // ID of the parent sub-process if nested
  isExpandedSubProcess?: boolean; // True if this element is a sub-process (all sub-processes are treated as expanded)
}

export interface TransformationResult {
  elements: GanttElementType[];
  dependencies: GanttDependency[];
  issues: TransformationIssue[];
  defaultDurations: DefaultDurationInfo[];
  informationalArtifacts: BPMNInformationalArtifactWithAssociations[];
  // Legacy properties for backward compatibility
  errors: TransformationIssue[];
  warnings: TransformationIssue[];
}

// ============================================================================
// Lane Support Types
// ============================================================================

export interface BPMNLane extends BPMNBaseElement {
  $type: 'bpmn:Lane';
  flowNodeRef: string[]; // References to elements in this lane
  childLaneSet?: BPMNLaneSet; // For nested lanes
  partitionElement?: any; // Role/participant reference
}

export interface BPMNLaneSet extends BPMNBaseElement {
  $type: 'bpmn:LaneSet';
  lanes: BPMNLane[];
}

export interface LaneMetadata {
  laneId: string;
  laneName?: string;
  level: number; // 0 = top level, 1 = nested, etc.
  elementIds: string[]; // Element IDs in this lane
  childLanes: LaneMetadata[];
}

export interface ParticipantMetadata {
  participantId: string;
  participantName?: string;
  processId: string;
  processName?: string;
  elementIds: string[];
  laneHierarchy: LaneMetadata[];
}

// ============================================================================
// Component Props
// ============================================================================

export type BPMNTimelineProps = React.HTMLAttributes<HTMLDivElement> & {
  process: { name: string; id: string; bpmn: string };
};
