/**
 * Utility functions for BPMN timeline transformation
 */

import type { BPMNBaseElement, BPMNTask, BPMNEvent, DEFAULT_DURATIONS } from './types';

// ============================================================================
// Duration and Time Utilities
// ============================================================================

/**
 * Parse ISO 8601 duration format (e.g., "P1D", "PT2H", "P1DT2H30M")
 * Returns duration in milliseconds
 */
export function parseISO8601Duration(duration: string | undefined): number {
  if (!duration) return 0;
  
  // Support ISO 8601 durations like "P1D", "PT2H", "P1DT2H30M", etc.
  // Only supports days, hours, minutes, seconds (no months/years)
  const regex = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/;
  const matches = duration.match(regex);

  if (!matches) {
    console.warn('Invalid ISO 8601 duration format:', duration);
    return 0;
  }

  // matches[1]: days, matches[2]: hours, matches[3]: minutes, matches[4]: seconds
  const days = matches[1] ? parseInt(matches[1], 10) : 0;
  const hours = matches[2] ? parseInt(matches[2], 10) : 0;
  const minutes = matches[3] ? parseInt(matches[3], 10) : 0;
  const seconds = matches[4] ? parseInt(matches[4], 10) : 0;

  // Convert to milliseconds
  return (days * 24 * 60 * 60 + hours * 60 * 60 + minutes * 60 + seconds) * 1000;
}

/**
 * Extract duration from BPMN extension elements
 */
export function extractDuration(element: BPMNBaseElement): number {
  if (!element.extensionElements?.values) {
    return 0;
  }

  for (const extension of element.extensionElements.values) {
    if (extension.$children) {
      for (const child of extension.$children) {
        // Check for proceed:timePlannedDuration in both possible formats
        if (child.$type === 'proceed:timePlannedDuration' && (child.body || child.$body)) {
          const durationValue = child.body || child.$body;
          return parseISO8601Duration(durationValue);
        }
        
        // Legacy check with name property
        if (child.name === 'proceed:timePlannedDuration' && (child.body || child.$body)) {
          const durationValue = child.body || child.$body;
          return parseISO8601Duration(durationValue);
        }
      }
    }
  }

  return 0;
}

// ============================================================================
// BPMN Element Type Detection
// ============================================================================

/**
 * Check if element is a supported task type
 */
export function isTaskElement(element: { $type: string }): boolean {
  return element.$type.includes('Task') || element.$type === 'bpmn:CallActivity';
}

/**
 * Check if element is a supported event type (excluding BoundaryEvents)
 */
export function isSupportedEventElement(element: { $type: string }): boolean {
  return (
    element.$type === 'bpmn:StartEvent' ||
    element.$type === 'bpmn:EndEvent' ||
    element.$type === 'bpmn:IntermediateThrowEvent' ||
    element.$type === 'bpmn:IntermediateCatchEvent'
  );
}

/**
 * Check if element is a sequence flow
 */
export function isSequenceFlowElement(element: { $type: string }): boolean {
  return element.$type === 'bpmn:SequenceFlow';
}

// ============================================================================
// ExtraInfo Generation
// ============================================================================

/**
 * Get task type string for extraInfo display
 */
export function getTaskTypeString(task: BPMNTask): string {
  // Extract the specific task type from $type
  const typeMatch = task.$type.match(/bpmn:(.+)/);
  const taskType = typeMatch ? typeMatch[1] : 'Task';
  
  let result = `<${taskType}>`;
  
  // Add loop characteristics if present
  if (task.loopCharacteristics) {
    if (task.loopCharacteristics.$type === 'bpmn:StandardLoopCharacteristics') {
      result += ' [Loop]';
    } else if (task.loopCharacteristics.$type === 'bpmn:MultiInstanceLoopCharacteristics') {
      if (task.loopCharacteristics.isSequential) {
        result += ' [Sequential-Multi-Instance]';
      } else {
        result += ' [Parallel-Multi-Instance]';
      }
    }
  }
  
  return result;
}

