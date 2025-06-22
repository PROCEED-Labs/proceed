/**
 * GridRenderer.ts
 * 
 * Handles rendering of grid lines and time axis for the Gantt chart.
 * Separated from CanvasRenderer for better maintainability and single responsibility.
 */

import { TimeMatrix } from '../TimeMatrix';
import { TimeAxisRenderer, TimeAxisGridLine } from '../TimeAxisRenderer';
import { TimeUnit } from '../TimeUnits';
import { 
  GRID_LINE_COLOR,
  GRID_LINE_WIDTH,
  TODAY_LINE_COLOR,
  TODAY_LINE_WIDTH,
  ROW_HEIGHT,
  HEADER_HEIGHT
} from '../constants';

export class GridRenderer {
  private gridLineCache: Map<string, TimeAxisGridLine[]> = new Map();
  private lastCacheKey: string = '';
  private config: any;
  private lastRowStartRef: number = -1;
  private lastRowEndRef: number = -1;
  
  constructor(config: any) {
    this.config = config;
  }
  
  /**
   * Render vertical grid lines based on time axis
   */
  renderGridLines(
    context: CanvasRenderingContext2D,
    width: number,
    height: number,
    timeMatrix: TimeMatrix,
    visibleStartTime: number,
    visibleEndTime: number,
    currentDate: Date,
    timeUnit: TimeUnit,
    timeLevel: 'primary' | 'secondary',
    pixelRatio: number = 1
  ): void {
    // Create cache key from parameters that affect grid lines
    const cacheKey = `${visibleStartTime}-${visibleEndTime}-${width}-${timeUnit}-${timeLevel}`;
    
    let gridLines: TimeAxisGridLine[];
    
    // Check if we can use cached grid lines
    if (this.gridLineCache.has(cacheKey)) {
      gridLines = this.gridLineCache.get(cacheKey)!;
    } else {
      // Generate new grid lines
      const timeAxisRenderer = new TimeAxisRenderer({} as any);
      gridLines = timeAxisRenderer.generateGridLines(
        visibleStartTime,
        visibleEndTime,
        timeUnit,
        timeLevel,
        (time: number) => timeMatrix.transformPoint(time),
        50
      );
      
      // Cache the result
      this.gridLineCache.set(cacheKey, gridLines);
      
      // Clear old cache entries if we have too many
      if (this.gridLineCache.size > 10) {
        // Keep only the most recent entries
        const keysToDelete = Array.from(this.gridLineCache.keys()).slice(0, -5);
        keysToDelete.forEach(key => this.gridLineCache.delete(key));
      }
    }
    
    this.lastCacheKey = cacheKey;
    
    // Set up line style
    context.strokeStyle = GRID_LINE_COLOR;
    context.lineWidth = GRID_LINE_WIDTH * pixelRatio;
    context.setLineDash([]);
    
    // Draw grid lines
    context.beginPath();
    gridLines.forEach(gridLine => {
      if (gridLine.screenX >= 0 && gridLine.screenX <= width) {
        context.moveTo(Math.floor(gridLine.screenX) + 0.5, 0);
        context.lineTo(Math.floor(gridLine.screenX) + 0.5, height);
      }
    });
    context.stroke();
    
    // Draw today line if visible
    const todayX = timeMatrix.transformPoint(currentDate.getTime());
    if (todayX >= 0 && todayX <= width) {
      context.strokeStyle = TODAY_LINE_COLOR;
      context.lineWidth = TODAY_LINE_WIDTH * pixelRatio;
      context.beginPath();
      context.moveTo(Math.floor(todayX) + 0.5, 0);
      context.lineTo(Math.floor(todayX) + 0.5, height);
      context.stroke();
    }
  }
  
  /**
   * Render horizontal row lines
   */
  renderRowLines(
    context: CanvasRenderingContext2D,
    width: number,
    visibleRowStart: number,
    visibleRowEnd: number,
    pixelRatio: number = 1
  ): void {
    context.strokeStyle = GRID_LINE_COLOR;
    context.lineWidth = GRID_LINE_WIDTH * pixelRatio;
    context.setLineDash([]);
    
    // Draw horizontal lines for each row
    context.beginPath();
    for (let row = visibleRowStart; row <= visibleRowEnd + 1; row++) {
      const y = row * ROW_HEIGHT;
      context.moveTo(0, Math.floor(y) + 0.5);
      context.lineTo(width, Math.floor(y) + 0.5);
    }
    context.stroke();
  }
  
