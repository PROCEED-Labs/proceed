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
} from './types';
import {
  getTaskTypeString,
  getEventTypeString,
  extractDuration,
} from './utils';

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
  color?: string
): GanttElementType {
  return {
    id: task.id,
    name: task.name,
    type: 'task',
    start: startTime,
    end: startTime + duration,
    elementType: getTaskTypeString(task),
    color
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
  color?: string
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
      color
    };
  } else {
    // Event has no duration - point milestone at start time
    return {
      id: event.id,
      name: event.name,
      type: 'milestone',
      start: startTime,
      elementType: getEventTypeString(event),
      color
    };
  }
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
  if (flow.name && (flow.name.toLowerCase().includes('default') || flow.name.toLowerCase().includes('else'))) {
    return 'default';
  }
  
  return 'normal';
}

/**
 * Transform BPMN sequence flow to Gantt dependency
 */
export function transformSequenceFlow(flow: BPMNSequenceFlow): GanttDependency {
  // Handle case where sourceRef/targetRef might be ModdleElement objects or strings
  const sourceId = typeof flow.sourceRef === 'string' ? flow.sourceRef : (flow.sourceRef as any)?.id || flow.sourceRef;
  const targetId = typeof flow.targetRef === 'string' ? flow.targetRef : (flow.targetRef as any)?.id || flow.targetRef;
  
  return {
    id: flow.id,
    sourceId: sourceId,
    targetId: targetId,
    type: DependencyType.FINISH_TO_START, // BPMN sequence flows are finish-to-start dependencies
    name: flow.name,
    flowType: getFlowType(flow)
  };
}

// ============================================================================
// Gateway Detection and Transformation Functions
// ============================================================================

/**
 * Check if an element is a gateway
 */
export function isGatewayElement(element: BPMNFlowElement): element is BPMNGateway {
  return element.$type === 'bpmn:ExclusiveGateway' ||
         element.$type === 'bpmn:InclusiveGateway' ||
         element.$type === 'bpmn:ParallelGateway' ||
         element.$type === 'bpmn:ComplexGateway' ||
         element.$type === 'bpmn:EventBasedGateway';
}

/**
 * Check if an element is an exclusive gateway (XOR)
 */
export function isExclusiveGateway(element: BPMNFlowElement): element is BPMNGateway {
  return element.$type === 'bpmn:ExclusiveGateway';
}

/**
 * Gateway preprocessing result containing modified elements and new dependencies
 */
export interface GatewayPreprocessingResult {
  /** Flow elements with gateways removed */
  processedElements: BPMNFlowElement[];
  /** New dependencies created from gateway transformations */
  gatewayDependencies: GatewayDependency[];
  /** Removed sequence flows that went through gateways */
  removedFlows: string[];
}

/**
 * Extended dependency type for gateways with combined duration
 */
export interface GatewayDependency {
  /** Dependency ID */
  id: string;
  /** Source element ID */
  sourceId: string;
  /** Target element ID */
  targetId: string;
  /** Dependency type */
  type: DependencyType;
  /** Dependency name */
  name?: string;
  /** Flow type */
  flowType: 'conditional' | 'default' | 'normal';
  /** Combined duration of incoming flow + gateway + outgoing flow */
  combinedDuration: number;
  /** Original gateway that created this dependency */
  gatewayId: string;
  /** Gateway type for debugging */
  gatewayType: string;
}

/**
 * Preprocess gateways to create direct dependencies between 
 * predecessor and successor elements
 * Currently handles all gateway types as exclusive (XOR) for simplicity
 */
