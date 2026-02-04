'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { GanttChartOptions, GanttChartState, GanttElementType } from '../types';
import { TimeMatrix, ZoomCurveCalculator } from '../core';
import { DEFAULT_TASK_LIST_WIDTH, DEFAULT_ZOOM, ROW_HEIGHT } from '../core/constants';
import { calculateAutoFit, shouldAutoFit } from '../utils/autoFitUtils';

/**
 * Main hook for Gantt chart functionality
 */
export function useGanttChart(elements: GanttElementType[], options: GanttChartOptions = {}) {
  // Static properties are added to the function object
  // Extract options with defaults
  const {
    taskListWidth = DEFAULT_TASK_LIST_WIDTH,
    initialZoom = DEFAULT_ZOOM,
    initialPosition,
    autoFitToData = false,
    autoFitPadding = 0.1,
    onZoomChange,
    onViewChange,
  } = options;

  // Canvas refs for each layer
  const timelineCanvasRef = useRef<HTMLCanvasElement>(null);
  const chartCanvasRef = useRef<HTMLCanvasElement>(null);

  // Container refs
  const containerRef = useRef<HTMLDivElement>(null);
  const taskListRef = useRef<HTMLDivElement>(null);

  // Track initialization state
  const hasInitializedRef = useRef(false);

  // State for the chart
  // State will be properly initialized by initializeTimeMatrix
  const [state, setState] = useState<GanttChartState>({
    zoom: 0, // Will be set during initialization
    visibleTimeStart: 0,
    visibleTimeEnd: 0,
    taskListWidth,
    scrollLeft: 0,
    isDragging: false,
    isResizing: false,
    panOffset: 0,
  });

  // Create and maintain transformation matrix with default values
  // We'll initialize this properly in useEffect
  const timeMatrixRef = useRef(new TimeMatrix(initialZoom / 5000, 0));

  // Calculate data time range
  const calculateDataRange = useCallback(() => {
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
        // Ensure valid timestamp for milestone start
        if (element.start && element.start > 0) {
          minTime = Math.min(minTime, element.start);
          maxTime = Math.max(maxTime, element.start);
        }
        // Also check milestone end if present
        if (element.end && element.end > 0) {
          maxTime = Math.max(maxTime, element.end);
        }
      } else {
        // Ensure valid timestamps for task start/end
        if (element.start && element.start > 0) {
          minTime = Math.min(minTime, element.start);
        }
        if (element.end && element.end > 0) {
          maxTime = Math.max(maxTime, element.end);
        }
      }
    });

    // If no valid timestamps were found, default to current time
    if (minTime === Number.MAX_SAFE_INTEGER || maxTime === Number.MIN_SAFE_INTEGER) {
      const now = Date.now();
      minTime = now - 12 * 60 * 60 * 1000; // 12 hours before
      maxTime = now + 12 * 60 * 60 * 1000; // 12 hours after
    }

    // Add 5% padding on each side
    const range = maxTime - minTime;
    const padding = Math.max(range * 0.05, 60 * 60 * 1000); // At least 1 hour padding

    return {
      start: minTime - padding,
      end: maxTime + padding,
    };
  }, [elements]);

  // Get currently available chart width
  const getChartWidth = useCallback(() => {
    if (!containerRef.current) return 800;
    return containerRef.current.clientWidth - state.taskListWidth;
  }, [state.taskListWidth]);

  // Initialize the time matrix based on data range and auto-fit options
  const initializeTimeMatrix = useCallback(() => {
    const chartWidth = getChartWidth();

    // Create a zoom curve calculator if not already available
    const zoomCalculator =
      useGanttChart.zoomCurveCalculator ||
      (useGanttChart.zoomCurveCalculator = new ZoomCurveCalculator('DEFAULT'));

    let calculatedZoom = initialZoom;
    let centerTime: number;
    let dataRange = calculateDataRange();

    // Check if zoom/position were explicitly provided in options
    const hasExplicitZoom = options.initialZoom !== undefined;
    const hasExplicitPosition = options.initialPosition !== undefined;

    // Check if we should auto-fit to data
    if (shouldAutoFit(autoFitToData, hasExplicitZoom, hasExplicitPosition)) {
      // Use auto-fit calculations
      const autoFitResult = calculateAutoFit(elements, chartWidth, autoFitPadding);
      calculatedZoom = autoFitResult.zoom;
      centerTime = autoFitResult.centerTime;
      dataRange = autoFitResult.dataRange;
    } else {
      // Use manual positioning or default centering
      centerTime = initialPosition ?? (dataRange.start + dataRange.end) / 2;
    }

    // Get scale from the calculated zoom level
    const scaleFromZoomCurve = zoomCalculator.calculateScale(calculatedZoom);

    // Create matrix centered on the calculated center time
    // We want the center time to appear at the center of the viewport
    const centerScreenX = chartWidth / 2;

    // Create matrix with centerTime as baseTime and proper translation
    // When baseTime = centerTime, the relative time at center is 0
    // So translate should equal centerScreenX to position it at viewport center
    const matrix = new TimeMatrix(scaleFromZoomCurve, centerScreenX, centerTime);

    // Set the matrix to our reference
    timeMatrixRef.current = matrix;

    // Get the actual visible time range with our properly set up matrix
    const visibleRange = matrix.getVisibleTimeRange(chartWidth);

    // Update state with this visible range AND the calculated zoom
    setState((prev) => ({
      ...prev,
      visibleTimeStart: visibleRange[0],
      visibleTimeEnd: visibleRange[1],
      zoom: calculatedZoom,
    }));
  }, [
    calculateDataRange,
    getChartWidth,
    initialZoom,
    initialPosition,
    autoFitToData,
    autoFitPadding,
    elements,
    options,
  ]);

  // Handle zoom change with precise center point maintenance and baseTime preservation
  const handleZoomChange = useCallback(
    (newZoom: number, centerX?: number) => {
      if (newZoom === state.zoom) return;

      const matrix = timeMatrixRef.current;
      const chartWidth = getChartWidth();

      // Default to center of viewport if no specific point provided
      const focalPointX = centerX ?? chartWidth / 2;

      // Convert focal point from screen to world coordinates (time)
      const focalPointTime = matrix.inverseTransformPoint(focalPointX);

      // Calculate new scale based on zoom level using the ZoomCurveCalculator
      const zoomCurveCalculator =
        useGanttChart.zoomCurveCalculator ||
        (useGanttChart.zoomCurveCalculator = new ZoomCurveCalculator('DEFAULT'));

      // Let the calculator handle all the complex scaling logic
      const newScale = zoomCurveCalculator.calculateScale(newZoom);

      // Create new matrix with zoom centered on focal point
      // This will preserve the baseTime from the original matrix
      const newMatrix = matrix.createZoomedMatrix(newScale, focalPointTime);

      // Always update the matrix for accurate rendering
      timeMatrixRef.current = newMatrix;

      // Get new visible time range
      const visibleRange = newMatrix.getVisibleTimeRange(chartWidth);

      setState((prev) => ({
        ...prev,
        zoom: newZoom,
        visibleTimeStart: visibleRange[0],
        visibleTimeEnd: visibleRange[1],
      }));

      // Notify about zoom change
      onZoomChange?.(newZoom);
      onViewChange?.(visibleRange);
    },
    [state.zoom, getChartWidth, onZoomChange, onViewChange],
  );

  // Track buffer state for re-rendering
  const bufferStateRef = useRef({
    lastRenderOffset: 0,
  });

  // Throttle state updates during panning to prevent excessive re-renders
  const panUpdateThrottleRef = useRef<NodeJS.Timeout | null>(null);

  // Handle pan operation with proper state management and throttling
  const handlePan = useCallback(
    (deltaX: number, isTemporary: boolean = true) => {
      const matrix = timeMatrixRef.current;
      const chartWidth = getChartWidth();

      if (isTemporary) {
        // During dragging, update pan offset in state for smooth rendering
        // Calculate offset relative to the last render position
        const relativePanOffset = deltaX - bufferStateRef.current.lastRenderOffset;

        // Clear any pending throttled updates
        if (panUpdateThrottleRef.current) {
          clearTimeout(panUpdateThrottleRef.current);
        }

        // Throttle state updates to prevent excessive re-renders
        // Update immediately for significant changes, throttle small changes
        const offsetChange = Math.abs(relativePanOffset - (state.panOffset || 0));

        if (offsetChange > 5) {
          // Large changes: update immediately for responsiveness
          setState((prev) => ({
            ...prev,
            panOffset: relativePanOffset,
          }));
        } else if (offsetChange > 1) {
          // Small changes: throttle to reduce render frequency
          panUpdateThrottleRef.current = setTimeout(() => {
            setState((prev) => ({
              ...prev,
              panOffset: relativePanOffset,
            }));
          }, 16); // ~60fps max
        }

        // With 5x canvas buffer (2x on each side), minimal re-renders needed during normal panning
        // Buffer covers 200% viewport width in each direction - more than enough for typical usage
      } else {
        // When pan ends, clear any pending throttled updates
        if (panUpdateThrottleRef.current) {
          clearTimeout(panUpdateThrottleRef.current);
          panUpdateThrottleRef.current = null;
        }

        // Update the time matrix and reset pan offset
        matrix.translate += deltaX - bufferStateRef.current.lastRenderOffset;
        bufferStateRef.current.lastRenderOffset = 0;

        const visibleRange = matrix.getVisibleTimeRange(chartWidth);

        // Update state with final position and reset pan offset
        setState((prev) => ({
          ...prev,
          visibleTimeStart: visibleRange[0],
          visibleTimeEnd: visibleRange[1],
          panOffset: 0,
        }));

        // Notify about view change
        onViewChange?.(visibleRange);
      }
    },
    [getChartWidth, onViewChange], // Exclude state.panOffset to prevent infinite loops
  );

  // Resize the task list
  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();

      setState((prev) => ({ ...prev, isResizing: true }));

      const startX = e.clientX;
      const startWidth = state.taskListWidth;

      const handleMouseMove = (e: MouseEvent) => {
        const newWidth = Math.max(150, Math.min(500, startWidth + e.clientX - startX));
        setState((prev) => ({ ...prev, taskListWidth: newWidth }));
      };

      const handleMouseUp = () => {
        setState((prev) => ({ ...prev, isResizing: false }));
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [state.taskListWidth],
  );

  // Track last wheel event time for better zoom control
  const lastWheelTimeRef = useRef(0);
  const wheelEventsCountRef = useRef(0);

  // Handle mouse wheel for zooming with performance optimizations
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();

      // Get mouse position relative to the actual viewport (not the 5x canvas)
      // We need to get the container element, not the transformed canvas
      const chartContainer = chartCanvasRef.current?.parentElement?.parentElement;
      if (!chartContainer) return;

      const rect = chartContainer.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;

      // Throttle wheel events for smoother zooming
      const now = performance.now();
      const timeSinceLastWheel = now - lastWheelTimeRef.current;

      // Skip wheel events that are too frequent (< 8ms = ~120fps max)
      if (timeSinceLastWheel < 8) {
        return;
      }

      // Reset counter after pause in wheel events
      if (timeSinceLastWheel > 200) {
        wheelEventsCountRef.current = 0;
      }

      // Increment counter and update time
      wheelEventsCountRef.current++;
      lastWheelTimeRef.current = now;

      // Use consistent sensitivity without reduction - the throttling will handle performance
      const sensitivityFactor = 1;

      // Calculate zoom delta (direction-aware) with consistent sensitivity
      const zoomDelta = -Math.sign(e.deltaY) * 2 * sensitivityFactor; // Balanced for smooth but controlled zooming

      // Calculate new zoom level with min/max boundaries
      const newZoom = Math.round(Math.max(0, Math.min(100, state.zoom + zoomDelta)));

      // Apply zoom centered on mouse position
      handleZoomChange(newZoom, mouseX);
    },
    [state.zoom, handleZoomChange],
  );

  // Handle mouse down for panning
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return; // Only handle left mouse button

      setState((prev) => ({ ...prev, isDragging: true }));

      const startX = e.clientX;
      let accumulatedDelta = 0;

      const handleMouseMove = (e: MouseEvent) => {
        const totalDelta = e.clientX - startX;
        accumulatedDelta = totalDelta;

        // Apply temporary pan during drag
        handlePan(totalDelta, true);
      };

      const handleMouseUp = () => {
        setState((prev) => ({ ...prev, isDragging: false }));

        // Commit the final pan position
        if (accumulatedDelta !== 0) {
          handlePan(accumulatedDelta, false);
        }

        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [handlePan],
  );

  // Handle auto-fit request
  const handleAutoFit = useCallback(() => {
    // Force re-initialization with auto-fit
    hasInitializedRef.current = false;
    initializeTimeMatrix();
    hasInitializedRef.current = true;
  }, [initializeTimeMatrix]);

  // Track previous elements to avoid unnecessary re-initialization
  const prevElementsRef = useRef<GanttElementType[]>([]);

  // Initialize the chart
  useEffect(() => {
    if (!containerRef.current) return;

    // Check if only the selection or minor properties have changed
    // This prevents full re-initialization when elements are just selected
    const elementsChanged =
      elements.length !== prevElementsRef.current.length ||
      elements.some((el, i) => {
        const prevEl = prevElementsRef.current[i];
        // Only compare essential properties that affect rendering position
        if (!prevEl) return true;
        if (el.id !== prevEl.id) return true;

        // For tasks and groups, check start/end times
        if (
          (el.type === 'task' || el.type === 'group') &&
          (prevEl.type === 'task' || prevEl.type === 'group')
        ) {
          return el.start !== prevEl.start || el.end !== prevEl.end;
        }

        // For milestones, check the start/end times
        if (el.type === 'milestone' && prevEl.type === 'milestone') {
          return el.start !== prevEl.start || el.end !== prevEl.end;
        }

        return false;
      });

    // Store current elements for next comparison
    prevElementsRef.current = elements;

    // Skip initialization if elements haven't significantly changed
    if (hasInitializedRef.current && !elementsChanged) {
      return;
    }

    // Force initialization to react to data changes
    hasInitializedRef.current = false;

    // Create a small delay to allow the DOM to update first
    // This helps with getting accurate container dimensions
    const timer = setTimeout(() => {
      // Initialize the time matrix for coordinate transformations
      initializeTimeMatrix();

      // Mark as initialized
      hasInitializedRef.current = true;
    }, 50);

    // Clean up
    return () => {
      clearTimeout(timer);
    };
  }, [initializeTimeMatrix, elements]); // Keep the same dependencies, but we'll optimize inside

  // Clean up throttle timeout on unmount
  useEffect(() => {
    return () => {
      if (panUpdateThrottleRef.current) {
        clearTimeout(panUpdateThrottleRef.current);
      }
    };
  }, []);

  // Return the public API
  return {
    // State
    state,

    // Refs for DOM elements
    containerRef,
    taskListRef,
    timelineCanvasRef,
    chartCanvasRef,

    // Time matrix for rendering - expose the matrix directly
    timeMatrix: timeMatrixRef.current,
    timeMatrixRef, // Also expose the ref to ensure access to the latest matrix

    // Element info
    elements,
    elementsCount: elements.length,
    rowHeight: ROW_HEIGHT, // Expose fixed row height

    // Event handlers
    handleZoomChange,
    handlePan,
    handleResizeStart,
    handleWheel,
    handleMouseDown,
    handleAutoFit,
  };
}

// Add static properties to the function object
useGanttChart.zoomCurveCalculator = null as ZoomCurveCalculator | null;
