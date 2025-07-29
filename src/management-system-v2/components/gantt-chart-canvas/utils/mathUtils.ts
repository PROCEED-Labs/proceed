/**
 * Mathematical utility functions for the Gantt Chart Canvas
 *
 * Pure functions for coordinate transformations, time calculations,
 * and other mathematical operations. Following CLAUDE.md guidelines
 * for using pure functions for mathematical operations.
 */

import { MS_PER_DAY, MS_PER_HOUR, MS_PER_MINUTE } from '../core/constants';

/**
 * Convert time (milliseconds) to pixel position using scale and translate
 * Pure function implementation of coordinate transformation
 */
export function timeToPixel(time: number, scale: number, translate: number): number {
  return time * scale + translate;
}

/**
 * Convert pixel position to time (milliseconds) using scale and translate
 * Inverse of timeToPixel
 */
export function pixelToTime(pixel: number, scale: number, translate: number): number {
  return (pixel - translate) / scale;
}

/**
 * Calculate visible time range for a given viewport
 */
export function calculateVisibleTimeRange(
  viewportWidth: number,
  scale: number,
  translate: number,
): [number, number] {
  const startTime = pixelToTime(0, scale, translate);
  const endTime = pixelToTime(viewportWidth, scale, translate);
  return [startTime, endTime];
}

/**
 * Calculate scale factor to fit a time range in viewport
 */
export function calculateScaleToFit(
  startTime: number,
  endTime: number,
  viewportWidth: number,
  padding: number = 0,
): number {
  const duration = endTime - startTime;
  const availableWidth = viewportWidth - padding * 2;
  return availableWidth / duration;
}

/**
 * Calculate translate value to center a time range in viewport
 */
export function calculateTranslateToCenter(
  startTime: number,
  endTime: number,
  viewportWidth: number,
  scale: number,
): number {
  const centerTime = (startTime + endTime) / 2;
  const centerPixel = viewportWidth / 2;
  return centerPixel - centerTime * scale;
}

/**
 * Apply zoom transformation around a focal point
 * Returns new scale and translate values
 */
export function applyZoomAroundPoint(
  currentScale: number,
  currentTranslate: number,
  zoomFactor: number,
  focalPointPixel: number,
): { scale: number; translate: number } {
  // Convert focal point to time before zoom
  const focalTime = pixelToTime(focalPointPixel, currentScale, currentTranslate);

  // Apply zoom to scale
  const newScale = currentScale * zoomFactor;

  // Calculate new translate to maintain focal point
  const newTranslate = focalPointPixel - focalTime * newScale;

  return { scale: newScale, translate: newTranslate };
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Round to nearest pixel for crisp rendering
 */
export function roundToPixel(value: number, pixelRatio: number = 1): number {
  return Math.round(value * pixelRatio) / pixelRatio;
}

/**
 * Calculate row index from Y position
 */
export function yPositionToRow(y: number, rowHeight: number): number {
  return Math.floor(y / rowHeight);
}

/**
 * Calculate Y position from row index
 */
export function rowToYPosition(row: number, rowHeight: number): number {
  return row * rowHeight;
}

/**
 * Check if two time ranges overlap
 */
export function timeRangesOverlap(
  start1: number,
  end1: number,
  start2: number,
  end2: number,
): boolean {
  return start1 <= end2 && end1 >= start2;
}

/**
 * Calculate the intersection of two time ranges
 * Returns null if no intersection
 */
export function timeRangeIntersection(
  start1: number,
  end1: number,
  start2: number,
  end2: number,
): [number, number] | null {
  if (!timeRangesOverlap(start1, end1, start2, end2)) {
    return null;
  }

  return [Math.max(start1, start2), Math.min(end1, end2)];
}

/**
 * Calculate visible row range with optional buffer
 */
export function calculateVisibleRows(
  scrollTop: number,
  viewportHeight: number,
  rowHeight: number,
  totalRows: number,
  bufferRows: number = 0,
): { start: number; end: number } {
  const start = Math.max(0, Math.floor(scrollTop / rowHeight) - bufferRows);
  const end = Math.min(
    totalRows - 1,
    Math.ceil((scrollTop + viewportHeight) / rowHeight) + bufferRows,
  );

  return { start, end };
}

/**
 * Linear interpolation between two values
 */
export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

/**
 * Inverse linear interpolation - find t given value between start and end
 */
export function inverseLerp(start: number, end: number, value: number): number {
  if (end - start === 0) return 0;
  return (value - start) / (end - start);
}

/**
 * Map a value from one range to another
 */
export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
): number {
  const t = inverseLerp(inMin, inMax, value);
  return lerp(outMin, outMax, t);
}

/**
 * Calculate optimal time unit for a given pixel density
 */
export function calculateOptimalTimeUnit(pixelsPerDay: number): {
  unit: 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';
  pixelsPerUnit: number;
} {
  const units = [
    { unit: 'hour' as const, pixelsPerUnit: pixelsPerDay / 24 },
    { unit: 'day' as const, pixelsPerUnit: pixelsPerDay },
    { unit: 'week' as const, pixelsPerUnit: pixelsPerDay * 7 },
    { unit: 'month' as const, pixelsPerUnit: pixelsPerDay * 30 },
    { unit: 'quarter' as const, pixelsPerUnit: pixelsPerDay * 91 },
    { unit: 'year' as const, pixelsPerUnit: pixelsPerDay * 365 },
  ];

  // Find the unit that gives approximately 50-200 pixels per unit
  const optimal = units.find((u) => u.pixelsPerUnit >= 50 && u.pixelsPerUnit <= 200);

  return optimal || units[units.length - 1];
}
