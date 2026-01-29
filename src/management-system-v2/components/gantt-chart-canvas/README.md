# Gantt Chart Canvas

A high-performance, canvas-based Gantt chart component designed for visualizing complex process flows and timelines with mathematical precision and extensive customization capabilities.

## Overview

The Gantt Chart Canvas is a sophisticated visualization component that transforms temporal data into interactive Gantt charts. Built with performance in mind, it handles datasets ranging from small projects to enterprise-scale processes with 1000+ elements while maintaining 60fps interactions.

**Key Characteristics**:

- Canvas-based rendering with hardware acceleration
- Mathematical precision in coordinate transformations
- Extensive virtualization for large datasets
- BPMN process flow integration capabilities
- Hierarchical data organization with sub-processes
- Advanced dependency visualization

## Core Features

### Rendering Capabilities

#### Element Types

**Tasks**

- **Visual**: Rectangular bars with configurable colors and styling
- **Properties**: Start/end timestamps, hierarchy levels, instance tracking
- **Features**: Ghost occurrences for alternative timings, loop indicators
- **BPMN Support**: All BPMN task types (User, Service, Manual, etc.)

**Milestones**

- **Point Milestones**: Diamond markers at specific timestamps
- **Ranged Milestones**: Diamonds centered between start/end times
- **Boundary Events**: Special handling for BPMN boundary events
- **Features**: Ghost occurrences, precise positioning

**Groups**

- **Summary Elements**: Container bars encompassing child elements
- **Sub-processes**: BPMN sub-process visualization with collapse/expand
- **Lanes**: Organizational grouping with header rows
- **Participants**: Multi-pool BPMN collaboration support

#### Advanced Visual Features

**High-Performance Rendering**

- Canvas-based drawing with device pixel ratio awareness
- Multi-layer architecture (timeline header + chart content)
- 5x viewport buffering for smooth panning without re-renders
- Hardware-accelerated transformations using CSS transforms

**Visual Styling**

- Configurable colors, fonts, and dimensions
- Rounded rectangles with anti-aliasing
- Alpha transparency support
- High-DPI display optimization for crisp rendering

**Grid and Timeline System**

- Adaptive time grid with major/minor lines
- Dual-row timeline labels (primary/secondary)
- Natural time unit boundaries (days, weeks, months, etc.)
- Configurable grid appearance (colors, line widths, tick sizes)
- Current date marker with custom timestamp support

### Mathematical Transformation System

#### TimeMatrix Class

- **Pure mathematics**: Transforms between time (world) and pixel (screen) coordinates
- **Base time relative**: Avoids precision loss with large timestamps
- **Matrix operations**: Scale and translate with mathematical accuracy
- **Focal point preservation**: Zoom operations maintain fixed reference points

#### ZoomCurveCalculator

- **Non-linear zoom mapping**: 0-100 zoom levels to scale factors
- **Multiple presets**: DEFAULT, GENTLE, STEEP, EXTREME configurations
- **Breakpoint acceleration**: Gentle scaling (0-70%) then accelerated (70-100%)
- **Scale range**: Years view (4.0e-9) to milliseconds view (3.0e-2)
- **Bidirectional**: Zoom-to-scale and scale-to-zoom conversions
- **Verification system**: Built-in mathematical accuracy testing

#### Coordinate Transformation Functions

- `timeToPixel` / `pixelToTime`: Core coordinate conversion
- `getVisibleTimeRange`: Calculate visible time bounds for viewport
- `createZoomedMatrix`: Generate new matrix preserving focal points
- Range operations with overlap detection and intersection calculations

### Performance Optimization Architecture

#### Virtualization System

- **Row virtualization**: Only renders visible rows with configurable buffers
- **Time range virtualization**: Processes only visible time spans
- **Adaptive buffering**: Different strategies for large vs. small datasets
- **Element Manager**: Efficient O(1) element lookups and filtering

