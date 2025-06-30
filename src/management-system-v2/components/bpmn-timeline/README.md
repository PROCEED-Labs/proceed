# BPMN Timeline Component

The BPMN Timeline component transforms BPMN process definitions into Gantt chart visualizations, providing two distinct traversal modes for different analysis needs.

## Overview

This component converts BPMN process data into timeline representations using sophisticated algorithms that handle complex process flows, loops, and branching structures. The component supports three primary modes: **Earliest Occurrence** (default), **Every Occurrence** (path-based), and **Latest Occurrence** (worst-case scenario).

## Transform Rules and Algorithms

### 1. Earliest Occurrence Mode (Default)

**Algorithm**: First Possible Occurrence
**Implementation**: `transform.ts` → `calculateElementTimings()`

#### Core Principles
- Each element appears exactly **once** in the timeline
- Elements start as soon as **any** incoming flow completes (earliest possible time)
- Uses iterative propagation through the process graph
- Supports early occurrence updates when later flows enable earlier start times

#### Algorithm Steps
```
1. Initialize elements without incoming flows at startTime
2. Iteratively process elements:
   - Calculate earliest start = min(all incoming flow completion times)
   - Update if earlier than existing timing
3. Handle unprocessed elements (cycles/missing deps) at startTime
```

#### Use Cases
- **Process optimization**: Identify the shortest possible execution path
- **Resource planning**: Understand minimum timeline requirements
- **Critical path analysis**: See dependencies that affect overall duration
- **Timeline estimation**: Get realistic minimum completion times

#### Example Transformation
```
BPMN Process:
StartEvent → Task A (2h) → Task B (1h)
                    ↓
                Task C (30m) → EndEvent

Timeline Result:
- StartEvent: milestone at 00:00
- Task A: 00:00 - 02:00
- Task B: 02:00 - 03:00  
- Task C: 02:00 - 02:30
- EndEvent: milestone at 02:30 (earliest completion)
```

### 2. Every Occurrence Mode (Path-Based)

**Algorithm**: Path-based traversal with instance generation
**Implementation**: `path-traversal.ts` → `calculatePathBasedTimings()`

#### Core Principles
- Elements can appear **multiple times** (once per execution path)
- Explores **all possible execution paths** through the process
- Creates **unique instances** for each occurrence with instance IDs
- Supports **configurable loop iterations**
- Handles **branching** (parallel/exclusive paths)
- Prevents path explosion with MAX_PATHS constraint (100)

#### Algorithm Steps
```
1. Build process graph (nodes and edges)
2. Start paths from all start nodes
3. For each path:
   - Traverse elements sequentially
   - Track loop iterations (configurable depth)
   - Branch at decision points (create new paths)
   - Generate unique instance IDs
4. Group instances by original element ID
```

#### Path Explosion Prevention
- **MAX_PATHS**: Limited to 100 concurrent paths
- **Loop limits**: Configurable max iterations per element
- **Element limits**: Maximum 1000 total path elements
- **Branching strategy**: Breadth-first exploration with pruning

#### Instance ID Generation
```typescript
// Global counter ensures uniqueness across all paths
instanceId = `${elementId}_instance_${globalCounter++}`

// Example: "Task_A_instance_1", "Task_A_instance_2", etc.
```

#### Loop Handling
- **StandardLoopCharacteristics**: Sequential iterations
- **MultiInstanceLoopCharacteristics**: Parallel or sequential instances
- **Loop detection**: Prevents infinite loops with iteration limits
- **State tracking**: Maintains loop counts per element per path

**Loop Depth Semantics**:
- **Loop Depth 0**: Explore paths until first repetition is reached (allow initial visit + first repetition)
- **Loop Depth 1**: Allow 1 loop iteration (initial visit + 1 repetition)
- **Loop Depth N**: Allow N loop iterations (initial visit + N repetitions)

#### Branching Logic
```typescript
// When multiple outgoing flows exist:
if (outgoingFlows.length > 1) {
  // First flow continues current path
  currentPath.continue(firstFlow.target);
  
  // Additional flows create new paths
  otherFlows.forEach(flow => {
    const newPath = currentPath.clone();
    newPath.continue(flow.target);
    branchedPaths.push(newPath);
  });
}
```

#### Use Cases
- **Process simulation**: See all possible execution scenarios
- **Compliance analysis**: Verify all paths meet requirements
- **Resource capacity planning**: Understand maximum resource needs
- **Risk assessment**: Identify all possible outcomes
- **Training scenarios**: Show different process variations

