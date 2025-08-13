/**
 * Constants used throughout the Gantt Chart Canvas component
 * Centralizes all shared values to avoid duplication and ensure consistency
 */

// Layout dimensions
export const ROW_HEIGHT = 30; // Fixed row height for all chart rows
export const HEADER_HEIGHT = 60; // Height of the time axis header
export const DEFAULT_HEIGHT = 500; // Default chart height
export const DEFAULT_TASK_LIST_WIDTH = 300; // Default width for task list panel

// Zoom settings
export const DEFAULT_ZOOM = 50; // Mid-level zoom (centered in the range)

// Time calculations
export const MS_PER_MINUTE = 60 * 1000;
export const MS_PER_HOUR = 60 * MS_PER_MINUTE;
export const MS_PER_DAY = 24 * MS_PER_HOUR;

// Rendering constants
export const TASK_PADDING = 4; // Vertical padding for task bars
export const MILESTONE_SIZE = 12; // Diamond size for milestones
export const DEPENDENCY_ARROW_SIZE = 8; // Arrow head size for dependencies
export const ELEMENT_MIN_WIDTH = 20; // Minimum width for rendered elements
export const MIN_ARROW_TIP_DISTANCE = 16; // Minimum distance to show arrow tips for ghost dependencies

// Performance thresholds
export const VIRTUALIZATION_BUFFER_ROWS = 5; // Extra rows to render above/below viewport

// Colors and styling
export const GRID_LINE_COLOR = '#e0e0e0';
export const GRID_LINE_WIDTH = 1;
export const TODAY_LINE_COLOR = '#ff4444';
export const TODAY_LINE_WIDTH = 2;
export const TASK_DEFAULT_COLOR = '#3b82f6';
export const MILESTONE_DEFAULT_COLOR = '#facc15';
export const GROUP_DEFAULT_COLOR = '#64748b';
export const DEPENDENCY_LINE_COLOR = '#888888';
export const HOVER_OPACITY = 0.8;
