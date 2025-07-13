/**
 * ElementManager.ts
 *
 * Manages Gantt chart elements with efficient virtualization and optimized data handling.
 * Provides a clean API for accessing, filtering and updating elements.
 * Centralizes all virtualization logic to avoid duplication across renderers.
 */

import { GanttElementType, GanttTask, GanttMilestone, GanttGroup } from '../types';
import { TimeMatrix } from './TimeMatrix';
import { ROW_HEIGHT, VIRTUALIZATION_BUFFER_ROWS } from './constants';

/**
 * Position and dimension information for a visible element
 */
export interface VisibleElement {
  element: GanttElementType; // Original element data
  rowIndex: number; // Row in the task list
  screenX1: number; // Start position in pixels
  screenX2: number; // End position in pixels (tasks only)
  screenY: number; // Y-position in pixels
  width: number; // Width in pixels (tasks only)
  isVisible: boolean; // Whether element is within visible bounds
  clippedBounds?: {
    // Clipped bounds if element is partially visible
    x: number;
    width: number;
  };
}

/**
 * Options for element retrieval and filtering
 */
export interface ElementQueryOptions {
  timeRange?: [number, number]; // Visible time range (ms)
  rowRange?: [number, number]; // Visible row range
  types?: ('task' | 'milestone' | 'group')[]; // Filter by element types
  ids?: string[]; // Filter by specific IDs
  includePartiallyVisible?: boolean; // Include elements partially in view
  bufferSize?: {
    // Buffer for virtualization
    time?: number; // Time buffer as percentage (0-1)
    rows?: number; // Row buffer in number of rows
  };
}

/**
 * Result of visibility check for an element
 */
export interface ElementVisibility {
  isVisible: boolean;
  isPartiallyVisible: boolean;
  visiblePortion?: {
    // For partially visible elements
    startRatio: number; // 0-1, how much of start is visible
    endRatio: number; // 0-1, how much of end is visible
  };
}

/**
 * Manages element data, virtualization, and optimized data access
 */
export class ElementManager {
  private elements: GanttElementType[] = [];
  private rowMap: Map<string, number> = new Map(); // Maps element ID to row index
  private indexMap: Map<string, number> = new Map(); // Maps element ID to array index
  // Using fixed row height value ROW_HEIGHT for consistency

  // Simple cache for last query
  private lastVisibleElements: VisibleElement[] = [];

  /**
   * Create a new ElementManager
   * @param elements Initial elements
   */
  constructor(elements: GanttElementType[] = []) {
    this.setElements(elements);
  }

  /**
   * Set or replace all elements
   * @param elements New elements array
   */
  setElements(elements: GanttElementType[]): void {
    this.elements = [...elements];

    // Build row and index mappings
    this.rowMap.clear();
    this.indexMap.clear();
    elements.forEach((element, index) => {
      this.rowMap.set(element.id, index);
      this.indexMap.set(element.id, index);
    });

    // Clear cache
    this.lastVisibleElements = [];
  }

  /**
   * Update a specific element by ID
   * @param id Element ID
   * @param updates Partial updates to apply
   */
  updateElement<T extends GanttElementType>(id: string, updates: Partial<T>): void {
    const index = this.indexMap.get(id);
    if (index === undefined) return;

    // Create updated element
    this.elements[index] = {
      ...this.elements[index],
      ...updates,
    } as GanttElementType;

    // Clear cache
    this.lastVisibleElements = [];
  }

  /**
   * Batch update multiple elements
   * @param updates Map of element ID to updates
   */
  batchUpdateElements(updates: Map<string, Partial<GanttElementType>>): void {
    let hasUpdates = false;

    updates.forEach((update, id) => {
      const index = this.indexMap.get(id);
      if (index !== undefined) {
        this.elements[index] = {
          ...this.elements[index],
          ...update,
        } as GanttElementType;
        hasUpdates = true;
      }
    });

    if (hasUpdates) {
      this.lastVisibleElements = [];
    }
  }

  /**
   * Get the row index for an element
   * @param id Element ID
   * @returns Row index or -1 if not found
   */
  getRowIndex(id: string): number {
    return this.rowMap.get(id) ?? -1;
  }

