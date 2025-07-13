/**
 * Core exports for Gantt chart canvas components
 */

// Export TimeMatrix for coordinate transformations
export { TimeMatrix } from './TimeMatrix';

// Export TimeUnits utilities
export {
  TimeUnit,
  TIME_UNIT_DURATIONS,
  getTimeUnitName,
  isTimeUnitBoundary,
  snapToTimeUnitBoundary,
  advanceOneTimeUnit,
} from './TimeUnits';

// Export TimeAxisRenderer for the timescale system
export {
  TimeAxisRenderer,
  TimeLevel,
  type TimeAxisGridLine,
  type TimeAxisConfig,
} from './TimeAxisRenderer';

// Export CanvasRenderer classes
export { CanvasRenderer, CanvasLayerType, type RendererConfig } from './CanvasRenderer';

// Export ZoomCurveCalculator
export {
  ZoomCurveCalculator,
  createDefaultZoomCurve,
  getTimeUnitForScale,
  type ZoomCurveConfig,
} from './ZoomCurveCalculator';

// Export ElementManager and its types
export {
  ElementManager,
  type VisibleElement,
  type ElementQueryOptions,
  type ElementVisibility,
} from './ElementManager';

// Export constants
export * from './constants';
