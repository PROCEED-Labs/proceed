# Gantt Chart Canvas

A high-performance, canvas-based Gantt chart component with advanced zooming, panning, dependencies, and ghost element support. Designed for visualizing complex process flows and timelines with mathematical precision.

## Features

### Core Functionality

- **Canvas-based rendering** for high performance with large datasets (1000+ elements)
- **Matrix-based transformations** with mathematical precision for zoom/pan operations
- **Virtualization** for optimal performance with large datasets
- **Support for multiple element types**: Tasks, Milestones, and Groups
- **Dependency arrows** with support for ghost dependencies
- **Ghost elements** for visualizing alternative timing occurrences
- **Loop detection icons** for elements that participate in loops
- **High-DPI display support** for crisp rendering on all screens

### Advanced Features

- **Auto-fit functionality** to automatically zoom and position to show all data
- **Real-time current date marker** with customizable positioning
- **Curved dependencies** option for enhanced visual aesthetics
- **Instance tracking** for elements with multiple occurrences
- **Element information modal** with dependency visualization
- **Responsive task list** with resizable columns
- **Intelligent time scale** that adapts to zoom level

### Performance Optimizations

- **GPU-accelerated panning** using CSS transforms for 60fps smoothness
- **Smart viewport buffering** (5x viewport width) to eliminate re-renders during panning
- **Throttled zoom operations** balancing responsiveness with performance
- **Efficient dependency rendering** with ghost dependency support
- **Optimized grid rendering** with configurable major/minor grid lines

## Usage

### Basic Example

```tsx
import { GanttChartCanvas } from '@/components/gantt-chart-canvas';

const elements = [
  {
    id: 'task1',
    type: 'task',
    name: 'Research Phase',
    start: new Date('2023-01-01').getTime(),
    end: new Date('2023-01-15').getTime(),
    color: '#1890ff',
    elementType: 'User Task', // Optional type description
  },
  {
    id: 'milestone1',
    type: 'milestone',
    name: 'Project Kickoff',
    start: new Date('2023-01-01').getTime(),
    color: '#52c41a',
  },
];

const dependencies = [
  {
    id: 'dep1',
    sourceId: 'milestone1',
    targetId: 'task1',
    type: 'finish-to-start',
  },
];

<GanttChartCanvas
  elements={elements}
  dependencies={dependencies}
  currentDateMarkerTime={Date.now()}
  width="100%"
  height={600}
  options={{
    autoFitToData: true,
    showControls: true,
    showLoopIcons: true,
    curvedDependencies: false,
  }}
/>;
```

### Advanced Usage with Ghost Elements

```tsx
const elementsWithGhosts = [
  {
    id: 'task1',
    type: 'task',
    name: 'Approval Process',
    start: new Date('2023-01-01').getTime(),
    end: new Date('2023-01-03').getTime(),
    color: '#1890ff',
    // Ghost occurrences show alternative timings
    ghostOccurrences: [
      {
        start: new Date('2023-01-05').getTime(),
        end: new Date('2023-01-08').getTime(),
        instanceId: 'task1_instance_2',
      },
    ],
  },
];

const ghostDependencies = [
  {
    id: 'ghost_dep1',
    sourceId: 'task1',
    targetId: 'task2',
    type: 'finish-to-start',
    isGhost: true,
    sourceInstanceId: 'task1_instance_2',
    targetInstanceId: 'task2_instance_1',
  },
];
```

## Element Types

### Base Properties

All elements share these common properties:

```typescript
interface GanttElement {
  id: string; // Unique identifier
  name?: string; // Display name (falls back to id if not provided)
  color?: string; // Element color (optional)
  elementType?: string; // Type description for display
  instanceNumber?: number; // Instance number for duplicate elements
  totalInstances?: number; // Total instances of this element
  isPathCutoff?: boolean; // Element where flow traversal stopped
  isLoop?: boolean; // Element participates in a loop
  isLoopCut?: boolean; // Element where loop was cut off
  ghostOccurrences?: Array<{
    // Alternative timing occurrences
    start: number;
    end?: number;
    instanceId?: string;
  }>;
}
```

### Task Elements

```typescript
interface GanttTask extends GanttElement {
  type: 'task';
  start: number; // Start timestamp in milliseconds
  end: number; // End timestamp in milliseconds
}
```

- **Visual**: Horizontal bar from start to end time
- **Supports**: Ghost occurrences for alternative timings
- **Features**: Loop icons, instance labeling, click interactions

### Milestone Elements

```typescript
interface GanttMilestone extends GanttElement {
  type: 'milestone';
  start: number; // Timestamp in milliseconds
  end?: number; // Optional end for ranged milestones
}
```