#### Canvas Optimizations

- **5x viewport width**: Canvas buffer eliminates re-renders during panning
- **GPU acceleration**: CSS transforms for 60fps smooth interactions
- **Layer separation**: Independent rendering contexts for timeline and chart
- **Throttled operations**: RequestAnimationFrame throttling for zoom/pan
- **Dirty region tracking**: Selective re-rendering of changed areas

#### Caching and Memory Management

- **Grid line caching**: TimeAxisRenderer caches calculations for 3 seconds
- **Element position caching**: VisibleElement cache with automatic cleanup
- **Transform matrix reuse**: Reuse matrices when scale/translate unchanged
- **Automatic purging**: Cache cleanup after 10 seconds for memory efficiency

#### Large Dataset Handling

- **Performance thresholds**: Special handling for 1000+ elements
- **Reduced rendering frequency**: Adaptive timing based on dataset size
- **Memory-efficient structures**: Maps and sets for optimal data access
- **Batch operations**: Efficient bulk element updates

### Dependency System

#### Dependency Types and Relationships

```typescript
enum DependencyType {
  FINISH_TO_START = 'finish-to-start',
  START_TO_START = 'start-to-start',
  // Extensible for FINISH_TO_FINISH, START_TO_FINISH
}
```

#### Flow Types

- **Normal**: Standard process flow
- **Conditional**: Decision-based routing
- **Default**: Default path selection
- **Boundary**: BPMN boundary event flows
- **Message**: Inter-process communication
- **Boundary-Non-Interrupting**: Non-interrupting boundary flows

#### Advanced Dependency Features

- **Ghost dependencies**: Connect specific ghost occurrences between elements
- **Dependency routing**: Intelligent path calculation avoiding element collisions
- **Visual highlighting**: Selected element dependency emphasis
- **Boundary event handling**: Special rendering for attached/outgoing dependencies

#### Boundary Event Dependencies

**Attachment Dependencies** (Task → Boundary Event)

- Visual connection lines without arrow tips
- Adaptive routing (normal vs. constrained space)
- Line styles: solid (interrupting) vs. dashed (non-interrupting)
- Positioning constraints relative to task boundaries

**Outgoing Dependencies** (Boundary Event → Target)

- Standard dependency routing and arrow tips
- Source position from boundary event milestone
- Integration with normal dependency highlighting system

### Interaction System

#### Mouse and Touch Interactions

- **Zoom via mouse wheel**: Focal point zoom with 8ms throttling
- **Pan via drag**: Smooth dragging with temporary visual feedback
- **Element selection**: Single and multi-element selection
- **Info modal**: Detailed element information with dependency navigation
- **Task list resize**: Drag handle for adjusting panel width (150-500px)

#### Element Selection Features

- **Individual selection**: Click to select/deselect elements
- **Hierarchical selection**: Sub-process selection includes all children
- **Visual feedback**: Background highlighting and dependency emphasis
- **Modal navigation**: Click dependencies to navigate between elements

#### Controls and Navigation

- **Zoom controls**: Slider, +/- buttons, percentage display
- **Auto-fit button**: Intelligent fit-to-view with configurable padding
- **Collapse/expand**: Sub-process and lane folding with triangle indicators
- **Time unit display**: Current time unit indicator (Day, Hour, etc.)

### Data Management and Types

#### Element Interfaces

**Base Element Properties**

