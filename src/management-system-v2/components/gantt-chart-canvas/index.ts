/**
 * Gantt Chart Canvas Component
 *
 * A canvas-based Gantt chart implementation with high-precision zooming
 * and excellent performance even with large datasets.
 */

// Main component export
export { GanttChartCanvas } from './components/GanttChartCanvas';

// Types export
export type {
  GanttElementType,
  GanttTask,
  GanttMilestone,
  GanttGroup,
  GanttDependency,
  GanttChartOptions,
} from './types';

// Re-export utility functions that might be helpful for users
export { TimeUnit } from './core/TimeUnits';
