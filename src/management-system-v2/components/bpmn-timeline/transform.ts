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
import { calculateElementTimings } from './timing-calculator';
import {
  transformTask,
  transformEvent,
  transformSequenceFlow,
  getFlowType,
} from './element-transformers';
import {
  extractDuration,
  isTaskElement,
  isSupportedEventElement,
  isSequenceFlowElement,
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