- **Point milestone**: Diamond shape at start time (when only start provided)
- **Ranged milestone**: Diamond centered between start/end with range visualization
- **Boundary events**: Always displayed as point milestones regardless of duration
- **Features**: Ghost occurrences, dependency connection points

### Group Elements

```typescript
interface GanttGroup extends GanttElement {
  type: 'group';
  start: number; // Start timestamp in milliseconds
  end: number; // End timestamp in milliseconds
  childIds: string[]; // References to child elements
  isExpanded?: boolean; // Expansion state
}
```

- **Visual**: Brackets encompassing the time range
- **Features**: Hierarchical organization, expansion/collapse support

## Dependencies

### Dependency Types

```typescript
enum DependencyType {
  FINISH_TO_START = 'finish-to-start', // Currently supported
  START_TO_START = 'start-to-start', // Currently supported
  // Future: FINISH_TO_FINISH, START_TO_FINISH
}
```

### Dependency Interface

```typescript
interface GanttDependency {
  id: string;
  sourceId: string; // Source element ID
  targetId: string; // Target element ID
  type: DependencyType; // Dependency relationship type
  name?: string; // Optional dependency name
  flowType?:
    | 'conditional'
    | 'default'
    | 'normal'
    | 'boundary'
    | 'boundary-non-interrupting'; // BPMN flow types
  isGhost?: boolean; // Ghost dependency flag
  sourceInstanceId?: string; // Specific source instance for ghost deps
  targetInstanceId?: string; // Specific target instance for ghost deps
  isBoundaryEvent?: boolean; // Special handling for boundary event dependencies
}
```

### Ghost Dependencies

Ghost dependencies connect to specific ghost occurrences, enabling visualization of alternative process execution paths:

```typescript
const ghostDep = {
  id: 'ghost_dep_1',
  sourceId: 'task_a',
  targetId: 'task_b',
  type: 'finish-to-start',
  isGhost: true,
  sourceInstanceId: 'task_a_instance_2', // Connects to specific ghost occurrence
  targetInstanceId: 'task_b_instance_1',
};
```

### Boundary Event Dependencies

Boundary event dependencies have special visual rendering with adaptive routing strategies. Two types of dependencies are supported:

#### 1. Attachment Dependencies (Task → Boundary Event)

Visual connection from attached task to boundary event:

```typescript
const attachmentDep = {
  id: 'boundary_attachment_1',
  sourceId: 'task_a',
  targetId: 'boundary_event_1',
  type: 'start-to-start',
  flowType: 'boundary', // or 'boundary-non-interrupting'
  isBoundaryEvent: true,
};
```

**Visual Features**:

- **No Arrow Tips**: Clean line endings without directional arrows
- **Adaptive Routing**:
  - **Normal**: Vertical line 25px before event, then horizontal to boundary event
  - **Constrained**: Straight vertical line when insufficient horizontal space
- **Line Styles**: Solid for interrupting events, dashed for non-interrupting events
- **Positioning Constraints**: Never starts before task start or after event position

#### 2. Outgoing Dependencies (Boundary Event → Target)

Standard dependencies from boundary events to subsequent elements:

```typescript
const outgoingDep = {
  id: 'flow_123',
  sourceId: 'boundary_event_1',
  targetId: 'task_b',
  type: 'finish-to-start',
  flowType: 'normal',
  // Standard dependency - no special boundary event properties
};
```

**Visual Features**:

- **Standard Routing**: Uses normal dependency routing algorithms
- **Arrow Tips**: Standard arrow tips at target end
- **Source Position**: Always starts from boundary event milestone position (not after duration)
- **Line Styles**: Standard solid/dashed based on flow type

## Configuration Options

### GanttChartOptions Interface

```typescript
interface GanttChartOptions {
  // Layout & Sizing
  height?: number;
  taskListWidth?: number;

  // Initial View
  initialZoom?: number; // 0-100 zoom level
  initialPosition?: number; // Timestamp to center on
  autoFitToData?: boolean; // Auto-fit to show all data
  autoFitPadding?: number; // Padding when auto-fitting (default: 0.1)

  // UI Controls
  showControls?: boolean; // Show zoom controls and auto-fit button
  readOnly?: boolean; // Disable interactions

  // Visual Features
  showLoopIcons?: boolean; // Show loop detection icons (default: true)
  curvedDependencies?: boolean; // Use curved dependency lines (default: false)

  // Grid Configuration
  grid?: {
    major?: {
      color?: string; // Major grid line color
      lineWidth?: number; // Line width in pixels
      timelineTickSize?: number; // Tick size (0 = full height)
    };
    minor?: {
      color?: string; // Minor grid line color
      lineWidth?: number; // Line width in pixels
      timelineTickSize?: number; // Tick size (0 = full height)
    };
  };

  // Event Handlers
  onElementClick?: (element: GanttElementType) => void;
  onZoomChange?: (zoom: number) => void;
  onViewChange?: (visibleRange: [number, number]) => void;
}
```