  /**
   * Clear grid line cache when configuration changes
   */
  clearCache(): void {
    this.gridLineCache.clear();
    this.lastCacheKey = '';
  }
  
  /**
   * Get grid lines for current view (used by time axis header)
   */
  getGridLines(cacheKey?: string): TimeAxisGridLine[] | undefined {
    const key = cacheKey || this.lastCacheKey;
    return this.gridLineCache.get(key);
  }
  
  /**
   * Render both vertical grid lines and horizontal row lines
   */
  renderGrid(
    context: CanvasRenderingContext2D,
    majorGridLines: TimeAxisGridLine[],
    subgridLines: TimeAxisGridLine[],
    width: number,
    height: number,
    totalElements: number,
    visibleRowStart: number,
    visibleRowEnd: number,
    timeMatrix: TimeMatrix,
    currentDateTime: number,
    scrollOffset: number = 0
  ): void {
    // Fill background first - account for scroll offset in translated context
    context.fillStyle = this.config.colors.background || '#FFFFFF';
    // Since context is already translated by -scrollOffset, we need to draw from scrollOffset
    context.fillRect(0, scrollOffset, width, height);
    
    // Draw minor grid lines first (behind major lines)
    if (subgridLines && subgridLines.length > 0) {
      context.strokeStyle = this.config.colors.grid.minor;
      context.lineWidth = this.config.grid?.minor.lineWidth || 0.5;
      context.setLineDash([]);
      
      context.beginPath();
      subgridLines.forEach(line => {
        if (line.screenX >= 0 && line.screenX <= width) {
          context.moveTo(Math.floor(line.screenX) + 0.5, 0);
          context.lineTo(Math.floor(line.screenX) + 0.5, height);
        }
      });
      context.stroke();
    }
    
    // Draw major grid lines on top
    if (majorGridLines && majorGridLines.length > 0) {
      context.strokeStyle = this.config.colors.grid.major;
      context.lineWidth = this.config.grid?.major.lineWidth || 1;
      context.setLineDash([]);
      
      context.beginPath();
      majorGridLines.forEach(line => {
        if (line.screenX >= 0 && line.screenX <= width) {
          context.moveTo(Math.floor(line.screenX) + 0.5, 0);
          context.lineTo(Math.floor(line.screenX) + 0.5, height);
        }
      });
      context.stroke();
    }
    
    // Draw horizontal row lines
    // visibleRowStart and visibleRowEnd are already row indices, not pixel values
    this.renderRowLines(context, width, visibleRowStart, visibleRowEnd);
    
    // Draw current date marker
    const markerX = timeMatrix.transformPoint(currentDateTime);
    if (markerX >= 0 && markerX <= width) {
      context.strokeStyle = TODAY_LINE_COLOR;
      context.lineWidth = TODAY_LINE_WIDTH;
      context.setLineDash([]);
      
      context.beginPath();
      context.moveTo(Math.floor(markerX) + 0.5, 0);
      context.lineTo(Math.floor(markerX) + 0.5, height);
      context.stroke();
    }
    
    // Update row references for optimization tracking
    this.lastRowStartRef = visibleRowStart;
    this.lastRowEndRef = visibleRowEnd;
  }
  
  /**
   * Reset row references (for optimization tracking)
   */
  resetRowReferences(): void {
    this.lastRowStartRef = -1;
    this.lastRowEndRef = -1;
  }
  
  /**
   * Get last row references (for optimization tracking)
   */
  getLastRowReferences(): { lastRowStartRef: number; lastRowEndRef: number } {
    return {
      lastRowStartRef: this.lastRowStartRef,
      lastRowEndRef: this.lastRowEndRef
    };
  }
  
  /**
   * Update renderer configuration
   */
  updateConfig(config: any): void {
    this.config = config;
  }
}