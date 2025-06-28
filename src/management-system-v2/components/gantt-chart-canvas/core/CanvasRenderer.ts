/**
 * CanvasRenderer.ts
 *
 * Handles all rendering operations for the Gantt chart canvas components.
 * This is responsible for drawing grid lines, elements, and handling optimized rendering.
 * Includes optimizations for very large datasets of 1000+ elements.
 */

import { TimeMatrix } from './TimeMatrix';
import { TimeAxisRenderer, TimeLevel, TimeAxisGridLine } from './TimeAxisRenderer';
import { TimeUnit } from './TimeUnits';
import { GanttElementType, GanttDependency } from '../types';
import { 
  ROW_HEIGHT, 
  TASK_PADDING, 
  MILESTONE_SIZE, 
  DEPENDENCY_ARROW_SIZE,
  VIRTUALIZATION_BUFFER_ROWS,
  MS_PER_DAY
} from './constants';
import { GridRenderer, ElementRenderer, DependencyRenderer } from './renderers';

// Canvas element types
export enum CanvasLayerType {
  Timeline = 'timeline',
  ChartContent = 'chartContent',
}

// Configuration for the renderer
export interface RendererConfig {
  taskBarHeight: number;
  milestoneSize: number;
  taskBorderRadius: number;
  currentZoom?: number; // Current zoom level (0-100)
  grid?: {
    major: {
      lineWidth: number;
      // For timeline, defines if the grid lines should be full height or ticks
      timelineTickSize?: number; // If > 0, tick size in pixels, otherwise full height
    };
    minor: {
      lineWidth: number;
      // For timeline, defines if the grid lines should be full height or ticks
      timelineTickSize?: number; // If > 0, tick size in pixels, otherwise full height
    };
  };
  colors: {
    grid: {
      major: string;
      minor: string;
    };
    text: string;
    background: string;
    task: string;
    milestone: string;
  };
  font: {
    family: string;
    size: number;
  };
}

// Constants are imported from ./constants.ts

// Default configuration
const DEFAULT_CONFIG: RendererConfig = {
  taskBarHeight: 22,
  milestoneSize: 14,
  taskBorderRadius: 3,
  currentZoom: 50, // Default zoom level
  grid: {
    major: {
      lineWidth: 1,
      timelineTickSize: 10, // 10px ticks in timeline by default
    },
    minor: {
      lineWidth: 0.5, // Reduced from 0.8 to match task list borders
      timelineTickSize: 0, // full height in timeline by default
    },
  },
  colors: {
    grid: {
      major: '#C9C9C9', 
      minor: '#E8E8E8', // Lighter color for minor grid lines for better visibility
    },
    text: '#333333',
    background: '#FFFFFF',
    task: '#4F94F9',
    milestone: '#F05454',
  },
  font: {
    family: 'Arial, sans-serif',
    size: 12,
  },
};

/**
 * Manages canvas rendering for the Gantt chart
 */
export class CanvasRenderer {
  private config: RendererConfig;
  private contexts: Map<CanvasLayerType, CanvasRenderingContext2D> = new Map();
  private canvasSizes: Map<CanvasLayerType, { width: number; height: number }> = new Map();
  private pixelRatio: number = window.devicePixelRatio || 1;

  // Time axis renderer
  private timeAxisRenderer: TimeAxisRenderer;

  // Current visible time range and elements
  private visibleTimeRange: [number, number] = [0, 0];
  private visibleElements: GanttElementType[] = [];

  // Last render information for optimization
  private lastTimeMatrix?: TimeMatrix;
  private lastMajorGridLines?: TimeAxisGridLine[];
  private lastSubgridLines?: TimeAxisGridLine[];
  private currentTimeUnit?: TimeUnit;
  private currentTimeLevel?: TimeLevel;
  private currentPixelsPerDay: number = 0; // Store actual pixels per day for debugging

  
  // Current date for "now" line
  private currentDate: Date = new Date();

  // Renderer modules
  private gridRenderer: GridRenderer;
  private elementRenderer: ElementRenderer;
  private dependencyRenderer: DependencyRenderer;

  /**
   * Create a new CanvasRenderer
   * @param config Optional configuration overrides
   */
  constructor(config: Partial<RendererConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialize time axis renderer with grid settings and pixel ratio
    this.timeAxisRenderer = new TimeAxisRenderer({
      labelFontSize: this.config.font.size,
      labelPrimaryColor: this.config.colors.text,
      labelSecondaryColor: this.config.colors.text,
      gridMajorColor: this.config.colors.grid.major,
      gridMinorColor: this.config.colors.grid.minor,
      gridMajorLineWidth: this.config.grid?.major.lineWidth || 1,
      gridMinorLineWidth: this.config.grid?.minor.lineWidth || 0.5,
      gridMajorTimelineTickSize: this.config.grid?.major.timelineTickSize,
      gridMinorTimelineTickSize: this.config.grid?.minor.timelineTickSize,
    }, this.pixelRatio);

    // Initialize renderer modules
    this.gridRenderer = new GridRenderer(this.config);
    this.elementRenderer = new ElementRenderer(this.pixelRatio);
    this.dependencyRenderer = new DependencyRenderer(this.pixelRatio);
  }