#### Example Transformation
```
BPMN Process with Loop:
StartEvent → Task A (2h) → ExclusiveGateway
                              ↓ (condition1)
                            Task B (1h) → EndEvent
                              ↓ (condition2)  
                            Task C (30m) → Loop back to Task A (max 2 iterations)

Timeline Result (Every Occurrence):
Path 1 - Direct:
- StartEvent: milestone at 00:00
- Task A (instance 1): 00:00 - 02:00
- Task B (instance 1): 02:00 - 03:00
- EndEvent: milestone at 03:00

Path 2 - Loop once:
- StartEvent: milestone at 00:00  
- Task A (instance 1): 00:00 - 02:00
- Task C (instance 1): 02:00 - 02:30
- Task A (instance 2): 02:30 - 04:30
- Task B (instance 1): 04:30 - 05:30
- EndEvent: milestone at 05:30

Path 3 - Loop twice:
- StartEvent: milestone at 00:00
- Task A (instance 1): 00:00 - 02:00
- Task C (instance 1): 02:00 - 02:30
- Task A (instance 2): 02:30 - 04:30
- Task C (instance 2): 04:30 - 05:00
- Task A (instance 3): 05:00 - 07:00
- Task B (instance 1): 07:00 - 08:00
- EndEvent: milestone at 08:00
```

### 3. Latest Occurrence Mode (Worst-Case Scenario)

**Algorithm**: Path-based traversal with latest occurrence selection
**Implementation**: `transform.ts` → `calculateLatestOccurrenceTimings()`

#### Core Principles
- Each element appears exactly **once** in the timeline (like Earliest Occurrence)
- Elements show their **latest possible start time** across all execution paths
- Uses path-based exploration (like Every Occurrence) but selects latest timing
- Supports configurable loop iterations
- Shows **worst-case scenario** for process completion

#### Algorithm Steps
```
1. Execute path-based traversal (same as Every Occurrence mode)
2. For each element ID, collect all instances across all paths
3. Select the instance with the latest start time
4. Create single Gantt element using latest timing
```

#### Use Cases
- **Risk assessment**: Understand worst-case execution scenarios
- **Buffer planning**: Plan for maximum possible delays
- **Capacity planning**: Prepare for peak resource requirements
- **SLA definition**: Set realistic service level agreements
- **Contingency planning**: Account for all possible delays

#### Example Transformation
```
Same BPMN Process as Every Occurrence example:

Timeline Result (Latest Occurrence):
- StartEvent: milestone at 00:00 (same across all paths)
- Task A: 05:00 - 07:00 (latest occurrence from Path 3)
- Task C: 04:30 - 05:00 (latest occurrence from Path 3)
- Task B: 07:00 - 08:00 (latest occurrence from Path 3)
- EndEvent: milestone at 08:00 (worst-case completion)
```

#### Configuration
```typescript
// Loop depth setting
maxLoopIterations: number = 1 // Default: allow 1 loop iteration (initial + 1 repetition)
maxLoopIterations: number = 0 // Stop at first repetition (initial + first repetition)
maxLoopIterations: number = 3 // Allow up to 3 loop iterations (initial + 3 repetitions)

// Available through space settings:
// - 'positioning-logic': 'earliest-occurrence' | 'every-occurrence' | 'latest-occurrence'
// - 'loop-depth': number (for path-based modes)
// - 'chronological-sorting': boolean (default: false)
// - 'show-loop-icons': boolean (default: true)
// - 'curved-dependencies': boolean (default: false)
```

## Element Transformation Rules

### Tasks → Gantt Tasks
**Supported Types**: All task types
- `bpmn:Task` (generic)
- `bpmn:ManualTask`
- `bpmn:UserTask` 
- `bpmn:ServiceTask`
- `bpmn:ScriptTask`
- `bpmn:BusinessRuleTask`
- `bpmn:SendTask`
- `bpmn:ReceiveTask`
- `bpmn:CallActivity`

**Transformation**:
- **Visual**: Rectangular bars in Gantt chart
- **Duration**: ISO 8601 from `proceed:timePlannedDuration` or 1 hour default
- **Type Column**: Shows human-readable task type (e.g., "User Task", "Service Task", "Manual Task")
- **Enhanced Properties**: 
  - `isLoop`: Indicates element participates in a loop structure
  - `isPathCutoff`: Shows where flow traversal was terminated
  - `isLoopCut`: Marks where loop iteration limit was reached

### Events → Gantt Milestones
**Supported Types**: All except BoundaryEvents
- `bpmn:StartEvent`
- `bpmn:EndEvent`
- `bpmn:IntermediateThrowEvent`
- `bpmn:IntermediateCatchEvent`