### Props Interface

```typescript
interface GanttChartCanvasProps {
  elements: GanttElementType[]; // Required: Chart elements
  width?: string | number; // Container width (default: '100%')
  height?: string | number; // Container height (default: '100%')
  options?: GanttChartOptions; // Configuration options
  currentDateMarkerTime?: number; // Current time marker position
  dependencies?: GanttDependency[]; // Dependency arrows
  showInstanceColumn?: boolean; // Show instance number column
  showLoopColumn?: boolean; // Show loop status column
}
```

## Time Scale System

The component automatically adjusts time units and grid intervals based on zoom level:

### Zoom Levels & Time Units

The component automatically selects appropriate time units based on the current zoom level:

- **Ultra-high zoom** (95-100%): Second and millisecond intervals
- **High zoom** (80-95%): Minute intervals (1min, 5min, 15min, 30min)
- **Medium zoom** (50-80%): Hour intervals (1h, 3h, 6h, 12h)
- **Normal zoom** (20-50%): Day intervals (1d, 2d, 7d)
- **Low zoom** (0-20%): Week, month, and year intervals

### Grid System

- **Major grid lines**: Primary time intervals with stronger visual weight
- **Minor grid lines**: Sub-intervals for precise positioning
- **Timeline ticks**: Configurable tick marks in the timeline header
- **Adaptive sizing**: Grid spacing adjusts automatically to zoom level

## Advanced Features

### Ghost Elements

Ghost elements visualize alternative timing occurrences in process flows:

- **75% opacity** rendering to distinguish from primary elements
- **Instance tracking** with unique instance IDs
- **Dependency support** connecting to specific ghost occurrences
- **Auto-fit integration** includes ghost elements in viewport calculations

### Loop Detection

- **Loop icons**: Warning indicators for elements participating in loops
- **Path cutoff markers**: Show where flow traversal was terminated
- **Loop cut indicators**: Mark where loop iteration limits were reached
- **Configurable display**: Can be toggled via options

### Instance Management

For elements with multiple occurrences:

- **Instance numbering**: "Task A (instance 2 of 5)"
- **Instance columns**: Optional display of instance information
- **Unique rendering**: Each instance can have different timing
- **Dependency tracking**: Dependencies can target specific instances

### Element Information Modal

Detailed element information with:

- **Element properties**: Name, type, timing, instance details
- **Dependency visualization**: Incoming and outgoing dependencies
- **Interactive navigation**: Click dependencies to focus on related elements
- **Loop status**: Display loop participation and cutoff information

## Architecture

### Component Structure

```
┌─────────────────────────────────────────────────────────┐
│ GanttChartCanvas (React Component)                      │
├─────────────────────────────────────────────────────────┤
│ Controls & Auto-fit Button                              │
├─────────────┬───────────────────────────────────────────┤
│ Task List   │ Timeline Header (Canvas)                  │
│ (DOM)       │ - Time scales & grid                      │
├─────────────┼───────────────────────────────────────────┤
│ Task List   │ Main Chart Canvas                         │
│ (DOM)       │ - Elements, dependencies, grid            │
│ - Names     │ - Ghost elements & dependencies           │
│ - Types     │ - Current date marker                     │
│ - Instances │ - Loop icons                              │
│ - Loops     │                                           │
└─────────────┴───────────────────────────────────────────┘
```

### Core Modules

#### Canvas Rendering System

- **CanvasRenderer**: Multi-layer canvas management and rendering orchestration
- **ElementRenderer**: Task, milestone, group, and ghost element rendering
- **DependencyRenderer**: Dependency arrows with ghost dependency support
- **GridRenderer**: Adaptive grid system with major/minor lines
- **TimeAxisRenderer**: Time scale and grid rendering for header

#### Mathematical Foundation

- **TimeMatrix**: Matrix-based coordinate transformations for precision
- **ZoomCurveCalculator**: Smooth zoom curves with preset calculations
- **TimeUnits**: Intelligent time unit selection and interval calculation

#### Data Management

- **ElementManager**: Element virtualization and efficient data access
- **AutoFitUtils**: Optimal zoom/position calculation for data display

#### Interaction System

- **useGanttChart Hook**: State management and interaction handling
- **Event Handlers**: Mouse/wheel interactions with performance optimization

### Performance Architecture

#### Rendering Optimizations

1. **Virtualization**: Only render visible elements plus configurable buffer
2. **Layer separation**: Static timeline header, dynamic main chart
3. **GPU acceleration**: CSS transforms for panning without re-render
4. **Smart buffering**: 5x viewport width rendering buffer
5. **Throttled operations**: Balanced zoom/pan responsiveness
6. **High-DPI support**: Automatic pixel ratio detection and scaling