```typescript
interface GanttElement {
  id: string;
  name?: string;
  color?: string;
  elementType?: string; // Type description for display
  instanceNumber?: number; // For duplicate elements
  totalInstances?: number; // Total instances count
  type: 'task' | 'milestone' | 'group';

  // Loop and path analysis
  isPathCutoff?: boolean; // Flow traversal stopped
  isLoop?: boolean; // Participates in loop
  isLoopCut?: boolean; // Loop cut due to depth limits

  // BPMN specific
  isBoundaryEvent?: boolean;
  attachedToId?: string; // For boundary events
  cancelActivity?: boolean; // Interrupting boundary events

  // Hierarchy and organization
  hierarchyLevel?: number; // Indentation level (0 = root)
  parentSubProcessId?: string; // Parent sub-process ID
  isSubProcess?: boolean; // Is a sub-process group
  hasChildren?: boolean; // Has child elements

  // Lane organization
  laneId?: string;
  laneName?: string;
  laneLevel?: number; // Lane nesting level
  isLaneHeader?: boolean; // Lane header element

  // Ghost occurrences for alternative timings
  ghostOccurrences?: Array<{
    start: number;
    end?: number;
    instanceId?: string;
  }>;
}
```

**Task Elements**

```typescript
interface GanttTask extends GanttElement {
  type: 'task';
  start: number; // Timestamp in milliseconds
  end: number; // Timestamp in milliseconds
}
```

**Milestone Elements**

```typescript
interface GanttMilestone extends GanttElement {
  type: 'milestone';
  start: number; // Timestamp in milliseconds
  end?: number; // Optional end for centering
}
```

**Group Elements**

```typescript
interface GanttGroup extends GanttElement {
  type: 'group';
  start: number; // Group start time
  end: number; // Group end time
  childIds: string[]; // Child element references
  isExpanded?: boolean; // Expansion state
}
```

#### Dependency Interface

```typescript
interface GanttDependency {
  id: string;
  sourceId: string; // Source element ID
  targetId: string; // Target element ID
  type: DependencyType; // Relationship type
  name?: string; // Optional name
  flowType?:
    | 'conditional'
    | 'default'
    | 'normal'
    | 'boundary'
    | 'boundary-non-interrupting'
    | 'message';

  // Ghost dependency support
  isGhost?: boolean;
  sourceInstanceId?: string; // Specific source instance
  targetInstanceId?: string; // Specific target instance

  // Special handling
  isBoundaryEvent?: boolean; // Boundary event styling
}
```

### Configuration Options

#### GanttChartOptions Interface

```typescript
interface GanttChartOptions {
  // Layout & Sizing
  height?: number;
  taskListWidth?: number; // Default 300px, range 150-500px

  // Initial View
  initialZoom?: number; // 0-100 zoom level
  initialPosition?: number; // Timestamp to center on
  autoFitToData?: boolean; // Auto-fit to show all data
  autoFitPadding?: number; // Padding when auto-fitting (default: 0.1)

  // UI Controls
  showControls?: boolean; // Show zoom controls
  readOnly?: boolean; // Disable interactions

  // Visual Features
  showLoopIcons?: boolean; // Loop detection icons (default: true)
  curvedDependencies?: boolean; // Curved vs straight lines (default: false)

  // Grid Configuration
  grid?: {
    major?: {
      color?: string; // Major grid line color (#C9C9C9)
      lineWidth?: number; // Line width in pixels (1)
      timelineTickSize?: number; // Tick size (10px, 0 = full height)
    };
    minor?: {
      color?: string; // Minor grid line color (#E8E8E8)
      lineWidth?: number; // Line width in pixels (0.5)
      timelineTickSize?: number; // Tick size (0 = full height)
    };
  };

  // Event Handlers
  onElementClick?: (element: GanttElementType) => void;
  onZoomChange?: (zoom: number) => void;
  onViewChange?: (visibleRange: [number, number]) => void;
}
```

#### Renderer Configuration

```typescript
interface RendererConfig {
  taskBarHeight: number; // Default: 22px
  milestoneSize: number; // Default: 14px
  taskBorderRadius: number; // Default: 3px
  currentZoom?: number; // Current zoom level
  showLoopIcons?: boolean; // Loop icon display

  grid?: {
    major: { lineWidth: number; timelineTickSize?: number };
    minor: { lineWidth: number; timelineTickSize?: number };
  };

  colors: {
    grid: { major: string; minor: string };
    text: string;
    background: string;
    task: string;
    milestone: string;
  };

  font: { family: string; size: number };
}
```