/**
 * Get event type string for extraInfo display
 */
export function getEventTypeString(event: BPMNEvent): string {
  // Get event definition type
  let eventDefinition = '<None>';
  if (event.eventDefinitions && event.eventDefinitions.length > 0) {
    const defType = event.eventDefinitions[0].$type;
    const defMatch = defType.match(/bpmn:(.+)EventDefinition/);
    if (defMatch) {
      eventDefinition = `<${defMatch[1]}>`;
    }
  }
  
  // Get event kind
  let eventKind = '';
  if (event.$type === 'bpmn:StartEvent') {
    eventKind = '[Start]';
  } else if (event.$type === 'bpmn:EndEvent') {
    eventKind = '[End]';
  } else if (event.$type === 'bpmn:IntermediateThrowEvent') {
    eventKind = '[Intermediate-Throw]';
  } else if (event.$type === 'bpmn:IntermediateCatchEvent') {
    eventKind = '[Intermediate-Catch]';
  }
  
  // Check if event has duration and add info
  const eventDuration = extractDuration(event);
  let durationInfo = '';
  if (eventDuration > 0) {
    // Convert duration to human readable format
    const hours = Math.floor(eventDuration / (1000 * 60 * 60));
    const minutes = Math.floor((eventDuration % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((eventDuration % (1000 * 60)) / 1000);
    
    if (hours > 0) {
      durationInfo = ` [${hours}h${minutes > 0 ? ` ${minutes}m` : ''}]`;
    } else if (minutes > 0) {
      durationInfo = ` [${minutes}m${seconds > 0 ? ` ${seconds}s` : ''}]`;
    } else if (seconds > 0) {
      durationInfo = ` [${seconds}s]`;
    } else {
      durationInfo = ' [<1s]';
    }
  }
  
  return `${eventDefinition}${eventKind}${durationInfo}`;
}

// ============================================================================
// Error Classification
// ============================================================================

/**
 * Get error reason for unsupported elements
 */
export function getUnsupportedElementReason(elementType: string): string {
  if (elementType === 'bpmn:BoundaryEvent') {
    return 'BoundaryEvents not yet supported';
  } else if (elementType.includes('Gateway')) {
    return 'Gateways not yet supported';
  } else {
    return 'Unknown element type';
  }
}

// ============================================================================
// Color Assignment and Flow Analysis
// ============================================================================

/**
 * Predefined color palette for connected components
 */
const COLOR_PALETTE = [
  '#3b82f6', // blue
  '#10b981', // green
  '#8b5cf6', // purple
  '#f97316', // orange
  '#ef4444', // red
  '#06b6d4', // cyan
  '#eab308', // yellow
  '#ec4899', // pink
];

/**
 * Find connected components in the BPMN flow using depth-first search
 */
export function findConnectedComponents(
  elements: Array<{ id: string; $type: string; incoming?: string[]; outgoing?: string[]; sourceRef?: any; targetRef?: any }>
): Map<string, number> {
  const elementToComponent = new Map<string, number>();
  const visited = new Set<string>();
  const adjacencyList = new Map<string, Set<string>>();
  
  // Build adjacency list for all non-sequence-flow elements
  const nonFlowElements = elements.filter(el => el.$type !== 'bpmn:SequenceFlow');
  const sequenceFlows = elements.filter(el => el.$type === 'bpmn:SequenceFlow');
  
  // Initialize adjacency list
  nonFlowElements.forEach(element => {
    adjacencyList.set(element.id, new Set());
  });
  
  // Add connections based on sequence flows
  sequenceFlows.forEach(flow => {
    const sourceId = typeof flow.sourceRef === 'string' ? flow.sourceRef : flow.sourceRef?.id;
    const targetId = typeof flow.targetRef === 'string' ? flow.targetRef : flow.targetRef?.id;
    
    if (sourceId && targetId && adjacencyList.has(sourceId) && adjacencyList.has(targetId)) {
      adjacencyList.get(sourceId)!.add(targetId);
      adjacencyList.get(targetId)!.add(sourceId); // Undirected graph for color grouping
    }
  });
  
  
  // Perform DFS to find connected components
  let componentId = 0;
  
  const dfs = (elementId: string, currentComponentId: number) => {
    visited.add(elementId);
    elementToComponent.set(elementId, currentComponentId);
    
    const neighbors = adjacencyList.get(elementId) || new Set();
    for (const neighborId of neighbors) {
      if (!visited.has(neighborId)) {
        dfs(neighborId, currentComponentId);
      }
    }
  };
  
  // Find all connected components
  for (const element of nonFlowElements) {
    if (!visited.has(element.id)) {
      dfs(element.id, componentId);
      componentId++;
    }
  }
  return elementToComponent;
}

/**
 * Assign colors to elements based on their connected components
 */
export function assignFlowColors(
  elements: Array<{ id: string; $type: string; incoming?: string[]; outgoing?: string[]; sourceRef?: any; targetRef?: any }>
): Map<string, string> {
  const elementToComponent = findConnectedComponents(elements);
  const elementToColor = new Map<string, string>();
  
  // Assign colors based on component ID
  elementToComponent.forEach((componentId, elementId) => {
    const colorIndex = componentId % COLOR_PALETTE.length;
    elementToColor.set(elementId, COLOR_PALETTE[colorIndex]);
  });
  
  return elementToColor;
}

/**
 * Group and sort elements by connected components and start time
 */
export function groupAndSortElements<T extends { id: string; start: number }>(
  elements: T[],
  elementToComponent: Map<string, number>
): T[] {
  // Group elements by component
  const componentGroups = new Map<number, T[]>();
  
  elements.forEach(element => {
    const componentId = elementToComponent.get(element.id) ?? -1;
    if (!componentGroups.has(componentId)) {
      componentGroups.set(componentId, []);
    }
    componentGroups.get(componentId)!.push(element);
  });
  
  // Sort elements within each group by start time
  componentGroups.forEach(group => {
    group.sort((a, b) => a.start - b.start);
  });
  
  // Sort groups by earliest start time in each group
  const sortedGroups = Array.from(componentGroups.entries())
    .sort(([, groupA], [, groupB]) => {
      const earliestA = Math.min(...groupA.map(el => el.start));
      const earliestB = Math.min(...groupB.map(el => el.start));
      return earliestA - earliestB;
    })
    .map(([, group]) => group);
  
  // Flatten the sorted groups
  return sortedGroups.flat();
}

// ============================================================================
// Logging Utilities
// ============================================================================

/**
 * Format element for logging
 */
export function formatElementForLog(element: any) {
  return {
    id: element.id,
    type: element.$type,
    name: element.name,
    incoming: element.incoming,
    outgoing: element.outgoing,
    sourceRef: element.sourceRef,
    targetRef: element.targetRef
  };
}

/**
 * Format timing for logging
 */
export function formatTimingForLog(id: string, timing: { startTime: number; endTime: number; duration: number }) {
  return {
    id,
    startTime: new Date(timing.startTime).toISOString(),
    endTime: new Date(timing.endTime).toISOString(),
    duration: timing.duration
  };
}

/**
 * Format gantt element for logging
 */
export function formatGanttElementForLog(el: any) {
  return {
    id: el.id,
    name: el.name,
    type: el.type,
    start: new Date(el.start || 0).toISOString(),
    end: el.type === 'task' ? new Date(el.end).toISOString() : 'N/A',
    extraInfo: el.extraInfo
  };
}

/**
 * Format dependency for logging
 */
export function formatDependencyForLog(dep: { id: string; sourceId: string; targetId: string }) {
  return {
    id: dep.id,
    sourceId: dep.sourceId,
    targetId: dep.targetId
  };
}