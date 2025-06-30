/**
 * BPMN to Gantt transformation logic
 */

import type { GanttElementType, GanttDependency } from '@/components/gantt-chart-canvas/types';
import { DependencyType } from '@/components/gantt-chart-canvas/types';
import type {
  BPMNDefinitions,
  BPMNFlowElement,
  BPMNTask,
  BPMNEvent,
  BPMNSequenceFlow,
  TransformationResult,
  TransformationError,
  DefaultDurationInfo,
  ElementTiming,
  DEFAULT_DURATIONS
} from './types';
import { calculatePathBasedTimings } from './path-traversal';
import {
  extractDuration,
  isTaskElement,
  isSupportedEventElement,
  isSequenceFlowElement,
  getTaskTypeString,
  getEventTypeString,
  getUnsupportedElementReason,
  formatElementForLog,
  formatTimingForLog,
  formatGanttElementForLog,
  formatDependencyForLog,
  assignFlowColors,
  findConnectedComponents,
  groupAndSortElements
} from './utils';

// ============================================================================
// Element Transformation Functions
// ============================================================================

/**
 * Transform BPMN task to Gantt task
 */
function transformTask(
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
function transformEvent(
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
function getFlowType(flow: BPMNSequenceFlow): 'conditional' | 'default' | 'normal' {
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
function transformSequenceFlow(flow: BPMNSequenceFlow): GanttDependency {
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
// Time Calculation Algorithm
// ============================================================================

/**
 * Calculate element timings using improved First Possible Occurrence algorithm
 * This algorithm properly handles early occurrence updates when later flows enable earlier start times
 */
export function calculateElementTimings(
  elements: BPMNFlowElement[],
  startTime: number,
  defaultDurations: DefaultDurationInfo[] = []
): Map<string, ElementTiming> {
  const timings = new Map<string, ElementTiming>();
  const elementMap = new Map<string, BPMNFlowElement>();
  const incomingFlows = new Map<string, string[]>();
  const outgoingFlows = new Map<string, string[]>();
  const trackedDefaultDurations = new Set<string>(); // Track which elements already have default durations recorded
  
  // Build element lookup and flow maps
  elements.forEach(element => {
    elementMap.set(element.id, element);
    
    if (element.$type === 'bpmn:SequenceFlow') {
      const flow = element as BPMNSequenceFlow;
      
      // Extract actual IDs from sourceRef/targetRef (might be ModdleElements)
      const sourceId = typeof flow.sourceRef === 'string' ? flow.sourceRef : (flow.sourceRef as any)?.id || flow.sourceRef;
      const targetId = typeof flow.targetRef === 'string' ? flow.targetRef : (flow.targetRef as any)?.id || flow.targetRef;
      
      // Track incoming flows for target
      const targetIncoming = incomingFlows.get(targetId) || [];
      targetIncoming.push(flow.id);
      incomingFlows.set(targetId, targetIncoming);
      
      // Track outgoing flows for source
      const sourceOutgoing = outgoingFlows.get(sourceId) || [];
      sourceOutgoing.push(flow.id);
      outgoingFlows.set(sourceId, sourceOutgoing);
    }
  });
  
  // Get all non-flow elements
  const allElements = elements.filter(el => el.$type !== 'bpmn:SequenceFlow');
  
  // Initialize timings for elements without incoming flows
  allElements.forEach(element => {
    const elementIncoming = incomingFlows.get(element.id) || [];
    if (elementIncoming.length === 0) {
      // Element has no incoming flows - starts at startTime
      let duration = extractDuration(element);
      if (duration === 0) {
        // Apply default duration based on element type
        if (isTaskElement(element)) {
          duration = 3600000; // 1 hour default for tasks
          if (!trackedDefaultDurations.has(element.id)) {
            defaultDurations.push({
              elementId: element.id,
              elementType: element.$type,
              elementName: element.name,
              appliedDuration: duration,
              durationType: 'task'
            });
            trackedDefaultDurations.add(element.id);
          }
        } else if (isSupportedEventElement(element)) {
          duration = 0; // 0ms default for events
          // Don't track default durations for events since 0ms is expected
        }
      }
      
      timings.set(element.id, {
        elementId: element.id,
        startTime: startTime,
        endTime: startTime + duration,
        duration
      });
    }
  });
  
  // Iteratively calculate timings until no more updates occur
  const maxIterations = allElements.length * 2; // Safety limit
  let iteration = 0;
  let hasUpdates = true;
  
  while (hasUpdates && iteration < maxIterations) {
    hasUpdates = false;
    iteration++;
    
    // Process each element that has incoming flows
    allElements.forEach(element => {
      const elementId = element.id;
      const elementIncoming = incomingFlows.get(elementId) || [];
      
      if (elementIncoming.length === 0) {
        return; // Already handled in initialization
      }
      
      // Calculate the earliest possible start time from all incoming flows
      let earliestStartTime = Number.MAX_SAFE_INTEGER;
      let hasValidIncoming = false;
      
      for (const flowId of elementIncoming) {
        const flow = elementMap.get(flowId) as BPMNSequenceFlow;
        if (!flow) continue;
        
        // Extract source ID (might be ModdleElement)
        const sourceId = typeof flow.sourceRef === 'string' ? flow.sourceRef : (flow.sourceRef as any)?.id || flow.sourceRef;
        const sourceTiming = timings.get(sourceId);
        
        if (sourceTiming) {
          // Add flow duration to source completion time
          const flowDuration = extractDuration(flow) || 0;
          const flowCompletionTime = sourceTiming.endTime + flowDuration;
          earliestStartTime = Math.min(earliestStartTime, flowCompletionTime);
          hasValidIncoming = true;
        }
      }
      
      if (!hasValidIncoming) {
        return; // Not all dependencies are ready yet
      }
      
      // Calculate duration for this element
      let duration = extractDuration(element);
      if (duration === 0) {
        // Apply default duration based on element type
        if (isTaskElement(element)) {
          duration = 3600000; // 1 hour default for tasks
          if (!trackedDefaultDurations.has(element.id)) {
            defaultDurations.push({
              elementId: element.id,
              elementType: element.$type,
              elementName: element.name,
              appliedDuration: duration,
              durationType: 'task'
            });
            trackedDefaultDurations.add(element.id);
          }
        } else if (isSupportedEventElement(element)) {
          duration = 0; // 0ms default for events
          // Don't track default durations for events since 0ms is expected
        }
      }
      
      const newEndTime = earliestStartTime + duration;
      const existingTiming = timings.get(elementId);
      
      // Check if this is a new timing or an improvement (earlier start time)
      if (!existingTiming || earliestStartTime < existingTiming.startTime) {
        // Update timing - this is either new or an early occurrence update
        timings.set(elementId, {
          elementId,
          startTime: earliestStartTime,
          endTime: newEndTime,
          duration
        });
        
        hasUpdates = true; // Signal that we made an update
      }
    });
  }
  
  // Handle any remaining unprocessed elements (likely in cycles or missing dependencies)
  allElements.forEach(element => {
    if (!timings.has(element.id)) {
      let duration = extractDuration(element);
      if (duration === 0) {
        if (isTaskElement(element)) {
          duration = 3600000; // 1 hour for tasks
          if (!trackedDefaultDurations.has(element.id)) {
            defaultDurations.push({
              elementId: element.id,
              elementType: element.$type,
              elementName: element.name,
              appliedDuration: duration,
              durationType: 'task'
            });
            trackedDefaultDurations.add(element.id);
          }
        } else {
          duration = 0; // 0 for events
          // Don't track default durations for events since 0ms is expected
        }
      }
      
      // For elements with unresolvable dependencies, place them at start time
      timings.set(element.id, {
        elementId: element.id,
        startTime: startTime,
        endTime: startTime + duration,
        duration
      });
      
    }
  });
  
  
  return timings;
}

// ============================================================================
// Main Transformation Function
// ============================================================================

/**
 * Transform BPMN process to Gantt chart data
 */
export function transformBPMNToGantt(
  definitions: BPMNDefinitions,
  startTime: number = Date.now(),
  traversalMode: 'earliest-occurrence' | 'every-occurrence' | 'latest-occurrence' = 'earliest-occurrence',
  loopDepth: number = 1,
  chronologicalSorting: boolean = false
): TransformationResult {
  const ganttElements: GanttElementType[] = [];
  const ganttDependencies: GanttDependency[] = [];
  const errors: TransformationError[] = [];
  const defaultDurations: DefaultDurationInfo[] = [];
  
  // Get the first process (main process)
  const process = definitions.rootElements?.[0];
  if (!process || process.$type !== 'bpmn:Process') {
    errors.push({
      elementId: 'root',
      elementType: 'Process',
      reason: 'No valid process found in definitions'
    });
    return { elements: ganttElements, dependencies: ganttDependencies, errors, defaultDurations };
  }
  
  const flowElements = process.flowElements || [];
  
  
  // Separate supported and unsupported elements
  const supportedElements: BPMNFlowElement[] = [];
  
  flowElements.forEach(element => {
    // Check if element is supported
    if (isSequenceFlowElement(element)) {
      supportedElements.push(element);
    } else if (isTaskElement(element)) {
      supportedElements.push(element);
    } else if (isSupportedEventElement(element)) {
      supportedElements.push(element);
    } else {
      // Unsupported element
      errors.push({
        elementId: element.id,
        elementType: element.$type,
        elementName: element.name,
        reason: getUnsupportedElementReason(element.$type)
      });
    }
  });
  
  // Calculate timings based on traversal mode
  let elementToComponent: Map<string, number>;
  
  if (traversalMode === 'every-occurrence') {
    // Use path-based traversal
    const { timingsMap: pathTimings, dependencies: pathDependencies } = calculatePathBasedTimings(supportedElements, startTime, defaultDurations, loopDepth);
    
    // Assign colors based on connected components
    const elementColors = assignFlowColors(supportedElements);
    const originalElementToComponent = findConnectedComponents(supportedElements);
    
    // Create maps to track path relationships
    const elementToInstances = new Map<string, string[]>();
    const instanceToPath = new Map<string, string>(); // Track which path each instance belongs to
    const instanceToComponent = new Map<string, number>(); // Map instance IDs to execution order numbers
    
    // Create a flat list of all elements in execution order
    const allTimings: Array<{ elementId: string; timing: any; element: BPMNFlowElement; color: string }> = [];
    
    pathTimings.forEach((timingInstances, elementId) => {
      const element = supportedElements.find(el => el.id === elementId);
      if (!element || element.$type === 'bpmn:SequenceFlow') return;
      
      const elementColor = elementColors.get(elementId);
      
      timingInstances.forEach((timing) => {
        allTimings.push({ elementId, timing, element, color: elementColor });
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
      
      if (isTaskElement(element)) {
        const ganttElement = transformTask(
          element as BPMNTask,
          timing.startTime,
          timing.duration,
          color
        );
        ganttElement.id = timing.instanceId || ganttElement.id;
        ganttElement.name = ganttElement.name || element.id;
        ganttElement.instanceNumber = instanceNumber;
        ganttElement.totalInstances = totalInstances;
        ganttElement.isPathCutoff = timing.isPathCutoff;
        ganttElement.isLoop = timing.isLoop;
        ganttElement.isLoopCut = timing.isLoopCut;
        ganttElements.push(ganttElement);
        
        // Assign execution order as component number for flow-based ordering
        instanceToComponent.set(ganttElement.id, executionOrder);
        
      } else if (isSupportedEventElement(element)) {
        const ganttElement = transformEvent(
          element as BPMNEvent,
          timing.startTime,
          timing.duration,
          color
        );
        ganttElement.id = timing.instanceId || ganttElement.id;
        ganttElement.name = ganttElement.name || element.id;
        ganttElement.instanceNumber = instanceNumber;
        ganttElement.totalInstances = totalInstances;
        ganttElement.isPathCutoff = timing.isPathCutoff;
        ganttElement.isLoop = timing.isLoop;
        ganttElement.isLoopCut = timing.isLoopCut;
        ganttElements.push(ganttElement);
        
        // Assign execution order as component number for flow-based ordering
        instanceToComponent.set(ganttElement.id, executionOrder);
      }
    });
    
    // Create dependencies from path traversal results
    pathDependencies.forEach((dep, index) => {
      const flow = supportedElements.find(el => el.id === dep.flowId) as BPMNSequenceFlow;
      if (flow) {
        const dependencyId = `${dep.flowId}_${index}`;
        
        ganttDependencies.push({
          id: dependencyId,
          sourceId: dep.sourceInstanceId,
          targetId: dep.targetInstanceId,
          type: DependencyType.FINISH_TO_START,
          name: flow.name,
          flowType: getFlowType(flow)
        });
      }
    });
    
    // Use the instance-based component mapping for every-occurrence mode
    elementToComponent = instanceToComponent;
  } else if (traversalMode === 'latest-occurrence') {
    // Use path-based traversal but keep only the latest occurrence of each element
    const { timingsMap: pathTimings, dependencies: pathDependencies } = calculatePathBasedTimings(supportedElements, startTime, defaultDurations, loopDepth);
    
    // Assign colors based on connected components
    const elementColors = assignFlowColors(supportedElements);
    
    // Create a map to find the latest instance of each element
    const elementToLatestTiming = new Map<string, any>();
    
    // Find the latest occurrence of each element
    pathTimings.forEach((timingInstances, elementId) => {
      if (timingInstances.length > 0) {
        // Sort by start time and take the latest one
        const latestTiming = timingInstances.reduce((latest, current) => 
          current.startTime > latest.startTime ? current : latest
        );
        elementToLatestTiming.set(elementId, latestTiming);
      }
    });
    
    // Create dependency map for latest instances
    const latestInstanceIdMap = new Map<string, string>(); // original element ID -> latest instance ID
    elementToLatestTiming.forEach((timing, elementId) => {
      latestInstanceIdMap.set(elementId, timing.instanceId);
    });
    
    // Also ensure ALL elements from pathTimings are represented in the map
    // This handles the case where an element has only one instance
    pathTimings.forEach((timingInstances, elementId) => {
      if (!latestInstanceIdMap.has(elementId) && timingInstances.length > 0) {
        // If not already mapped, use the first (and only) instance
        latestInstanceIdMap.set(elementId, timingInstances[0].instanceId!);
      }
    });
    
    // Transform dependencies to use latest instances
    const latestDependencies = pathDependencies.map(dep => {
      // Extract original element IDs from instance IDs
      const sourceOriginalId = dep.sourceInstanceId.split('_instance_')[0];
      const targetOriginalId = dep.targetInstanceId.split('_instance_')[0];
      
      // Get the latest instances for both source and target
      const latestSourceInstanceId = latestInstanceIdMap.get(sourceOriginalId);
      const latestTargetInstanceId = latestInstanceIdMap.get(targetOriginalId);
      
      // Create dependency using latest instances
      return {
        sourceInstanceId: latestSourceInstanceId,
        targetInstanceId: latestTargetInstanceId,
        flowId: dep.flowId
      };
    }).filter((dep, index, arr) => {
      // Remove duplicates that might occur when multiple early dependencies get redirected to the same latest instances
      const key = `${dep.sourceInstanceId}->${dep.targetInstanceId}-${dep.flowId}`;
      const firstIndex = arr.findIndex(d => `${d.sourceInstanceId}->${d.targetInstanceId}-${d.flowId}` === key);
      return firstIndex === index;
    });
    
    // Transform elements using only the latest occurrences
    const instanceToComponent = new Map<string, number>();
    let executionOrder = 0;
    
    // Process all elements that have path timings (including single instances)
    pathTimings.forEach((timingInstances, elementId) => {
      // Get the latest timing for this element
      const timing = elementToLatestTiming.get(elementId) || timingInstances[0];
      const element = supportedElements.find(el => el.id === elementId);
      if (!element || element.$type === 'bpmn:SequenceFlow') return;
      
      const elementColor = elementColors.get(elementId);
      
      if (isTaskElement(element)) {
        const ganttElement = transformTask(
          element as BPMNTask,
          timing.startTime,
          timing.duration,
          elementColor
        );
        ganttElement.id = elementId; // Use original element ID, not instance ID
        ganttElement.name = ganttElement.name || element.id;
        ganttElement.instanceNumber = undefined; // Don't show instance numbers in latest mode
        ganttElement.totalInstances = undefined;
        ganttElement.isPathCutoff = timing.isPathCutoff;
        ganttElement.isLoop = timing.isLoop;
        ganttElement.isLoopCut = timing.isLoopCut;
        ganttElements.push(ganttElement);
        
        instanceToComponent.set(ganttElement.id, executionOrder++);
        
      } else if (isSupportedEventElement(element)) {
        const ganttElement = transformEvent(
          element as BPMNEvent,
          timing.startTime,
          timing.duration,
          elementColor
        );
        ganttElement.id = elementId; // Use original element ID, not instance ID
        ganttElement.name = ganttElement.name || element.id;
        ganttElement.instanceNumber = undefined; // Don't show instance numbers in latest mode
        ganttElement.totalInstances = undefined;
        ganttElement.isPathCutoff = timing.isPathCutoff;
        ganttElement.isLoop = timing.isLoop;
        ganttElement.isLoopCut = timing.isLoopCut;
        ganttElements.push(ganttElement);
        
        instanceToComponent.set(ganttElement.id, executionOrder++);
      }
    });
    
    // Create dependencies from the filtered latest dependencies
    latestDependencies.forEach((dep, index) => {
      const flow = supportedElements.find(el => el.id === dep.flowId) as BPMNSequenceFlow;
      if (flow) {
        // Map instance IDs back to original element IDs
        const sourceOriginalId = dep.sourceInstanceId!.split('_instance_')[0];
        const targetOriginalId = dep.targetInstanceId!.split('_instance_')[0];
        
        ganttDependencies.push({
          id: `${dep.flowId}_latest`,
          sourceId: sourceOriginalId,
          targetId: targetOriginalId,
          type: DependencyType.FINISH_TO_START,
          name: flow.name,
          flowType: getFlowType(flow)
        });
      }
    });
    
    elementToComponent = instanceToComponent;
  } else {
    // Use earliest occurrence traversal (existing logic)
    const timings = calculateElementTimings(supportedElements, startTime, defaultDurations);
    
    // Assign colors based on connected components
    const elementColors = assignFlowColors(supportedElements);
    elementToComponent = findConnectedComponents(supportedElements);
    
    // Transform elements
    supportedElements.forEach(element => {
      if (element.$type === 'bpmn:SequenceFlow') {
        // Transform sequence flow to dependency
        ganttDependencies.push(transformSequenceFlow(element as BPMNSequenceFlow));
      } else {
        // Get timing for this element
        const timing = timings.get(element.id);
        if (!timing) {
          errors.push({
            elementId: element.id,
            elementType: element.$type,
            elementName: element.name,
            reason: 'Could not calculate timing for element'
          });
          return;
        }
        
        // Transform based on type
        const elementColor = elementColors.get(element.id);
        if (isTaskElement(element)) {
          ganttElements.push(transformTask(
            element as BPMNTask,
            timing.startTime,
            timing.duration,
            elementColor
          ));
        } else if (isSupportedEventElement(element)) {
          ganttElements.push(transformEvent(
            element as BPMNEvent,
            timing.startTime,
            timing.duration,
            elementColor
          ));
        }
      }
    });
  }
  
  // Safeguard: ensure elementToComponent is always defined
  if (!elementToComponent) {
    elementToComponent = new Map<string, number>();
  }
  
  // Group and sort elements by connected components and start time
  const sortedElements = groupAndSortElements(ganttElements, elementToComponent, chronologicalSorting);
  
  return { elements: sortedElements, dependencies: ganttDependencies, errors, defaultDurations };
}