### Time Scale and Grid System

#### Automatic Time Unit Selection

The component intelligently selects appropriate time units based on zoom level:

- **Ultra-high zoom (95-100%)**: Seconds and milliseconds
- **High zoom (80-95%)**: Minutes (1min, 5min, 15min, 30min)
- **Medium zoom (50-80%)**: Hours (1h, 3h, 6h, 12h)
- **Normal zoom (20-50%)**: Days (1d, 2d, 7d)
- **Low zoom (0-20%)**: Weeks, months, and years

#### Grid Line Generation

- **Major grid lines**: Primary time intervals with stronger visual weight
- **Minor grid lines**: Sub-intervals for precise positioning
- **Natural boundaries**: Aligned to actual time unit boundaries (midnight, month start, etc.)
- **Timeline ticks**: Configurable tick marks in timeline header
- **Adaptive density**: Grid spacing adjusts automatically to prevent overcrowding

### Architecture Components

#### Core Classes

**CanvasRenderer**

- Main rendering coordinator managing all drawing operations
- Multi-context handling for timeline and chart canvases
- Performance optimization coordination
- Configuration management and updates

**TimeAxisRenderer**

- Timeline header rendering with dual-row labels
- Grid line generation with caching system
- Time unit calculation and boundary detection
- Tick size and positioning management

**ElementRenderer**

- Task, milestone, and group rendering
- Ghost element visualization (75% opacity)
- Loop icon positioning and drawing
- Hierarchy indentation and visual grouping

**DependencyRenderer**

- Arrow and dependency line rendering
- Path calculation with collision avoidance
- Boundary event special handling
- Curved vs. straight line options

**GridRenderer**

- Background grid line drawing
- Current date marker rendering
- Major/minor grid line distinction
- Timeline tick rendering

#### State Management Hook

**useGanttChart Hook**

```typescript
const gantt = useGanttChart(elements, options);

// Returns:
{
  // State
  state: GanttChartState;

  // DOM References
  containerRef: RefObject<HTMLDivElement>;
  taskListRef: RefObject<HTMLDivElement>;
  timelineCanvasRef: RefObject<HTMLCanvasElement>;
  chartCanvasRef: RefObject<HTMLCanvasElement>;

  // Transformation
  timeMatrix: TimeMatrix;
  timeMatrixRef: RefObject<TimeMatrix>;

  // Data
  elements: GanttElementType[];
  elementsCount: number;
  rowHeight: number;

  // Event Handlers
  handleZoomChange: (zoom: number, centerX?: number) => void;
  handlePan: (deltaX: number, isTemporary?: boolean) => void;
  handleResizeStart: (e: React.MouseEvent) => void;
  handleWheel: (e: React.WheelEvent) => void;
  handleMouseDown: (e: React.MouseEvent) => void;
  handleAutoFit: () => void;
}
```

### Ghost Elements and Alternative Timings

#### Ghost Element System

Ghost elements provide visualization of alternative execution paths in process flows:

- **75% opacity rendering** to distinguish from primary elements
- **Instance-specific identification** with unique instance IDs
- **Dependency connectivity** linking specific ghost occurrences
- **Auto-fit integration** includes ghost elements in viewport calculations

#### Use Cases

- **Process analysis**: Compare different execution scenarios
- **What-if modeling**: Visualize alternative timing outcomes
- **Loop visualization**: Show multiple iterations of loop elements
- **Path exploration**: Display every-occurrence traversal results

### BPMN Integration Features

#### BPMN Element Support

- **All task types**: User, Service, Manual, Script, Business Rule, Send, Receive
- **All event types**: Start, End, Intermediate (Throw/Catch), Boundary
- **Gateway support**: Exclusive, Parallel, Inclusive, Complex, Event-based
- **Sub-process types**: Standard, Ad Hoc, Transaction sub-processes
- **Collaboration elements**: Participants, lanes, message flows

