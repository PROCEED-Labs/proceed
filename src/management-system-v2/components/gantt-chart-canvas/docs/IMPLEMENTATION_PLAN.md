# Canvas-Based Gantt Chart Implementation Plan

## Overview

This document outlines the implementation plan for a high-precision Gantt chart component using Canvas rendering. The approach prioritizes zoom accuracy, performance, and visual consistency.

## Core Architecture

### 1. Rendering Approach: Hybrid Design with DOM and Canvas

The implementation uses a hybrid approach that combines the best of both worlds:

```
┌────────────────────────────────────────────────────┐
│ Container (React Component)                        │
├────────────┬───────────────────────────────────────┤
│ Controls (React Component)                         │
├────────────┬───────────────────────────────────────┤
│ Task List  │ Timeline Header Canvas                │
│ Header     │                                       │
├────────────┼───────────────────────────────────────┤
│            │                                       │
│ Task List  │ Main Chart Canvas                     │
│ (DOM)      │                                       │
│            │                                       │
│            │                                       │
│            │                                       │
└────────────┴───────────────────────────────────────┘
```

- **Task List**: DOM-based for accessibility, interactive features, and easy editing

  - Uses standard HTML/CSS for optimal rendering of text content
  - Supports keyboard navigation and screen readers
  - Enables use of standard form controls for editing task properties
  - Implements virtual rendering for large datasets with absolute positioning

- **Timeline Header**: Canvas-based for precise time scale rendering

  - Accurate rendering of time units at different zoom levels
  - Dynamic spacing and labeling based on zoom level
  - High-performance even with dense time scales

- **Main Chart**: Canvas-based for precise element rendering and zooming
  - Matrix-based transformations for accurate zooming
  - Pixel-perfect rendering of tasks and milestones
  - Virtualized drawing for optimal performance

### 2. Mathematical Model: Transform Matrix Approach

The component will use matrix transformations to handle all positioning and zooming:

- **World Coordinates**: Time-based coordinates (milliseconds since epoch)
- **Screen Coordinates**: Pixel positions on the canvas
- **Transformation Matrix**: Handles conversion between world and screen coordinates

This approach provides:

- Perfect mathematical precision during zoom operations
- Consistent focal point maintenance
- Elimination of rounding errors during transformations

### 3. Core Data Structures

```typescript
// Matrix model for coordinate transformation
class TransformMatrix {
  scale: number; // Scale factor (zoom level)
  translate: number; // Translation (pan position)

  // Transform world (time) to screen (pixels)
  transformPoint(worldX: number): number;

  // Transform screen (pixels) to world (time)
  inverseTransformPoint(screenX: number): number;

  // Create a zoomed matrix with focal point
  createZoomedMatrix(newScale: number, focalPoint: number): TransformMatrix;
}

// Time axis renderer for handling time units and grid generation
class TimeAxisRenderer {
  // Time unit definitions
  readonly timeUnits = [
    'second',
    'minute',
    'hour',
    'day',
    'week',
    'month',
    'quarter',
    'year',
  ];

  // Calculate optimal time unit and level based on scale
  getTimeUnitAndLevel(pixelsPerDay: number): {
    unit: TimeUnit;
    level: TimeLevel;
  };

  // Generate grid lines with proper time boundaries
  generateGridLines(
    startTime: number,
    endTime: number,
    timeUnit: TimeUnit,
    level: TimeLevel,
    transformFn: (time: number) => number,
  ): { majorGridLines: GridLine[]; subgridLines: GridLine[] };

  // Format time values for display with two-row labels
  formatTimeLabels(
    date: Date,
    unit: TimeUnit,
    isYearBoundary: boolean,
    isMonthBoundary: boolean,
    isFirstLabel: boolean,
  ): { primaryLabel: string; secondaryLabel: string };
}
```

## Key Implementation Details

### 1. Rendering Engine

The rendering system will use a request-animation-frame loop with the following components:

```typescript
class GanttRenderer {
  // Core Canvas contexts
  timelineCtx: CanvasRenderingContext2D;
  chartCtx: CanvasRenderingContext2D;

  // Transformation state
  transform: TransformMatrix;

  // View state
  viewportStart: number; // Time in ms
  viewportEnd: number; // Time in ms

  // Render the entire chart
  render(): void {
    // Clear canvases
    this.clearCanvases();

    // Calculate visible range in world coordinates
    const visibleTimeRange = this.getVisibleTimeRange();

    // Render grid and timeline
    this.renderTimeScale(visibleTimeRange);

    // Render only visible elements using virtualization
    this.renderVisibleElements(visibleTimeRange);

    // Optional: Render overlay elements (selection, etc.)
    this.renderOverlays();
  }

  // Pan the view by x pixels
  pan(deltaX: number): void {
    // Convert screen delta to world delta using inverse transform
    const worldDelta = this.transform.inverseScaleVector(deltaX);

    // Update transform
    this.transform.translate -= worldDelta;

    // Request new frame
    this.requestRender();
  }

  // Zoom centered on a specific point
  zoomAtPoint(scaleFactor: number, centerX: number): void {
    // Convert screen center to world center
    const worldCenter = this.transform.inverseTransformPoint(centerX);

    // Create new transform that keeps this world point at the same screen position
    this.transform = this.transform.createZoomedMatrix(
      this.transform.scale * scaleFactor,
      worldCenter,
    );

    // Request new frame
    this.requestRender();
  }
}
```

### 2. Zooming Implementation

The zoom process will use a pure mathematical approach:

1. Convert focal point from screen to world coordinates using current transform
2. Create a new transform with updated scale
3. Adjust translation to ensure the focal point remains at the same screen position
4. Apply the new transform in a single operation

This approach ensures the focal point remains exactly fixed during zoom operations.

```typescript
/**
 * Create a new transform matrix that scales around a focal point
 * This is the core function for accurate zooming
 */
createZoomedMatrix(newScale: number, focalPointWorld: number): TransformMatrix {
  // Create new transform with same translate initially
  const newTransform = new TransformMatrix(newScale, this.translate);

  // Current screen position of focal point
  const oldScreenPos = this.transformPoint(focalPointWorld);

  // Where focal point would be with just scale change
  const newScreenPos = newTransform.transformPoint(focalPointWorld);

  // Adjust translation to keep focal point at the same position
  const screenDelta = oldScreenPos - newScreenPos;
  const worldDelta = screenDelta / newScale;

  // Apply adjustment
  newTransform.translate += worldDelta;

  return newTransform;
}
```

### 3. Time Unit Handling

To handle time units consistently:

1. Internal storage will always use milliseconds since epoch
2. Time unit calculations will be based on the current scale
3. Time formatting will happen only at render time

