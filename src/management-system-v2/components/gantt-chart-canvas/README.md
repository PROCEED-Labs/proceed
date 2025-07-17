# Gantt Chart Canvas

A high-performance canvas-based Gantt chart component with zoom, pan, and virtualization support.

## Features

- Matrix-based zoom/pan with focal point preservation
- Virtualization for large datasets (1000+ elements)
- Support for tasks, milestones, and groups
- Dependency arrows
- High-DPI display support
- Two-column task list with optional extra info field

## Usage

```tsx
import { GanttChartCanvas } from '@/components/gantt-chart-canvas';

const elements = [
  {
    id: 'task1',
    type: 'task',
    name: 'Research', // Optional - will display <task1> in italics if not provided
    start: new Date('2023-01-01').getTime(),
    end: new Date('2023-01-15').getTime(),
    row: 0,
    color: '#1890ff',
    extraInfo: 'Phase 1', // Optional second column
  },
];

<GanttChartCanvas elements={elements} width="100%" height={600} />;
```

## Element Types

All element types support optional `name` and `extraInfo` fields:

- If `name` is not provided, the `id` will be displayed in italics surrounded by pointy brackets (e.g., `<task1>`)
- The `extraInfo` field will be displayed in a second column

### Task

`{ type: 'task', start: number, end: number, name?: string, extraInfo?: string }`

- Renders as a horizontal bar from start to end time

### Milestone

`{ type: 'milestone', start: number, end?: number, name?: string, extraInfo?: string }`

- If only `start` is provided: renders as a diamond at the start position
- If both `start` and `end` are provided:
  - Diamond is centered between start and end
  - The time range is visualized with translucent diagonal lines
  - Brackets appear at both ends to indicate the range

### Group

`{ type: 'group', start: number, end: number, childIds: string[], name?: string, extraInfo?: string }`

- Renders as brackets encompassing the time range
- Can contain references to child elements

## Performance

The component automatically handles virtualization and uses optimized rendering for large datasets.

### Key Optimizations

- **GPU-accelerated panning**: Uses CSS transforms for smooth 60fps panning without canvas re-renders
- **5x viewport buffer**: Renders 500% of the viewport width (200% on each side) to eliminate re-renders during panning
- **Smart zoom throttling**: Balances responsiveness with performance (2 zoom units or 50ms threshold)
- **Virtualization**: Only renders visible elements plus a small buffer for smooth scrolling

### Interaction Controls

- **Mouse wheel**: Zoom in/out centered on mouse position
- **Click and drag**: Pan the chart view
- **Zoom slider**: Fine control over zoom level (0-100%)
- **Auto-fit**: Automatically adjusts zoom and position to show all data

## Architecture

The component uses a hybrid DOM/Canvas architecture:

- **Task List**: DOM-based for accessibility and interaction
- **Timeline Header**: Canvas-based for precise time scale rendering
- **Main Chart**: Canvas-based for high-performance element rendering

### Core Components

```
┌────────────────────────────────────────────────────┐
│ GanttChartCanvas (React Component)                 │
├────────────────────────────────────────────────────┤
│ Controls & Header                                  │
├────────────┬───────────────────────────────────────┤
│ Task List  │ Timeline Canvas                       │
│ (DOM)      │                                       │
├────────────┼───────────────────────────────────────┤
│ Task List  │ Main Chart Canvas                     │
│ (DOM)      │                                       │
└────────────┴───────────────────────────────────────┘
```

### Mathematical Model

Uses matrix transformations for all coordinate conversions:

- **World Coordinates**: Time-based (milliseconds since epoch)
- **Screen Coordinates**: Pixel positions
- **Transform Matrix**: Handles conversions with mathematical precision

## Configuration

### Options

```tsx
interface GanttChartOptions {
  showGrid?: boolean; // Default: true
  showDependencies?: boolean; // Default: true
  rowHeight?: number; // Default: 40px
  minZoom?: number; // Default: 0.1
  maxZoom?: number; // Default: 100
  timeFormat?: 'auto' | string; // Default: 'auto'
  colorScheme?: 'light' | 'dark'; // Default: 'light'
}
```

### Dependencies

Add dependency arrows between elements:

```tsx
const dependencies = [
  {
    sourceId: 'task1',
    targetId: 'task2',
    type: 'finish-to-start', // Currently the only supported type
  },
];

<GanttChartCanvas elements={elements} dependencies={dependencies} />;
```

### Current Date Marker

Display a red vertical line at current time:

```tsx
<GanttChartCanvas elements={elements} currentDateMarkerTime={Date.now()} />
```

## Time Scale System

The component automatically adjusts time units based on zoom level:

- **Ultra-high zoom**: Second intervals (5s, 15s, 30s)
- **High zoom**: Minute intervals (5min, 15min, 30min)
- **Medium zoom**: Hour intervals (1h, 3h, 6h)
- **Normal zoom**: Day intervals (1d, 2d, 7d)
- **Low zoom**: Month/Quarter/Year intervals

## Development

### Core Modules

- `CanvasRenderer`: Handles all canvas drawing operations
- `TimeMatrix`: Manages coordinate transformations and zoom precision
- `ElementManager`: Manages chart elements and virtualization
- `TimeAxisRenderer`: Time unit calculation and grid generation
- `ZoomCurveCalculator`: Smooth zoom transitions

### Debugging

Add debug visualizations during development:

```tsx
<GanttChartCanvas
  elements={elements}
  options={{
    debug: true, // Shows coordinate grids
    debugPerformance: true, // Shows render metrics
  }}
/>
```