#### BPMN-Specific Features

- **Boundary event attachment**: Visual connection to parent tasks
- **Interrupting vs. non-interrupting**: Different line styles for boundary events
- **Message flow visualization**: Distinct styling for inter-process communication
- **Lane organization**: Hierarchical lane structure with headers
- **Sub-process collapse**: Expandable/collapsible sub-process groups

### Advanced Features

#### Loop Detection and Visualization

- **Loop icons**: Warning indicators (↻) for elements in loops
- **Path cutoff markers**: Show where traversal stopped (✕)
- **Loop cut indicators**: Mark depth limit boundaries
- **Configurable display**: Toggle via `showLoopIcons` option

#### Instance Management

For elements with multiple occurrences:

- **Instance numbering**: "Task A (instance 2 of 5)"
- **Instance columns**: Optional display columns for instance information
- **Unique rendering**: Each instance can have different timing
- **Dependency targeting**: Dependencies can target specific instances

#### Element Information Modal

Comprehensive element details including:

- **Basic properties**: Name, type, ID, timing information
- **Hierarchy information**: Parent relationships, child counts
- **Loop analysis**: Loop participation and cutoff status
- **Dependency visualization**: Interactive incoming/outgoing dependency lists
- **Navigation support**: Click dependencies to view related elements

## Usage Examples

### Basic Implementation

```tsx
import { GanttChartCanvas } from '@/components/gantt-chart-canvas';

const elements = [
  {
    id: 'task1',
    type: 'task' as const,
    name: 'Research Phase',
    start: new Date('2023-01-01').getTime(),
    end: new Date('2023-01-15').getTime(),
    color: '#1890ff',
    elementType: 'User Task',
  },
  {
    id: 'milestone1',
    type: 'milestone' as const,
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
    type: 'finish-to-start' as const,
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

### Advanced Configuration

```tsx
<GanttChartCanvas
  elements={elements}
  dependencies={dependencies}
  showInstanceColumn={true}
  showLoopColumn={true}
  options={{
    initialZoom: 75,
    taskListWidth: 400,
    autoFitPadding: 0.15,

    grid: {
      major: {
        color: '#2196F3',
        lineWidth: 1.5,
        timelineTickSize: 12,
      },
      minor: {
        color: '#E3F2FD',
        lineWidth: 0.8,
        timelineTickSize: 0,
      },
    },

    onElementClick: (element) => {
      console.log('Element clicked:', element);
    },

    onZoomChange: (zoom) => {
      console.log('Zoom changed to:', zoom);
    },

    onViewChange: (visibleRange) => {
      console.log('Visible time range:', visibleRange);
    },
  }}
/>
```

### Ghost Elements and Alternative Timings

```tsx
const elementsWithGhosts = [
  {
    id: 'task1',
    type: 'task' as const,
    name: 'Approval Process',
    start: new Date('2023-01-01').getTime(),
    end: new Date('2023-01-03').getTime(),
    color: '#1890ff',

    // Alternative timing scenarios
    ghostOccurrences: [
      {
        start: new Date('2023-01-05').getTime(),
        end: new Date('2023-01-08').getTime(),
        instanceId: 'task1_instance_2',
      },
      {
        start: new Date('2023-01-10').getTime(),
        end: new Date('2023-01-12').getTime(),
        instanceId: 'task1_instance_3',
      },
    ],
  },
];

const ghostDependencies = [
  {
    id: 'ghost_dep1',
    sourceId: 'task1',
    targetId: 'task2',
    type: 'finish-to-start' as const,
    isGhost: true,
    sourceInstanceId: 'task1_instance_2',
    targetInstanceId: 'task2_instance_1',
  },
];
```

### BPMN Process Integration

```tsx
import { transformBPMNToGantt } from '@/components/bpmn-timeline';
import { GanttChartCanvas } from '@/components/gantt-chart-canvas';