  /**
   * Calculate the time range of all elements
   * @returns Object with start and end times
   */
  getTimeRange(): { start: number; end: number } {
    if (this.elements.length === 0) {
      // Default to current day if no data
      const now = Date.now();
      return {
        start: now - 12 * 60 * 60 * 1000, // 12 hours before
        end: now + 12 * 60 * 60 * 1000, // 12 hours after
      };
    }

    let start = Number.MAX_SAFE_INTEGER;
    let end = Number.MIN_SAFE_INTEGER;

    // Find earliest start and latest end times
    for (const element of this.elements) {
      if (element.type === 'milestone') {
        const time = element.date;
        start = Math.min(start, time);
        end = Math.max(end, time);
      } else if (element.type === 'task' || element.type === 'group') {
        start = Math.min(start, element.start);
        end = Math.max(end, element.end);
      }
    }

    // Add 5% padding on each side
    const range = end - start;
    const padding = range * 0.05;

    return {
      start: start - padding,
      end: end + padding,
    };
  }

  /**
   * Get all elements matching the query options
   * @param options Query options for filtering
   * @returns Array of elements
   */
  getElements(options: ElementQueryOptions = {}): GanttElementType[] {
    const { timeRange, rowRange, types, ids, includePartiallyVisible } = options;

    // If no filtering is needed, return all elements
    if (!timeRange && !rowRange && !types && !ids) {
      return [...this.elements];
    }

    const result = this.elements.filter((element) => {
      // Filter by ID if specified
      if (ids && !ids.includes(element.id)) {
        return false;
      }

      // Filter by type if specified
      if (types && !types.includes(element.type)) {
        return false;
      }

      // Filter by row range if specified
      if (rowRange) {
        const rowIndex = this.getRowIndex(element.id);
        if (rowIndex < rowRange[0] || rowIndex > rowRange[1]) {
          return false;
        }
      }

      // Filter by time range if specified
      if (timeRange) {
        const visibility = this.checkElementTimeVisibility(element, timeRange);
        const isVisible = includePartiallyVisible
          ? visibility.isVisible || visibility.isPartiallyVisible
          : visibility.isVisible;
        if (!isVisible) {
          return false;
        }
      }

      return true;
    });

    return result;
  }

  /**
   * Check if an element is visible within a time range
   * @param element The element to check
   * @param timeRange The time range to check against
   * @returns Visibility information
   */
  private checkElementTimeVisibility(
    element: GanttElementType,
    timeRange: [number, number],
  ): ElementVisibility {
    // Defensive check for timeRange
    if (!timeRange || !Array.isArray(timeRange) || timeRange.length !== 2) {
      return { isVisible: true, isPartiallyVisible: false };
    }

    const [rangeStart, rangeEnd] = timeRange;

    if (element.type === 'milestone') {
      const isVisible = element.date >= rangeStart && element.date <= rangeEnd;
      return {
        isVisible,
        isPartiallyVisible: false,
      };
    } else if (element.type === 'task' || element.type === 'group') {
      const startsInRange = element.start >= rangeStart && element.start <= rangeEnd;
      const endsInRange = element.end >= rangeStart && element.end <= rangeEnd;
      const spansRange = element.start < rangeStart && element.end > rangeEnd;

      const isVisible = startsInRange && endsInRange;
      const isPartiallyVisible = (startsInRange || endsInRange || spansRange) && !isVisible;

      let visiblePortion;
      if (isPartiallyVisible) {
        const totalDuration = element.end - element.start;
        const visibleStart = Math.max(element.start, rangeStart);
        const visibleEnd = Math.min(element.end, rangeEnd);
        const visibleDuration = visibleEnd - visibleStart;

        visiblePortion = {
          startRatio: (visibleStart - element.start) / totalDuration,
          endRatio: (element.end - visibleEnd) / totalDuration,
        };
      }

      return {
        isVisible,
        isPartiallyVisible,
        visiblePortion,
      };
    }

    return {
      isVisible: false,
      isPartiallyVisible: false,
    };
  }

