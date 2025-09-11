/**
 * Utility functions for creating optimized element lookup maps
 * Consolidates the repeated pattern across mode handlers
 */

import type { BPMNFlowElement, BPMNSequenceFlow } from '../types/types';

/**
 * Create optimized lookup maps for elements and sequence flows
 * This consolidates the repeated pattern in all mode handlers
 */
export function createElementMaps(supportedElements: BPMNFlowElement[]): {
  elementMap: Map<string, BPMNFlowElement>;
  sequenceFlowMap: Map<string, BPMNSequenceFlow>;
} {
  const elementMap = new Map(supportedElements.map((el) => [el.id, el]));
  const sequenceFlowMap = new Map(
    supportedElements
      .filter((el) => el.$type === 'bpmn:SequenceFlow')
      .map((el) => [el.id, el as BPMNSequenceFlow]),
  );

  return { elementMap, sequenceFlowMap };
}

/**
 * Extract base element ID, handling both regular and instance IDs
 * Consolidates the repeated split pattern across mode handlers
 */
export function extractBaseElementId(elementId: string): string {
  // Handle instance IDs like "Activity_1hp3t0r_instance_1"
  if (elementId.includes('_instance_')) {
    return elementId.split('_instance_')[0];
  }
  // Return the original ID if no instance pattern found
  return elementId;
}