  /**
   * Set the canvas context for a specific layer
   */
  setContext(
    layerType: CanvasLayerType,
    context: CanvasRenderingContext2D,
    width: number,
    height: number,
  ): void {
    this.contexts.set(layerType, context);
    this.canvasSizes.set(layerType, { width, height });

    // Set up high-DPI rendering
    this.configureHiDPI(layerType);
  }

  /**
   * Configure canvas for high-DPI displays
   */
  private configureHiDPI(layerType: CanvasLayerType): void {
    const context = this.contexts.get(layerType);
    const sizeInfo = this.canvasSizes.get(layerType);

    if (!context || !sizeInfo) return;

    const canvas = context.canvas;
    const { width, height } = sizeInfo;

    // Scale the canvas internal dimensions
    canvas.width = width * this.pixelRatio;
    canvas.height = height * this.pixelRatio;

    // Scale all drawing operations
    context.scale(this.pixelRatio, this.pixelRatio);

    // Set CSS dimensions to logical size
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
  }

  /**
   * Resize a canvas layer
   */
  resizeLayer(layerType: CanvasLayerType, width: number, height: number): void {
    const context = this.contexts.get(layerType);
    if (!context) return;

    this.canvasSizes.set(layerType, { width, height });
    this.configureHiDPI(layerType);
    
    // When resizing the chart content layer, we need to make sure
    // horizontal grid lines get redrawn as the full height may have changed
    if (layerType === CanvasLayerType.ChartContent && this.gridRenderer) {
      // Force grid line recalculation in GridRenderer
      this.gridRenderer.resetRowReferences();
    }
  }


  /**
   * Clear a specific canvas layer
   */
  clearLayer(layerType: CanvasLayerType): void {
    const context = this.contexts.get(layerType);
    const sizeInfo = this.canvasSizes.get(layerType);

    if (!context || !sizeInfo) return;

    const { width, height } = sizeInfo;
    context.clearRect(0, 0, width, height);
  }

  /**
   * Clear all canvas layers
   */
  clearAllLayers(): void {
    // Convert to array to avoid iterator issues in downlevel compilation
    Array.from(this.contexts.keys()).forEach(layerType => {
      this.clearLayer(layerType);
    });
  }

  /**
   * Render the timeline header with grid lines using the new time axis system
   */
  renderTimeline(timeMatrix: TimeMatrix, height: number = 60): void {
    const context = this.contexts.get(CanvasLayerType.Timeline);
    if (!context) return;

    const sizeInfo = this.canvasSizes.get(CanvasLayerType.Timeline);
    if (!sizeInfo) return;

    const { width } = sizeInfo;
    
    // Start performance tracking with high precision
    const renderStartTime = performance.now();
    let timeMarker = renderStartTime;

    // Clear the canvas
    this.clearLayer(CanvasLayerType.Timeline);
    
    // Since canvas is 5x viewport width, we need to adjust our time calculations
    // The viewport width is 1/5 of the canvas width
    const viewportWidth = width / 5;
    
    // Get the time range for the center viewport
    const centerTimeRange = timeMatrix.getVisibleTimeRange(viewportWidth);
    const timeSpan = centerTimeRange[1] - centerTimeRange[0];
    
    // Expand to cover the full 5x canvas width (2x on each side)
    const visibleStartTime = centerTimeRange[0] - (timeSpan * 2);
    const visibleEndTime = centerTimeRange[1] + (timeSpan * 2);
    
    // Store current date for "now" line with actual current time
    this.currentDate = new Date();

    // Calculate appropriate time unit and level based on current scale
    // Use viewport width for scale calculation
    const msPerPixel = timeSpan / viewportWidth;
    // MS_PER_DAY is imported from constants
    const pixelsPerDay = MS_PER_DAY / msPerPixel;
    const { unit: timeUnit, level: timeLevel } =
      TimeAxisRenderer.getTimeUnitAndLevelFromScale(msPerPixel);

    // Save the exact pixels per day value for consistent debug display
    this.currentPixelsPerDay = pixelsPerDay;

    // Store the current time unit and level for debugging
    this.currentTimeUnit = timeUnit;
    this.currentTimeLevel = timeLevel;

    // Create a modified transform function that accounts for the 5x canvas
    // We need to shift coordinates by 2 viewport widths to the right
    const transformFn = (time: number) => {
      const x = timeMatrix.transformPoint(time);
      return x + (viewportWidth * 2); // Shift right by 2 viewport widths
    };

    // Calculate appropriate spacing for different time units
    // Use reasonable spacing to prevent label overlap
    let minPixelsBetweenLabels = 50; // Default - significantly reduced
    if (timeUnit === TimeUnit.Second) {
      minPixelsBetweenLabels = 60; // Reduced spacing for seconds
    } else if (timeUnit === TimeUnit.Minute) {
      minPixelsBetweenLabels = 55; // Reduced spacing for minutes
    }

    const { majorGridLines, subgridLines } = this.timeAxisRenderer.generateGridLines(
      visibleStartTime,
      visibleEndTime,
      timeUnit,
      timeLevel,
      transformFn,
      minPixelsBetweenLabels,
    );

    // Store the visible time range and grid lines for other rendering operations
    this.visibleTimeRange = [visibleStartTime, visibleEndTime];
    this.lastTimeMatrix = timeMatrix.clone();
    this.lastMajorGridLines = majorGridLines;
    this.lastSubgridLines = subgridLines;

    // Render the time axis using the time axis renderer
    this.timeAxisRenderer.renderTimeAxis(context, majorGridLines, subgridLines, width, height);
    
    // We've removed the current date line from the timeline header per requirements
  }