  /**
   * Get visible elements with screen coordinates
   * Uses cached results when possible for better performance
   *
   * @param timeRange Visible time range
   * @param rowRange Visible row range
   * @param timeMatrix Transform matrix for coordinate conversion
   * @param viewportWidth Width of the visible viewport
   * @returns Array of visible elements with screen coordinates
   */
  getVisibleElements(
    timeRange: [number, number],
    rowRange: [number, number],
    timeMatrix: TimeMatrix,
    viewportWidth: number,
  ): VisibleElement[] {
    // Add buffer to the query range for smoother scrolling
    // This prevents elements from popping in/out at the edges
    const timeBuffer = (timeRange[1] - timeRange[0]) * 0.2;
    const rowBuffer = VIRTUALIZATION_BUFFER_ROWS;

    const bufferTimeRange: [number, number] = [
      timeRange[0] - timeBuffer,
      timeRange[1] + timeBuffer,
    ];

    const bufferRowRange: [number, number] = [
      Math.max(0, rowRange[0] - rowBuffer),
      Math.min(this.elements.length - 1, rowRange[1] + rowBuffer),
    ];

    // Get elements in the buffered range
    const elementsInRange = this.getElements({
      timeRange: bufferTimeRange,
      rowRange: bufferRowRange,
    });

    // Calculate screen positions for each element
    const visibleElements = elementsInRange.map((element) => {
      const rowIndex = this.getRowIndex(element.id);
      const screenY = rowIndex * ROW_HEIGHT;

      if (element.type === 'milestone') {
        const milestone = element as GanttMilestone;
        const screenX = timeMatrix.transformPoint(milestone.date);
        const isVisible = screenX >= -10 && screenX <= viewportWidth + 10;

        return {
          element,
          rowIndex,
          screenX1: screenX,
          screenX2: screenX,
          screenY,
          width: 0,
          isVisible,
        };
      } else {
        const task = element as GanttTask | GanttGroup;
        const screenX1 = timeMatrix.transformPoint(task.start);
        const screenX2 = timeMatrix.transformPoint(task.end);
        const width = Math.max(1, screenX2 - screenX1); // Ensure at least 1px width

        // Check visibility and calculate clipped bounds
        const isFullyVisible = screenX1 >= 0 && screenX2 <= viewportWidth;
        const isPartiallyVisible = screenX1 < viewportWidth && screenX2 > 0 && !isFullyVisible;
        const isVisible = isFullyVisible || isPartiallyVisible;

        let clippedBounds;
        if (isPartiallyVisible) {
          const clippedX = Math.max(0, screenX1);
          const clippedEnd = Math.min(viewportWidth, screenX2);
          clippedBounds = {
            x: clippedX,
            width: clippedEnd - clippedX,
          };
        }

        return {
          element,
          rowIndex,
          screenX1,
          screenX2,
          screenY,
          width,
          isVisible,
          clippedBounds,
        };
      }
    });

    // Store last visible elements and return only actually visible ones
    this.lastVisibleElements = visibleElements;
    return visibleElements.filter((el) => el.isVisible);
  }

  /**
   * Find element at a specific point
   * @param screenX X-coordinate in pixels
   * @param screenY Y-coordinate in pixels
   * @param timeMatrix Transform matrix
   * @param visibleRowOffset Row offset for scrolling
   * @returns Found element or null
   */
  findElementAt(
    screenX: number,
    screenY: number,
    timeMatrix: TimeMatrix,
    visibleRowOffset: number = 0,
  ): GanttElementType | null {
    // Calculate row from y-coordinate accounting for scroll
    const rowIndex = Math.floor(screenY / ROW_HEIGHT) + visibleRowOffset;
    if (rowIndex < 0 || rowIndex >= this.elements.length) {
      return null;
    }

    // Find element at this row
    const element = this.elements[rowIndex];
    if (!element) return null;

    // Convert screen coordinate to time
    const time = timeMatrix.inverseTransformPoint(screenX);

    // Check if point is within element bounds
    if (element.type === 'milestone') {
      // For milestones, use a small clickable area (±5px)
      const milestoneX = timeMatrix.transformPoint(element.date);
      const hitDistance = Math.abs(screenX - milestoneX);
      return hitDistance <= 5 ? element : null;
    } else if (element.type === 'task' || element.type === 'group') {
      // For tasks, check if time is within task duration
      return time >= element.start && time <= element.end ? element : null;
    }

    return null;
  }