// Transform BPMN process to Gantt data
const result = transformBPMNToGantt(
  bpmnDefinitions,
  startTime,
  'every-occurrence',
  loopDepth,
);

// Render with full BPMN support
<GanttChartCanvas
  elements={result.elements}
  dependencies={result.dependencies}
  currentDateMarkerTime={startTime}
  showInstanceColumn={true}
  showLoopColumn={true}
  options={{
    autoFitToData: true,
    showControls: true,
    showLoopIcons: true,
    curvedDependencies: false,
  }}
/>;
```

## Performance Characteristics

### Scalability Metrics

- **Small datasets (1-100 elements)**: 60fps interactions, <16ms render time
- **Medium datasets (100-500 elements)**: 60fps interactions, <32ms render time
- **Large datasets (500-1000 elements)**: 30-60fps interactions, adaptive buffering
- **Very large datasets (1000+ elements)**: Performance mode with reduced render frequency

### Memory Usage

- **Base memory**: ~2MB for component initialization
- **Per element**: ~200 bytes overhead (element caching and indexing)
- **Large dataset mode**: Automatic memory management with cache purging
- **Canvas buffers**: 5x viewport width canvas requires ~5x memory of visible area

### Browser Compatibility

- **Modern browsers**: Chrome 88+, Firefox 85+, Safari 14+, Edge 88+
- **Canvas 2D API**: Full support required for rendering
- **CSS Transforms**: GPU acceleration for smooth panning
- **High-DPI displays**: Device pixel ratio detection and optimization
- **Touch devices**: Basic touch support for mobile/tablet interactions

## Development and Testing

### Debug Capabilities

```typescript
// Enable debug logging
console.log('Visible time range:', timeMatrix.getVisibleTimeRange(chartWidth));
console.log('Current zoom level:', state.zoom);
console.log('Rendered elements:', visibleElements.length);
console.log('Performance metrics:', {
  renderTime: 'Measured via performance.now()',
  visibleElements: 'From ElementManager',
  zoomLevel: 'Current percentage',
});
```

### Testing Utilities

```typescript
import {
  calculateAutoFit,
  shouldAutoFit,
  TimeMatrix,
  ZoomCurveCalculator,
} from '@/components/gantt-chart-canvas';

// Test auto-fit calculations
const autoFitResult = calculateAutoFit(elements, containerWidth, 0.1);

// Test coordinate transformations
const matrix = new TimeMatrix(scale, translate, baseTime);
const screenX = matrix.transformPoint(timestamp);

// Test zoom calculations
const calculator = new ZoomCurveCalculator('DEFAULT');
const scale = calculator.calculateScale(75);
```

### Performance Monitoring

Monitor rendering performance through:

- Browser dev tools Performance tab
- Canvas rendering metrics
- Virtual scrolling efficiency
- Memory usage patterns
- Frame rate analysis during interactions

## Migration and API Evolution

### Current Version Features

- **Enhanced ghost elements**: 75% opacity alternative timing visualization
- **Advanced instance tracking**: Multiple element occurrences with unique IDs
- **Sophisticated dependencies**: Ghost dependency targeting with instance IDs
- **Loop detection system**: Visual indicators and analysis data
- **Performance optimizations**: Improved virtualization and caching
- **BPMN integration**: Full process flow visualization support

### API Stability

- **Core interfaces**: Stable with backward compatibility
- **Configuration options**: Additive changes only
- **Event handlers**: Consistent signature maintenance
- **Mathematical precision**: Fixed-point arithmetic and transformation accuracy
- **Rendering consistency**: Predictable visual output across updates

This comprehensive documentation covers all aspects of the gantt-chart-canvas component, from basic usage to advanced features and performance characteristics. The component provides a robust foundation for visualizing complex temporal data with the flexibility to adapt to various use cases and requirements.