**Transformation**:
- **Visual**: Diamond markers at completion time (Option A implementation)
- **Duration**: ISO 8601 from extensionElements or 0ms default
- **Positioning**: Milestone appears at `startTime + duration`
- **Type Column**: Shows event definition and position (e.g., "Message (Start)", "Timer (Intermediate)", "End")

### SequenceFlows → Gantt Dependencies
**Supported Types**: All sequence flows
- Normal flows
- Conditional flows  
- Default flows

**Transformation**:
- **Visual**: Arrows connecting elements (finish-to-start)
- **Duration**: Optional delay from extensionElements or 0ms default
- **Timing Impact**: Delays target element start by flow duration

### Unsupported Elements
**Current Limitations**: These elements are excluded and reported as errors
- All Gateway types (`bpmn:ExclusiveGateway`, `bpmn:ParallelGateway`, etc.)
- `bpmn:SubProcess` and `bpmn:AdHocSubProcess`
- `bpmn:BoundaryEvent`

**Error Handling**: Comprehensive error reporting with element details and exclusion reasons

## Duration Parsing

### ISO 8601 Support
**Format**: `P[n]Y[n]M[n]DT[n]H[n]M[n]S`
**Examples**:
- `P1D` = 1 day (86400000 ms)
- `PT2H30M` = 2 hours 30 minutes (9000000 ms)
- `P1DT2H` = 1 day 2 hours (93600000 ms)

### Extension Elements
```xml
<bpmn:extensionElements>
  <proceed:timePlannedDuration>PT1H</proceed:timePlannedDuration>
</bpmn:extensionElements>
```

### Default Durations
- **Tasks**: 1 hour (3600000 ms)
- **Events**: 0 ms (immediate)
- **SequenceFlows**: 0 ms (no delay)

## Visual Organization

### Color Assignment
- **Connected components**: Elements in same flow chain share colors
- **Color palette**: 8 distinct, accessible colors that cycle
- **Deterministic**: Same process always gets same colors

### Element Grouping
1. **By connected component**: Related elements grouped together
2. **Within-group sorting**: Configurable via `chronological-sorting` setting:
   - **Default (false)**: Priority-based sorting (Start Events → Tasks/Intermediate Events → End Events), then by start time
   - **Chronological (true)**: Pure chronological sorting by start time only
3. **By group start**: Groups ordered by earliest element start time

#### Chronological Sorting Detailed Behavior

**Default Sorting (chronological-sorting: false)**:
- **Preserves original traversal order** within connected components
- **Maintains logical flow** as discovered during process traversal
- **Groups related elements** naturally by their discovery sequence

**Chronological Sorting (chronological-sorting: true)**:
- **All elements** sorted purely by start time within their connected flow
- **Event types ignored** for positioning - only timing matters
- **Natural timeline flow** where elements appear exactly when they execute

**Example Impact**:
```
Process: StartEvent(00:00) → Task A(01:00-03:00) → EndEvent(02:30)

Default Sorting Result:
1. StartEvent (discovery order: 1st)
2. Task A (discovery order: 2nd) 
3. EndEvent (discovery order: 3rd)

Chronological Sorting Result:
1. StartEvent (time 00:00)
2. Task A (time 01:00)
3. EndEvent (time 02:30) - appears during Task A execution
```

### Instance Display (Every Occurrence Mode)
- **Instance labeling**: "Task A (instance 1 of 3)"
- **Unique coloring**: Each instance gets consistent color
- **Path identification**: Instances grouped by originating path

## Performance Considerations

### Path Explosion Prevention
- **MAX_PATHS = 100**: Concurrent path limit
- **Element limit**: 1000 total path elements maximum
- **Early termination**: Stops exploration when limits reached
- **Memory management**: Efficient data structures for large processes

### Optimization Strategies
- **Graph preprocessing**: Build efficient node/edge maps
- **Lazy evaluation**: Only compute visible portions when possible
- **Instance pooling**: Reuse objects to reduce garbage collection
- **Caching**: Store computed results for repeated transformations

## Error Handling

### Comprehensive Error Reporting
```typescript
interface TransformError {
  elementId: string;
  elementType: string;
  elementName?: string;
  reason: string;
}
```

### Status Display
- **Success rate**: "15/20 elements processed successfully (75%)"
- **Error summary**: "5 errors occurred" with expandable details
- **Element breakdown**: Total vs processed vs failed counts