  /**
   * Set the row height - Note: This method is kept for backwards compatibility,
   * but it now only invalidates the cache without actually changing the fixed row height.
   */
  setRowHeight(): void {
    // Row height is now fixed, this method is kept for backwards compatibility
    // No action needed
  }

  /**
   * Get the total number of elements
   */
  get count(): number {
    return this.elements.length;
  }

  /**
   * Get the total content height
   */
  get contentHeight(): number {
    return this.elements.length * ROW_HEIGHT;
  }

  /**
   * Get elements grouped by type for optimized rendering
   * @param elements Array of elements to group
   * @returns Elements grouped by type
   */
  groupElementsByType(elements: GanttElementType[]): {
    tasks: GanttTask[];
    milestones: GanttMilestone[];
    groups: GanttGroup[];
  } {
    const tasks: GanttTask[] = [];
    const milestones: GanttMilestone[] = [];
    const groups: GanttGroup[] = [];

    for (const element of elements) {
      switch (element.type) {
        case 'task':
          tasks.push(element as GanttTask);
          break;
        case 'milestone':
          milestones.push(element as GanttMilestone);
          break;
        case 'group':
          groups.push(element as GanttGroup);
          break;
      }
    }

    return { tasks, milestones, groups };
  }

  /**
   * Get visible elements grouped by type with screen coordinates
   * @param timeRange Visible time range
   * @param rowRange Visible row range
   * @param timeMatrix Transform matrix
   * @param viewportWidth Viewport width
   * @returns Grouped visible elements
   */
  getVisibleElementsGrouped(
    timeRange: [number, number],
    rowRange: [number, number],
    timeMatrix: TimeMatrix,
    viewportWidth: number,
  ): {
    tasks: VisibleElement[];
    milestones: VisibleElement[];
    groups: VisibleElement[];
    total: number;
  } {
    const visibleElements = this.getVisibleElements(timeRange, rowRange, timeMatrix, viewportWidth);

    const tasks: VisibleElement[] = [];
    const milestones: VisibleElement[] = [];
    const groups: VisibleElement[] = [];

    for (const visibleEl of visibleElements) {
      switch (visibleEl.element.type) {
        case 'task':
          tasks.push(visibleEl);
          break;
        case 'milestone':
          milestones.push(visibleEl);
          break;
        case 'group':
          groups.push(visibleEl);
          break;
      }
    }

    return {
      tasks,
      milestones,
      groups,
      total: visibleElements.length,
    };
  }

  /**
   * Get elements prepared for rendering with row information
   * This is the primary method for renderers to get elements
   * @param timeRange Visible time range
   * @param rowRange Visible row range
   * @param options Additional filtering options
   * @returns Elements with row information included
   */
  getElementsForRendering(
    timeRange: [number, number],
    rowRange: [number, number],
    options: { includeBuffer?: boolean } = {},
  ): Array<GanttElementType & { row: number }> {
    // Apply buffer if requested
    let effectiveRowRange = rowRange;
    let effectiveTimeRange = timeRange;

    if (options.includeBuffer) {
      const timeBuffer = (timeRange[1] - timeRange[0]) * 0.1;
      const rowBuffer = VIRTUALIZATION_BUFFER_ROWS;

      effectiveTimeRange = [timeRange[0] - timeBuffer, timeRange[1] + timeBuffer];

      effectiveRowRange = [
        Math.max(0, rowRange[0] - rowBuffer),
        Math.min(this.elements.length - 1, rowRange[1] + rowBuffer),
      ];
    }

    // Get filtered elements
    const filteredElements = this.getElements({
      timeRange: effectiveTimeRange,
      rowRange: effectiveRowRange,
      includePartiallyVisible: true,
    });

    // Add row information to each element
    return filteredElements.map((element) => ({
      ...element,
      row: this.getRowIndex(element.id),
    }));
  }
}
