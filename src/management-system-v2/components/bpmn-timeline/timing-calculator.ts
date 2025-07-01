/**
 * BPMN Timing Calculation Algorithm
 * 
 * This module contains the timing calculation algorithm for the "Earliest Occurrence" mode.
 * It implements an iterative algorithm that calculates the earliest possible start and end
 * times for BPMN elements based on their dependencies.
 */

import type {
  BPMNFlowElement,
  BPMNSequenceFlow,
  ElementTiming,
  DefaultDurationInfo,
} from './types';
import {
  extractDuration,
  isTaskElement,
  isSupportedEventElement,
} from './utils';

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