  // Track rendering state for better performance
  // Initialize with -1 to ensure we always render horizontal lines on first render
  private lastRowStartRef = -1;
  private lastRowEndRef = -1;
  private lastDebugMode = false; // Track debug mode changes

  /**
   * Render the main chart content with element bars and optimized performance
   * @param timeMatrix The time matrix for coordinate transformation
   * @param elements Array of Gantt chart elements to render
   * @param visibleRowStart The starting row visible in the viewport
   * @param visibleRowEnd The ending row visible in the viewport
   * @param customDateMarkerTime Optional timestamp for the red marker line (overrides current date)
   * @param dependencies Optional array of dependency arrows between elements
   * @param scrollTop The current scroll position
   * @param highlightedDependencies Optional array of highlighted dependency arrows
   * @param selectedElementId Optional ID of selected element for row highlighting
   */
  renderChartContent(
    timeMatrix: TimeMatrix,
    elements: GanttElementType[],
    visibleRowStart: number,
    visibleRowEnd: number,
    customDateMarkerTime?: number,
    dependencies?: GanttDependency[],
    scrollTop?: number,
    highlightedDependencies?: GanttDependency[],
    selectedElementId?: string | null
  ): void {
    const context = this.contexts.get(CanvasLayerType.ChartContent);
    if (!context) return;

    const sizeInfo = this.canvasSizes.get(CanvasLayerType.ChartContent);
    if (!sizeInfo) return;

    const { width, height } = sizeInfo;

    // Start performance tracking
    const renderStartTime = performance.now();

    // Clear the canvas
    this.clearLayer(CanvasLayerType.ChartContent);

    // Save the current context state
    context.save();
    
    // Translate canvas for smooth scrolling
    const scrollOffset = scrollTop || 0;
    context.translate(0, -scrollOffset);

    // Since canvas is 5x viewport width, adjust calculations
    const viewportWidth = width / 5;
    
    // Get visible time range
    let timeRange: [number, number];
    const shouldRecalculateTimeRange =
      !this.lastTimeMatrix ||
      this.lastTimeMatrix.scale !== timeMatrix.scale ||
      this.lastTimeMatrix.translate !== timeMatrix.translate;

    if (shouldRecalculateTimeRange) {
      // Get the time range for the center viewport
      const centerTimeRange = timeMatrix.getVisibleTimeRange(viewportWidth);
      const timeSpan = centerTimeRange[1] - centerTimeRange[0];
      
      // Expand to cover the full 5x canvas width (2x on each side)
      timeRange = [
        centerTimeRange[0] - (timeSpan * 2), 
        centerTimeRange[1] + (timeSpan * 2)
      ];
      
      this.visibleTimeRange = timeRange;
      this.lastTimeMatrix = timeMatrix.clone();
    } else {
      timeRange = this.visibleTimeRange;
    }
    
    // Create a modified time matrix that accounts for the 5x canvas
    const modifiedMatrix = timeMatrix.clone();
    modifiedMatrix.translate += (viewportWidth * 2); // Shift by 2 viewport widths

    // Delegate grid rendering to GridRenderer with modified matrix
    this.gridRenderer.renderGrid(
      context,
      this.lastMajorGridLines || [],
      this.lastSubgridLines || [],
      width, // Full canvas width (3x viewport)
      height,
      elements.length,
      visibleRowStart,
      visibleRowEnd,
      modifiedMatrix, // Use modified matrix
      customDateMarkerTime || this.currentDate.getTime(),
      scrollOffset
    );

    // Render selected element row highlighting (very subtle)
    if (selectedElementId) {
      const selectedElementIndex = elements.findIndex(el => el.id === selectedElementId);
      if (selectedElementIndex !== -1) {
        context.save();
        context.fillStyle = 'rgba(24, 144, 255, 0.06)'; // Subtle blue highlight
        const rowY = selectedElementIndex * ROW_HEIGHT;
        context.fillRect(0, rowY, width, ROW_HEIGHT);
        context.restore();
      }
    }

    // Render dependency arrows first (behind elements)
    if (dependencies && dependencies.length > 0) {
      this.dependencyRenderer.renderDependencies(
        context,
        dependencies,
        elements,
        modifiedMatrix, // Use modified matrix
        visibleRowStart,
        visibleRowEnd,
        highlightedDependencies
      );
    }

    // Delegate element rendering to ElementRenderer with modified matrix
    const renderResult = this.elementRenderer.renderElements(
      context,
      elements,
      modifiedMatrix, // Use modified matrix
      visibleRowStart,
      visibleRowEnd,
      undefined // hoveredElementId
    );
    
    // Update visible elements for debugging
    this.visibleElements = renderResult.visibleElements;
    
    // Restore the context state
    context.restore();
  }













