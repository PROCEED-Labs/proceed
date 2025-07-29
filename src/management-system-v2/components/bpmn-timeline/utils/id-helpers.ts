/**
 * Utility functions for handling BPMN element IDs and references
 */

import { INSTANCE_ID_SEPARATOR, INSTANCE_ID_REGEX } from '../constants';

/**
 * Create a unique instance ID for path traversal
 */
export function createInstanceId(elementId: string, instanceCounter: number): string {
  return `${elementId}${INSTANCE_ID_SEPARATOR}${instanceCounter}`;
}

/**
 * Parse instance ID to extract base element ID and instance number
 */
export function parseInstanceId(instanceId: string): {
  baseElementId: string;
  instanceNumber: number;
} {
  const match = instanceId.match(INSTANCE_ID_REGEX);
  if (match) {
    const baseElementId = instanceId.substring(0, instanceId.lastIndexOf(INSTANCE_ID_SEPARATOR));
    const instanceNumber = parseInt(match[1], 10);
    return { baseElementId, instanceNumber };
  }

  // Fallback for non-instance IDs
  return { baseElementId: instanceId, instanceNumber: 0 };
}

/**
 * Get base element ID from instance ID (removes instance suffix)
 */
export function getBaseElementId(instanceId: string): string {
  const separatorIndex = instanceId.lastIndexOf(INSTANCE_ID_SEPARATOR);
  return separatorIndex >= 0 ? instanceId.substring(0, separatorIndex) : instanceId;
}

/**
 * Check if an ID is an instance ID (contains instance separator)
 */
export function isInstanceId(id: string): boolean {
  return id.includes(INSTANCE_ID_SEPARATOR);
}