export function preprocessExclusiveGateways(
  elements: BPMNFlowElement[]
): GatewayPreprocessingResult {
  const processedElements: BPMNFlowElement[] = [];
  const gatewayDependencies: GatewayDependency[] = [];
  const removedFlows: string[] = [];
  
  // Build element maps for fast lookup
  const elementMap = new Map<string, BPMNFlowElement>();
  const flowMap = new Map<string, BPMNSequenceFlow>();
  
  elements.forEach(element => {
    elementMap.set(element.id, element);
    if (element.$type === 'bpmn:SequenceFlow') {
      flowMap.set(element.id, element as BPMNSequenceFlow);
    }
  });
  
  // Find all gateways (treat all as exclusive for now)
  const exclusiveGateways = elements.filter(isGatewayElement) as BPMNGateway[];
  
  // Process each exclusive gateway
  for (const gateway of exclusiveGateways) {
    
    // Handle case where incoming/outgoing contain objects instead of IDs
    const incomingFlowIds = (gateway.incoming || []).map(item => 
      typeof item === 'string' ? item : (item as any)?.id || item
    );
    const outgoingFlowIds = (gateway.outgoing || []).map(item => 
      typeof item === 'string' ? item : (item as any)?.id || item
    );
    
    const incomingFlows = incomingFlowIds.map(id => flowMap.get(id)).filter(Boolean) as BPMNSequenceFlow[];
    const outgoingFlows = outgoingFlowIds.map(id => flowMap.get(id)).filter(Boolean) as BPMNSequenceFlow[];
    
    // Get gateway duration (default to 0ms)
    const gatewayDuration = extractDuration(gateway) || 0;
    
    // For each combination of incoming and outgoing flow, create a direct dependency
    for (const incomingFlow of incomingFlows) {
      for (const outgoingFlow of outgoingFlows) {
        // Extract source and target IDs
        const sourceId = typeof incomingFlow.sourceRef === 'string' 
          ? incomingFlow.sourceRef 
          : (incomingFlow.sourceRef as any)?.id || incomingFlow.sourceRef;
        
        const targetId = typeof outgoingFlow.targetRef === 'string'
          ? outgoingFlow.targetRef
          : (outgoingFlow.targetRef as any)?.id || outgoingFlow.targetRef;
        
        // Calculate combined duration
        const incomingDuration = extractDuration(incomingFlow) || 0;
        const outgoingDuration = extractDuration(outgoingFlow) || 0;
        const combinedDuration = incomingDuration + gatewayDuration + outgoingDuration;
        
        // Create gateway dependency
        const gatewayDependency: GatewayDependency = {
          id: `gateway_${gateway.id}_${sourceId}_to_${targetId}`,
          sourceId: sourceId,
          targetId: targetId,
          type: DependencyType.FINISH_TO_START,
          name: `Via ${gateway.name || gateway.id}`,
          flowType: 'normal', // Gateway dependencies are treated as normal flows
          combinedDuration: combinedDuration,
          gatewayId: gateway.id,
          gatewayType: gateway.$type
        };
        
        gatewayDependencies.push(gatewayDependency);
      }
    }
    
    // Mark flows connected to this gateway for removal
    [...incomingFlows, ...outgoingFlows].forEach(flow => {
      removedFlows.push(flow.id);
    });
  }
  
  // Filter out gateways and their connected flows from processed elements
  const gatewayIds = new Set(exclusiveGateways.map(g => g.id));
  const removedFlowIds = new Set(removedFlows);
  
  for (const element of elements) {
    // Skip gateways and their flows
    if (gatewayIds.has(element.id) || removedFlowIds.has(element.id)) {
      continue;
    }
    
    processedElements.push(element);
  }
  
  // Add gateway dependencies as synthetic sequence flows
  for (const gatewayDep of gatewayDependencies) {
    const syntheticFlow: BPMNSequenceFlow = {
      $type: 'bpmn:SequenceFlow',
      id: gatewayDep.id,
      sourceRef: gatewayDep.sourceId,
      targetRef: gatewayDep.targetId,
      name: gatewayDep.name,
      // Store combined duration in extension elements for extractDuration to find
      extensionElements: {
        $type: 'bpmn:ExtensionElements',
        values: [{
          $type: 'proceed:Meta',
          $children: [{
            $type: 'proceed:timePlannedDuration',
            name: 'timePlannedDuration', 
            $body: `PT${Math.round(gatewayDep.combinedDuration / 1000)}S` // Convert ms to ISO 8601
          }]
        }]
      }
    };
    
    processedElements.push(syntheticFlow);
  }
  
  return {
    processedElements,
    gatewayDependencies,
    removedFlows
  };
}