```typescript
class TimeAxisUtils {
  // Get the appropriate time unit and level based on pixels-per-day
  static getTimeUnitAndLevel(pixelsPerDay: number): {
    unit: TimeUnit;
    level: TimeLevel;
  } {
    if (pixelsPerDay >= 20000)
      return { unit: TimeUnit.Second, level: TimeLevel.Level1 }; // 5-second intervals
    if (pixelsPerDay >= 10000)
      return { unit: TimeUnit.Second, level: TimeLevel.Level2 }; // 15-second intervals
    if (pixelsPerDay >= 6000)
      return { unit: TimeUnit.Second, level: TimeLevel.Level3 }; // 30-second intervals
    if (pixelsPerDay >= 3500)
      return { unit: TimeUnit.Minute, level: TimeLevel.Level1 }; // 5-minute intervals
    if (pixelsPerDay >= 2000)
      return { unit: TimeUnit.Minute, level: TimeLevel.Level2 }; // 15-minute intervals
    if (pixelsPerDay >= 1200)
      return { unit: TimeUnit.Minute, level: TimeLevel.Level3 }; // 30-minute intervals
    if (pixelsPerDay >= 800)
      return { unit: TimeUnit.Hour, level: TimeLevel.Level1 }; // 1-hour intervals
    if (pixelsPerDay >= 400)
      return { unit: TimeUnit.Hour, level: TimeLevel.Level2 }; // 3-hour intervals
    if (pixelsPerDay >= 200)
      return { unit: TimeUnit.Hour, level: TimeLevel.Level3 }; // 6-hour intervals
    if (pixelsPerDay >= 80)
      return { unit: TimeUnit.Day, level: TimeLevel.Level1 }; // 1-day intervals
    if (pixelsPerDay >= 45)
      return { unit: TimeUnit.Day, level: TimeLevel.Level2 }; // 2-day intervals
    if (pixelsPerDay >= 20)
      return { unit: TimeUnit.Day, level: TimeLevel.Level3 }; // 7-day intervals
    if (pixelsPerDay >= 6)
      return { unit: TimeUnit.Month, level: TimeLevel.Level1 }; // 1-month intervals
    if (pixelsPerDay >= 3)
      return { unit: TimeUnit.Month, level: TimeLevel.Level2 }; // 3-month intervals
    if (pixelsPerDay >= 1.2)
      return { unit: TimeUnit.Quarter, level: TimeLevel.Level1 }; // 1-quarter intervals
    return { unit: TimeUnit.Year, level: TimeLevel.Level1 }; // 1-year intervals
  }

  // Generate grid lines with precise time units
  static generateGridLines(
    viewportStartMs: number,
    viewportEndMs: number,
    unit: TimeUnit,
    level: TimeLevel,
    transformFn: (time: number) => number,
  ): { majorGridLines: GridLine[]; subgridLines: GridLine[] } {
    // Calculate grid line positions using proper date arithmetic
    // Return major and subgrid lines with appropriate time boundaries
  }

  // Format time for display with primary and secondary labels
  static formatTimeLabels(
    date: Date,
    unit: TimeUnit,
    isYearBoundary: boolean,
    isMonthBoundary: boolean,
    isFirstLabel: boolean,
  ): { primaryLabel: string; secondaryLabel: string } {
    // Format time with appropriate context based on time unit
  }
}
```

### 4. Virtualization Strategy

For handling large datasets efficiently:

1. **Time-Based Culling**: Only process elements that fall within the visible time range
2. **Row Virtualization**: Only render task rows visible in the viewport
3. **Granular Rendering**: Adjust detail level based on zoom

```typescript
// Calculate and return only visible elements
getVisibleElements(viewportStart: number, viewportEnd: number, yStart: number, yEnd: number): VisibleElement[] {
  return this.elements.filter(element => {
    // Time range check (horizontal)
    const isTimeVisible = element.endTime >= viewportStart && element.startTime <= viewportEnd;

    // Row visibility check (vertical)
    const rowIndex = this.getRowIndex(element.id);
    const rowY = rowIndex * this.rowHeight;
    const isRowVisible = rowY + this.rowHeight >= yStart && rowY <= yEnd;

    return isTimeVisible && isRowVisible;
  }).map(element => ({
    element,
    screenX1: this.transform.transformPoint(element.startTime),
    screenX2: this.transform.transformPoint(element.endTime),
    screenY: this.getRowIndex(element.id) * this.rowHeight
  }));
}
```

### 5. Interactive Features

The component will support interaction through canvas event handling:

```typescript
// Setup input handlers
setupEventListeners(): void {
  // Mouse wheel for zooming
  this.canvas.addEventListener('wheel', e => {
    const rect = this.canvas.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;

    // Calculate zoom factor from delta
    const zoomFactor = Math.pow(1.1, -e.deltaY / 100);

    // Zoom at mouse position
    this.zoomAtPoint(zoomFactor, canvasX);

    e.preventDefault();
  });

  // Mouse drag for panning
  this.canvas.addEventListener('mousedown', e => {
    this.isDragging = true;
    this.lastDragX = e.clientX;
  });

  window.addEventListener('mousemove', e => {
    if (this.isDragging) {
      const deltaX = e.clientX - this.lastDragX;
      this.pan(deltaX);
      this.lastDragX = e.clientX;
    }
  });

  window.addEventListener('mouseup', () => {
    this.isDragging = false;
  });

  // Element interaction (click, hover)
  this.canvas.addEventListener('click', e => {
    const rect = this.canvas.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;

    // Convert to world coordinates
    const worldX = this.transform.inverseTransformPoint(canvasX);

    // Find clicked element
    const element = this.findElementAt(worldX, canvasY);
    if (element) {
      this.onElementClick(element);
    }
  });
}
```