  // Note: Selection functionality was intentionally removed

  /**
   * Fallback implementation of roundRect for browsers without native support
   * (kept for overlay rendering)
   */
  private roundRectPath(
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
  ): void {
    if (width < 2 * radius) radius = width / 2;
    if (height < 2 * radius) radius = height / 2;

    context.beginPath();
    context.moveTo(x + radius, y);
    context.arcTo(x + width, y, x + width, y + height, radius);
    context.arcTo(x + width, y + height, x, y + height, radius);
    context.arcTo(x, y + height, x, y, radius);
    context.arcTo(x, y, x + width, y, radius);
    context.closePath();
  }

  
  


  /**
   * Update renderer configuration
   * @param config Partial configuration to update
   */
  updateConfig(config: Partial<RendererConfig> & { _forceGridLineRedraw?: boolean }): void {
    // Check if zoom level is changing (we'll need to force grid line recalculation)
    const isZoomChanging = 'currentZoom' in config && config.currentZoom !== this.config.currentZoom;
    // Check for explicit request to force grid line redraw
    const forceGridLineRedraw = config._forceGridLineRedraw === true;

    // Handle grid configuration updates separately to merge nested objects properly
    if (config.grid) {
      // Create a new grid config object that properly merges the update
      this.config.grid = {
        major: {
          ...this.config.grid?.major,
          ...config.grid?.major,
        },
        minor: {
          ...this.config.grid?.minor,
          ...config.grid?.minor,
        },
      };

      // Remove grid from the config to avoid double-application
      const { grid, ...restConfig } = config;
      this.config = { ...this.config, ...restConfig };
    } else {
      // Standard update for non-grid properties
      this.config = { ...this.config, ...config };
    }

    // Also update the time axis renderer config with grid settings
    // Instead of creating a new TimeAxisRenderer instance each time, update the existing one
    // This was causing the issue where styling options weren't being applied correctly
    this.timeAxisRenderer = new TimeAxisRenderer({
      labelFontSize: this.config.font.size,
      labelPrimaryColor: this.config.colors.text,
      labelSecondaryColor: this.config.colors.text,
      gridMajorColor: this.config.colors.grid.major,
      gridMinorColor: this.config.colors.grid.minor,
      gridMajorLineWidth: this.config.grid?.major.lineWidth || 1,
      gridMinorLineWidth: this.config.grid?.minor.lineWidth || 0.5,
      gridMajorTimelineTickSize: this.config.grid?.major.timelineTickSize,
      gridMinorTimelineTickSize: this.config.grid?.minor.timelineTickSize,
    });
    
    // Only GridRenderer needs config updates for grid styling
    this.gridRenderer.updateConfig(this.config);
    
    // Clear the grid line cache to force regeneration with new styles
    TimeAxisRenderer.clearCache();

    // When changing zoom or explicitly requested,
    // force a complete recalculation by clearing the cached element lists and grid line positions
    if (isZoomChanging || forceGridLineRedraw) {
      // Reset element rendering caches
      this.visibleElements = [];
      
      // Force grid line recalculation in GridRenderer
      // This ensures horizontal grid lines are redrawn
      if (this.gridRenderer) {
        this.gridRenderer.resetRowReferences();
      }
      
      // Remove internal property before applying to config
      if ('_forceGridLineRedraw' in config) {
        delete (config as any)._forceGridLineRedraw;
      }
    }
  }

  /**
   * Get the current time unit being used for rendering
   * @returns The current time unit or undefined if not set
   */
  getCurrentTimeUnit(): string | undefined {
    return this.currentTimeUnit?.name;
  }
}