#### Memory Management

1. **Object pooling**: Reuse calculation objects to minimize GC
2. **Selective updates**: Only re-render affected canvas regions
3. **Efficient data structures**: Optimized element lookup and access
4. **Cleanup routines**: Proper cleanup of event listeners and timers
5. **Smart re-initialization**: Only re-initialize when data significantly changes

## Integration Examples

### With BPMN Timeline Component

The Gantt Chart Canvas is designed to integrate seamlessly with the BPMN Timeline component:

```tsx
import { transformBPMNToGantt } from '@/components/bpmn-timeline';
import { GanttChartCanvas } from '@/components/gantt-chart-canvas';

// Transform BPMN process to Gantt data
const result = transformBPMNToGantt(definitions, timestamp, mode, loopDepth);

// Render with ghost elements and dependencies
<GanttChartCanvas
  elements={result.elements}
  dependencies={result.dependencies}
  currentDateMarkerTime={timestamp}
  showInstanceColumn={mode === 'every-occurrence'}
  showLoopColumn={mode !== 'earliest-occurrence'}
  options={{
    autoFitToData: true,
    showControls: true,
    showLoopIcons: true,
    curvedDependencies: false,
  }}
/>;
```

### Custom Element Types

Extend the component for custom visualizations:

```tsx
// Custom element with additional properties
interface CustomElement extends GanttTask {
  priority: 'high' | 'medium' | 'low';
  assignee: string;
  progress: number; // 0-100
}

// Custom rendering via color and styling
const customElements = elements.map((el) => ({
  ...el,
  color: el.priority === 'high' ? '#ff4d4f' : '#1890ff',
  elementType: `${el.assignee} (${el.progress}%)`,
}));
```

## Development

### Debugging Features

Debug information can be enabled through console logging:

```tsx
// Example debug logging in development
console.log('Visible time range:', timeMatrix.getVisibleTimeRange(chartWidth));
console.log('Current zoom level:', state.zoom);
console.log('Rendered elements:', visibleElements.length);
```

### Testing Utilities

The component includes utilities for testing:

```typescript
// Note: These utilities are internal - use the component's autoFitToData option instead
import {
  calculateAutoFit,
  shouldAutoFit,
} from '@/components/gantt-chart-canvas/utils/autoFitUtils';
import {
  TimeMatrix,
  ZoomCurveCalculator,
} from '@/components/gantt-chart-canvas/core';

// Test auto-fit calculations
const autoFitResult = calculateAutoFit(elements, containerWidth, padding);

// Test coordinate transformations
const matrix = new TimeMatrix(scale, translate, baseTime);
const screenX = matrix.transformPoint(timestamp);

// Test zoom curve calculations
const zoomCalculator = new ZoomCurveCalculator('DEFAULT');
const scale = zoomCalculator.calculateScale(zoomLevel);
```

### Performance Monitoring

Monitor rendering performance through browser dev tools:

```typescript
// Performance metrics available in console during development
const metrics = {
  renderTime: 'Measured via performance.now()',
  visibleElements: 'Calculated by ElementManager',
  totalElements: 'elements.length',
  zoomLevel: 'Current zoom percentage (0-100)',
  visibleTimeRange: 'timeMatrix.getVisibleTimeRange()',
};
```

## Browser Support

- **Modern browsers**: Chrome 88+, Firefox 85+, Safari 14+, Edge 88+
- **Canvas 2D API**: Full support required
- **CSS Transforms**: For GPU-accelerated panning
- **High-DPI displays**: Automatic detection and optimization
- **Touch devices**: Basic touch support for mobile/tablet

## Migration Guide

### From Previous Versions

Key changes in the current implementation:

1. **Ghost elements**: Alternative timing visualization with 75% opacity
2. **Instance tracking**: Support for multiple element occurrences with unique IDs
3. **Enhanced dependencies**: Ghost dependency support with instance targeting
4. **Loop detection**: Visual indicators for loop participation and cutoffs
5. **Improved performance**: Better virtualization and rendering optimization
6. **Element information modal**: Click elements to view detailed dependency information

### API Changes

- Element interface extended with `ghostOccurrences`, loop, and instance properties
- Dependencies support `isGhost`, `sourceInstanceId`, `targetInstanceId`, and `flowType` properties
- `GanttChartOptions` expanded with `showLoopIcons` and `curvedDependencies` options
- Time matrix constructor uses `(scale, translate, baseTime?)` parameters with optional baseTime
- ZoomCurveCalculator constructor accepts preset name strings like `'DEFAULT'` or config objects
