/**
 * Core type definitions for the Gantt chart
 */

/**
 * Dependency relationship types
 */
export enum DependencyType {
  FINISH_TO_START = 'finish-to-start',
  // Future types can be added here:
  // START_TO_START = 'start-to-start',
  // FINISH_TO_FINISH = 'finish-to-finish',
  // START_TO_FINISH = 'start-to-finish',
}

/**
 * Base interface for all chart elements
 */
export interface GanttElement {
  id: string;
  name?: string; // Optional - will display id if not provided
  color?: string;
  elementType?: string; // Optional element type description to display in second column
  instanceNumber?: number; // For duplicate elements in flow-based traversal
  totalInstances?: number; // Total number of instances for this element
  type: 'task' | 'milestone' | 'group'; // Extensible for future element types
  isPathCutoff?: boolean; // Indicates this element is where flow traversal stopped due to loop depth
  isLoop?: boolean; // Indicates this element is part of a loop
  isLoopCut?: boolean; // Indicates this element is where loop was cut off
}

/**
 * Task-specific interface
 */
export interface GanttTask extends GanttElement {
  type: 'task';
  start: number;  // Timestamp in milliseconds
  end: number;    // Timestamp in milliseconds
}

/**
 * Milestone-specific interface
 */
export interface GanttMilestone extends GanttElement {
  type: 'milestone';
  start: number;   // Timestamp in milliseconds
  end?: number;    // Optional end timestamp - if provided, milestone will be centered between start and end
}

/**
 * Group/Summary task interface
 */
export interface GanttGroup extends GanttElement {
  type: 'group';
  start: number;  // Timestamp in milliseconds
  end: number;    // Timestamp in milliseconds
  childIds: string[];
  isExpanded?: boolean;
}

/**
 * Union type for all possible element types
 */
export type GanttElementType = GanttTask | GanttMilestone | GanttGroup;

/**
 * Dependency arrow between elements
 */
export interface GanttDependency {
  id: string;
  sourceId: string; // ID of the source element
  targetId: string; // ID of the target element
  type: DependencyType; // Type of dependency relationship
  name?: string; // Optional name for the dependency
  flowType?: 'conditional' | 'default' | 'normal'; // Type of flow for BPMN sequence flows
}

/**
 * Configuration options for the Gantt chart
 */
export interface GanttChartOptions {
  height?: number;
  taskListWidth?: number;
  initialZoom?: number;
  initialPosition?: number;  // Timestamp to center on
  autoFitToData?: boolean;   // Auto-fit zoom and position to show all data
  autoFitPadding?: number;   // Padding percentage when auto-fitting (default: 0.1 = 10%)
  showControls?: boolean;
  readOnly?: boolean;
  showLoopIcons?: boolean;   // Show warning icons for loop elements (default: true)
  curvedDependencies?: boolean; // Use curved lines for dependency arrows (default: false)
  grid?: {
    major?: {
      color?: string; // Color now directly set here for simplicity in API
      lineWidth?: number;
      timelineTickSize?: number; // If > 0, tick size in pixels, otherwise full height
    };
    minor?: {
      color?: string; // Color now directly set here for simplicity in API
      lineWidth?: number;
      timelineTickSize?: number; // If > 0, tick size in pixels, otherwise full height
    };
  };
  onElementClick?: (element: GanttElementType) => void;
  onZoomChange?: (zoom: number) => void;
  onViewChange?: (visibleRange: [number, number]) => void;
}

/**
 * Internal chart state
 */
export interface GanttChartState {
  zoom: number;              // Current zoom level (0-100)
  visibleTimeStart: number;  // Start time of visible area in ms
  visibleTimeEnd: number;    // End time of visible area in ms
  taskListWidth: number;     // Width of the task list in pixels
  scrollLeft: number;        // Horizontal scroll position
  isDragging: boolean;       // Whether user is currently dragging/panning
  isResizing: boolean;       // Whether task list is being resized
  panOffset?: number;        // CSS transform offset during panning
}