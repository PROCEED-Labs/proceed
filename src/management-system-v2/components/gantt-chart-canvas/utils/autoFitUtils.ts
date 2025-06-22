/**
 * Auto-fit utilities for calculating optimal zoom and position to display all data
 */

import { GanttElementType } from '../types';
import { ZoomCurveCalculator, ZOOM_PRESETS, getTimeUnitForScale } from '../core/ZoomCurveCalculator';

export interface DataRange {
  start: number;
  end: number;
}

export interface AutoFitResult {
  zoom: number;
  centerTime: number;
  dataRange: DataRange;
}

/**
 * Calculate the time range that encompasses all elements
 */
export function calculateDataTimeRange(elements: GanttElementType[]): DataRange {
  if (!elements || elements.length === 0) {
    // Default to current day if no data
    const now = Date.now();
    return {
      start: now - 12 * 60 * 60 * 1000, // 12 hours before
      end: now + 12 * 60 * 60 * 1000, // 12 hours after
    };
  }

  let minTime = Number.MAX_SAFE_INTEGER;
  let maxTime = Number.MIN_SAFE_INTEGER;

  elements.forEach((element) => {
    if (element.type === 'milestone') {
      if (element.start && element.start > 0) {
        minTime = Math.min(minTime, element.start);
        maxTime = Math.max(maxTime, element.start);
      }
      if (element.end && element.end > 0) {
        maxTime = Math.max(maxTime, element.end);
      }
    } else if (element.type === 'task' || element.type === 'group') {
      if (element.start && element.start > 0) {
        minTime = Math.min(minTime, element.start);
      }
      if (element.end && element.end > 0) {
        maxTime = Math.max(maxTime, element.end);
      }
    }
  });

  // Fallback if no valid timestamps found
  if (minTime === Number.MAX_SAFE_INTEGER || maxTime === Number.MIN_SAFE_INTEGER) {
    const now = Date.now();
    return {
      start: now - 12 * 60 * 60 * 1000,
      end: now + 12 * 60 * 60 * 1000,
    };
  }

  return {
    start: minTime,
    end: maxTime,
  };
}

/**
 * Calculate optimal zoom level and position to fit all data in viewport
 */
export function calculateAutoFit(
  elements: GanttElementType[],
  viewportWidth: number,
  padding: number = 0.1
): AutoFitResult {
  const dataRange = calculateDataTimeRange(elements);
  
  
  const centerTime = (dataRange.start + dataRange.end) / 2;
  
  // Add padding to the data range
  const timeSpan = dataRange.end - dataRange.start;
  
  // Simple, natural padding - let the zoom curve handle the scaling appropriately
  const paddedTimeSpan = timeSpan * (1 + padding * 2);
  
  // Calculate the scale needed to fit the padded time span in the viewport
  // Scale should be pixels per millisecond (how many pixels each ms takes up)
  const requiredScale = viewportWidth / paddedTimeSpan;
  
  
  // Convert scale to zoom level using ZoomCurveCalculator
  const zoomCalculator = new ZoomCurveCalculator(ZOOM_PRESETS.DEFAULT);
  
  // Check if required scale is within zoom curve range
  const { minScale, maxScale } = zoomCalculator.getConfig();
  let zoom: number;
  
  if (requiredScale < minScale) {
    // Required scale is too small (too zoomed out) - use minimum zoom
    zoom = 0;
  } else if (requiredScale > maxScale) {
    // Required scale is too large (too zoomed in) - use maximum zoom  
    zoom = 100;
  } else {
    // Required scale is within range - use normal calculation
    zoom = zoomCalculator.scaleToZoom(requiredScale);
  }
  
  // Clamp zoom to valid range (0-100) - should already be within range but safety check
  const clampedZoom = Math.max(0, Math.min(100, zoom));
  
  return {
    zoom: clampedZoom,
    centerTime,
    dataRange,
  };
}

/**
 * Check if auto-fit should be applied based on options
 */
export function shouldAutoFit(
  autoFitToData?: boolean,
  hasExplicitZoom: boolean = false,
  hasExplicitPosition: boolean = false
): boolean {
  // Only auto-fit if explicitly enabled and no manual zoom/position specified
  return autoFitToData === true && !hasExplicitZoom && !hasExplicitPosition;
}