## Component Structure

The component will be divided into the following key files:

1. **GanttChartCanvas.tsx**: Main React component
2. **CanvasRenderer.ts**: Handles all canvas drawing operations
3. **TimeMatrix.ts**: Manages coordinate transformations and zooming
4. **TimeAxisRenderer.ts**: Handles time unit calculation and grid generation
5. **ElementManager.ts**: Manages chart elements and virtualization
6. **InteractionManager.ts**: Handles user input and interaction
7. **Types.ts**: Core type definitions and interfaces

## Folder Structure

```
/gantt-chart-canvas/
  ├── components/
  │   ├── GanttChartCanvas.tsx      # Main component
  │   ├── GanttControls.tsx         # Zoom/navigation controls
  │   ├── GanttTaskList.tsx         # Task list component
  │   └── GanttHeader.tsx           # Chart header component
  ├── core/
  │   ├── CanvasRenderer.ts         # Canvas rendering engine
  │   ├── TimeMatrix.ts             # Transformation matrix
  │   ├── ElementManager.ts         # Element management
  │   └── TimeAxisRenderer.ts       # Time axis handling
  ├── hooks/
  │   ├── useGanttChart.ts          # Main hook for chart logic
  │   ├── useInteraction.ts         # Input handling hook
  │   └── useTimeMatrix.ts          # Transform management
  ├── utils/
  │   ├── dateUtils.ts              # Date formatting utilities
  │   ├── canvasUtils.ts            # Canvas helper functions
  │   └── timeUnitUtils.ts          # Time unit calculations
  ├── types/
  │   └── index.ts                  # Type definitions
  └── index.ts                      # Public exports
```

## Implementation Strategy

The implementation will follow these phases:

### Phase 1: Core Rendering Engine

- Implement the transformation matrix model
- Create basic canvas rendering setup
- Develop time scale calculation and grid rendering

### Phase 2: Element Rendering

- Implement task bar and milestone rendering
- Add virtualization for elements
- Develop basic task list component

### Phase 3: Interaction and Zoom

- Implement precise zoom handling
- Add panning capabilities
- Develop click and hover interaction

### Phase 4: Integration & Refinement

- Connect DOM task list with canvas view
- Optimize performance
- Add accessibility features

## Performance Optimizations

1. **GPU-Accelerated Panning**: Use CSS transforms on canvas wrapper for smooth 60fps panning
   - Wrap canvases in div containers with transform styles
   - Apply translate transforms during dragging without re-rendering canvas
   - Reset transforms and update matrix on drag end
2. **5x Viewport Buffer**: Render 500% of viewport width to eliminate re-renders
   - Canvas width = 5 × viewport width (200% extra on each side)
   - Position canvas at left: -200% to center the view
   - Allows extensive panning without triggering canvas updates
3. **Smart State Updates**: Minimize React re-renders with intelligent throttling
   - Zoom updates only when change > 2 units or after 50ms
   - Wheel events throttled to 8ms intervals (120fps max)
   - Pan offset excluded from render dependencies
4. **Virtualization**: Only render visible elements plus buffer
   - Calculate visible row range with buffer above/below
   - Skip rendering of off-screen elements entirely
5. **High-DPI Support**: Handle device pixel ratio for crisp rendering
   - Scale canvas dimensions by devicePixelRatio
   - Apply inverse scale to CSS dimensions
   - Maintain consistent coordinate system

## Accessibility Considerations

While canvas is inherently less accessible, the component will implement:

1. **Keyboard Navigation**: Support for moving between elements
2. **ARIA Attributes**: Add proper roles and descriptions
3. **Focus Management**: Proper indication of selected elements
4. **Color Contrast**: Ensure sufficient contrast for all elements
5. **Text Alternatives**: Provide accessible descriptions for visual elements

## Final Notes

This implementation plan prioritizes zoom accuracy and performance while maintaining flexibility. The core mathematical approach using transformation matrices will eliminate the precision issues present in the current implementation.

The canvas-based rendering approach allows for exact pixel control and eliminates browser layout issues, while the virtualizations strategies ensure performance with large datasets.
