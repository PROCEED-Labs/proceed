/**
 * Constants for BPMN timeline transformation
 */

// Default durations in milliseconds
export const DEFAULT_TASK_DURATION_MS = 3600000; // 1 hour
export const DEFAULT_EVENT_DURATION_MS = 0; // immediate
export const DEFAULT_SEQUENCE_FLOW_DURATION_MS = 0; // no delay

// Path traversal limits
export const MAX_PATH_EXPLORATION_LIMIT = 100;
export const MAX_TRAVERSAL_ITERATIONS = 1000;

// Color palette for connected components
export const FLOW_COLOR_PALETTE = [
  '#3b82f6', // blue
  '#10b981', // green
  '#8b5cf6', // purple
  '#f97316', // orange
  '#ef4444', // red
  '#06b6d4', // cyan
  '#eab308', // yellow
  '#ec4899', // pink
] as const;

// Instance ID patterns
export const INSTANCE_ID_SEPARATOR = '_instance_';
export const INSTANCE_ID_REGEX = /_instance_(\d+)$/;

// Ghost element opacity
export const GHOST_ELEMENT_OPACITY = 0.75;