### Error Categories
1. **Unsupported element types**: Gateways, SubProcesses, BoundaryEvents
2. **Malformed data**: Missing required properties, invalid references
3. **Circular dependencies**: Unresolvable loops without gateways
4. **Resource limits**: Path explosion, memory constraints

## Configuration

### Space Settings Integration
```typescript
// Timeline toggle
enabled: boolean = false

// Algorithm selection  
positioning-logic: 'earliest-occurrence' | 'every-occurrence' | 'latest-occurrence' = 'earliest-occurrence'

// Loop iteration control (path-based modes)
loop-depth: number = 1

// Element sorting within connected flows
chronological-sorting: boolean = false

// Visual enhancements
show-loop-icons: boolean = true
curved-dependencies: boolean = false
```

### Runtime Parameters
```typescript
// Transformation start time
startTime: number = Date.now()

// Default duration overrides
defaultDurations: DefaultDurationInfo[] = []

// Path limits (every-occurrence mode)
maxLoopIterations: number = 1
maxPaths: number = 100

// Element sorting preference
chronologicalSorting: boolean = false
```

## Integration Points

### Data Access
```typescript
// Enhanced data source - includes unsaved changes
let bpmnXml = process.bpmn;
if (modeler) {
  const currentXml = await modeler.getXML();
  if (currentXml) {
    bpmnXml = currentXml;
  }
}
const { rootElement: definitions } = await moddle.fromXML(bpmnXml);
```

### GanttChartCanvas Integration
```typescript
import { GanttChartCanvas } from '@/components/gantt-chart-canvas';

// Transform and render with enhanced options
const result = transformBPMNToGantt(definitions, timestamp, settings.positioningLogic, settings.loopDepth, settings.chronologicalSorting);
<GanttChartCanvas
  elements={result.elements}
  dependencies={result.dependencies}
  currentDateMarkerTime={timestamp}
  showInstanceColumn={settings.positioningLogic === 'every-occurrence'}
  showLoopColumn={settings.positioningLogic !== 'earliest-occurrence'}
  options={{
    showControls: true,
    autoFitToData: true,
    showLoopIcons: settings.showLoopIcons,
    curvedDependencies: settings.curvedDependencies,
  }}
/>
```

### State Management
- **Timeline view store**: Controls visibility and settings
- **Process modeler integration**: Receives bpmn-js modeler instance
- **Error state**: Local error handling with status display
- **Settings modal**: In-app configuration without leaving timeline view
- **Default duration tracking**: Visual feedback for elements using default durations

### User Interface Features

#### Settings Modal (`GanttSettingsModal.tsx`)
- **In-timeline configuration**: Change settings without leaving the view
- **Real-time updates**: Settings changes immediately trigger re-transformation
- **Space-level persistence**: Settings saved to space configuration
- **All options available**: Algorithm selection, loop depth, visual preferences

#### Visual Indicators
- **Loop warning icons**: Show elements that are part of loops (configurable)
- **Path cutoff markers**: Indicate where flow traversal was terminated
- **Instance labeling**: Clear identification in every-occurrence mode
- **Curved dependencies**: Optional rounded corners for dependency arrows
- **Default duration panels**: Collapsible information about elements using defaults

## Future Extensions

### Planned Features
- **Gateway support**: All gateway types with proper branching logic
- **SubProcess support**: Nested process handling
- **BoundaryEvent support**: Exception and interruption handling
- **Advanced time features**: Time zones, working hours, calendars

### Enhancement Opportunities
- **Critical path analysis**: Identify bottlenecks and dependencies
- **Resource modeling**: Capacity constraints and allocation
- **Simulation features**: Monte Carlo analysis, what-if scenarios
- **Export capabilities**: PDF, image, or data export options

---

## Development Notes

### Code Structure
```
components/bpmn-timeline/
├── index.tsx           # Main component and UI
├── transform.ts        # Earliest occurrence algorithm  
├── path-traversal.ts   # Every occurrence algorithm
├── types.ts           # TypeScript interfaces
├── utils.ts           # Helper functions
├── requirements.md    # Implementation requirements
└── README.md         # This documentation
```

### Key Functions
- `transformBPMNToGantt()`: Main transformation entry point
- `calculateElementTimings()`: Earliest occurrence algorithm
- `calculatePathBasedTimings()`: Every occurrence algorithm
- `buildProcessGraph()`: Graph construction for path traversal
- `extractDuration()`: ISO 8601 duration parsing

### Testing Considerations
- **Unit tests**: Individual algorithm components
- **Integration tests**: Full transformation workflows  
- **Performance tests**: Large process handling
- **Edge case tests**: Loops, branches, malformed data