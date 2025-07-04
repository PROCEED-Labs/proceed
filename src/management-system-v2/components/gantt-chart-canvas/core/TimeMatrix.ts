/**
 * TimeMatrix.ts
 *
 * Provides precise coordinate transformation between time-based world coordinates
 * and screen pixel coordinates. This is the mathematical foundation for accurate zooming.
 */

import { 
  timeToPixel, 
  pixelToTime, 
  calculateVisibleTimeRange,
  applyZoomAroundPoint 
} from '../utils/mathUtils';

// Base time is set per-instance in constructor

/**
 * Handles coordinate transformations between world (time) and screen (pixels) space.
 * Uses a matrix approach for maximum precision during zoom operations.
 *
 * This implementation uses time-relative calculations to avoid precision issues with large timestamp values.
 */
export class TimeMatrix {
  // Store the base time for relative calculations
  private baseTime: number;

  /**
   * Create a new transformation matrix
   * @param scale The scale factor (zoom level)
   * @param translate The translation amount (pan position)
   * @param baseTime Optional base time for relative calculations (defaults to current center time)
   */
  constructor(
    public scale: number,
    public translate: number,
    baseTime?: number,
  ) {
    this.baseTime = baseTime ?? Date.now();
  }

  /**
   * Transform a time value (world coordinate) to screen pixel position
   * using relative time to avoid precision issues with large timestamps
   * @param worldX Time value in milliseconds
   * @returns Pixel position on screen
   */
  transformPoint(worldX: number): number {
    const relativeTime = worldX - this.baseTime;
    return timeToPixel(relativeTime, this.scale, this.translate);
  }


  /**
   * Transform a screen pixel position to time value (world coordinate)
   * @param screenX Pixel position on screen
   * @returns Time value in milliseconds
   */
  inverseTransformPoint(screenX: number): number {
    const relativeTime = pixelToTime(screenX, this.scale, this.translate);
    return relativeTime + this.baseTime;
  }

  /**
   * Scale a vector from screen space to world space
   * Used for converting mouse movement to time-space movement
   * @param screenDelta Movement distance in screen pixels
   * @returns Movement amount in world units (milliseconds)
   */
  inverseScaleVector(screenDelta: number): number {
    return screenDelta / this.scale;
  }

  /**
   * Create a new transform matrix that maintains a fixed focal point during zoom
   * This is the core function for accurate zooming without drift
   *
   * @param newScale New scale factor to apply
   * @param focalPointWorld The world coordinate (time) that should remain fixed in screen space
   * @returns A new matrix with adjusted scale and translation
   */
  createZoomedMatrix(newScale: number, focalPointWorld: number): TimeMatrix {
    // Calculate the current screen position of the focal point
    const focalPointScreen = this.transformPoint(focalPointWorld);
    
    // Convert to relative coordinates for the pure function
    const relativeFocalPoint = focalPointWorld - this.baseTime;
    const focalPixel = timeToPixel(relativeFocalPoint, this.scale, this.translate);
    
    // Use pure function to calculate new transform
    const zoomFactor = newScale / this.scale;
    const { scale: _, translate: newTranslate } = applyZoomAroundPoint(
      this.scale,
      this.translate,
      zoomFactor,
      focalPixel
    );
    
    // Create new matrix with calculated values
    return new TimeMatrix(newScale, newTranslate, this.baseTime);
  }

  /**
   * Get the visible time range based on the current transformation and viewport width
   * @param viewportWidth Width of the visible area in pixels
   * @returns {[number, number]} Start and end time in milliseconds
   */
  getVisibleTimeRange(viewportWidth: number): [number, number] {
    // Use pure function for calculation, but need to adjust for base time
    const [relativeStart, relativeEnd] = calculateVisibleTimeRange(viewportWidth, this.scale, this.translate);
    return [relativeStart + this.baseTime, relativeEnd + this.baseTime];
  }

  /**
   * Clone this matrix
   * @returns A new TimeMatrix with the same values
   */
  clone(): TimeMatrix {
    return new TimeMatrix(this.scale, this.translate, this.baseTime);
  }
  
  /**
   * Get the base time used for relative calculations
   * @returns The base time in milliseconds
   */
  getBaseTime(): number {
    return this.baseTime;
  }
  
  /**
   * Create a new matrix specifically for a given data range
   * @param dataStart Start time of data range
   * @param dataEnd End time of data range
   * @param viewportWidth Available width in pixels
   * @param padding Padding factor (0-1, default 0.1 for 10% padding)
   * @returns A new TimeMatrix properly set up for the data range
   */
  static createForDataRange(
    dataStart: number,
    dataEnd: number,
    viewportWidth: number,
    scale: number,
    padding: number = 0.1
  ): TimeMatrix {
    // Use the data start as the base time for relative calculations
    const baseTime = dataStart;
    
    // Calculate time span with padding
    const timeSpan = dataEnd - dataStart;
    const paddedTimeSpan = timeSpan * (1 + padding * 2);
    
    // Create matrix with the provided scale and the data start as base time
    const matrix = new TimeMatrix(scale, 0, baseTime);
    
    // Calculate where data center would be with zero translation
    const dataCenterTime = (dataStart + dataEnd) / 2;
    const dataCenterPixel = matrix.transformPoint(dataCenterTime);
    
    // Calculate translation to center the data
    const viewportCenterX = viewportWidth / 2;
    const translation = viewportCenterX - dataCenterPixel;
    
    // Set the translation
    matrix.translate = translation;
    
    return matrix;
  }
}