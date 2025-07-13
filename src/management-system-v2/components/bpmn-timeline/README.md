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
instanceId = `${elementId}_instance_${globalCounter++}`;

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
  otherFlows.forEach((flow) => {
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
maxLoopIterations: number = 1; // Default: allow 1 loop iteration (initial + 1 repetition)
maxLoopIterations: number = 0; // Stop at first repetition (initial + first repetition)
maxLoopIterations: number = 3; // Allow up to 3 loop iterations (initial + 3 repetitions)

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

### Gateways → Dependency Transformations

**Supported Types**:

- `bpmn:ExclusiveGateway` (XOR) - Choice/decision points
- `bpmn:ParallelGateway` (AND) - Synchronization and parallel execution

**Transformation Strategy**: **Gateway-Semantic Path Traversal** ✅ **Implemented**

- Gateways are **not rendered** as visible elements in the timeline (hidden when `renderGateways = false`)
- **Current Implementation**: Gateway semantics are applied directly during path traversal
  - When encountering a gateway, apply its timing and continue to targets
  - No gateway instances created - direct source→target dependencies
  - Gateway duration combined with flow durations
  - Synchronization logic handles parallel gateway joins with queueing mechanism

#### Exclusive Gateway (XOR) Logic

**Gateway-Semantic Process**:

1. **During path traversal**: When encountering an exclusive gateway
2. **Apply gateway timing**: Add gateway duration to current time
3. **Create branching paths**: Each outgoing flow creates a separate execution path
4. **Direct dependencies**: Create source→target dependencies skipping gateway instances
5. **Combined timing**: Gateway duration + flow duration applied to path timing

**Duration Calculation**:

```
Next Element Start Time = Current Time + Gateway Duration + Flow Duration
```

- **Gateway Duration**: From extensionElements or 0ms default
- **Flow Durations**: From extensionElements or 0ms default
- **Path Timing**: Applied directly during traversal

**Path-Based Execution**:

```
Original BPMN:
TaskA → ExclusiveGateway → TaskB
                        → TaskC

Path Traversal Result:
Path 1: TaskA → TaskB (via gateway timing)
Path 2: TaskA → TaskC (via gateway timing)
Dependencies: TaskA→TaskB, TaskA→TaskC
```

#### Parallel Gateway (AND) Logic

**Gateway-Semantic Process**:

1. **Fork Pattern**: One incoming flow, multiple outgoing flows
   - Apply gateway timing and create separate paths for each outgoing flow
   - All paths start simultaneously after gateway completion
2. **Join Pattern**: Multiple incoming flows, one or more outgoing flows
   - Use synchronization queuing to wait for all required source elements
   - Create single target instance once all sources arrive

**Synchronization Behavior**:

- **Fork semantics**: All outgoing branches start simultaneously when the incoming branch completes
- **Join semantics**: Queues paths until ALL required sources complete, then proceeds with synchronized timing
- **Path-based synchronization**: Each source element must complete before join gateway activates
- **Single instance creation**: Join creates one target instance with multiple dependencies

**Advanced Synchronization Features**:

- **Synchronization queue**: Paths are queued at parallel joins until all required sources arrive
- **Multi-source detection**: Automatically identifies which source elements must synchronize
- **Timing coordination**: Uses latest completion time across all sources for synchronized start
- **Source element tracking**: Maintains original source elements through gateway chains

**Timing Calculation**:

```
For Parallel Fork:
Next Element Start Time = Current Time + Gateway Duration + Flow Duration
(Applied to each outgoing flow simultaneously)

For Parallel Join:
Synchronized Start Time = max(all source completion times) + Gateway Duration + Flow Duration
```

**Path-Based Execution Examples**:

**Parallel Fork (Split)**:

```
Original BPMN:
TaskA → ParallelGateway → TaskB
                       → TaskC

Path Traversal Result:
Path 1: TaskA → TaskB (fork branch 1)
Path 2: TaskA → TaskC (fork branch 2)
Dependencies: TaskA→TaskB, TaskA→TaskC
Both TaskB and TaskC start simultaneously after TaskA
```

**Parallel Join (Synchronization)**:

```
Original BPMN:
TaskA → ParallelGateway → TaskD
TaskB → ParallelGateway → TaskE

Path Traversal Result:
- TaskA and TaskB execute in parallel
- ParallelGateway queues paths until both TaskA AND TaskB complete
- Creates single TaskD instance with dependencies: TaskA→TaskD, TaskB→TaskD
- Creates single TaskE instance with dependencies: TaskA→TaskE, TaskB→TaskE
- TaskD and TaskE start simultaneously at synchronization point
```

## Structural Path Interpretation and Validation

### **Current Approach: Structural Path Analysis**

The BPMN timeline component implements **structural path analysis** rather than strict BPMN token flow semantics. This design choice provides valuable insights for process modeling and analysis while handling invalid or incomplete BPMN patterns gracefully.

#### **Key Characteristics:**

**Path-Based Element Creation:**

- **Multiple instances**: Elements can appear multiple times if reached via different paths
- **Structural exploration**: Shows all possible execution routes through the process
- **Instance identification**: Each path-based occurrence gets a unique instance ID
- **Timing calculation**: Based on path arrival times and element durations

**Gateway Semantic Processing:**

- **No gateway instances**: Gateways are processed semantically during traversal
- **Direct dependencies**: Create source→target connections skipping gateway instances
- **Timing integration**: Gateway and flow durations combined in path timing
- **Synchronization logic**: Parallel joins queue paths until all required sources arrive

#### **Example: Same Element, Multiple Paths**

```
BPMN Structure:
S → G1(PARALLEL) → T1 → T2 → G2(PARALLEL) → E
    G1           → T2 → G2

Structural Path Result:
- S: 1 instance
- T1: 1 instance
- T2: 2 instances (one from each path)
- E: 2 instances (one from each T2 instance)

Dependencies: S→T1, S→T2(inst1), T1→T2(inst2), T2(inst1)→E(inst1), T2(inst2)→E(inst2)
```

### **Comparison with BPMN Token Flow Semantics**

#### **BPMN Token Flow (Specification-Compliant):**

```
Token Behavior:
- Single element instances receive multiple tokens
- Parallel joins synchronize tokens before proceeding
- Result: S, T1, T2 (single instance), E (single instance)
- T2 processes both tokens sequentially or in parallel
- G2 waits for both tokens from T2 before creating single E token
```

#### **Structural Path Analysis (Current Implementation):**

```
Path Behavior:
- Elements create instances for each execution path
- Paths are tracked independently through the process
- Result: S, T1, T2 (inst1), T2 (inst2), E (inst1), E (inst2)
- Each T2 instance follows its own execution path
- G2 doesn't synchronize T2 instances (same element, different paths)
```

### **Validation and Structural Warnings**

The component includes validation logic to detect potentially problematic BPMN patterns while still generating useful timeline visualizations.

#### **Gateway Mismatch Detection:**

Identifies patterns that would cause deadlocks in real BPMN execution:

```typescript
// Example: Exclusive Gateway → Parallel Join
S → G1(EXCLUSIVE) → T1 → G2(PARALLEL) → E
    G1            → T2 → G2

Warning: "Potential deadlock detected: Parallel join gateway 'G2' receives flows
from exclusive gateway 'G1'. In real BPMN execution, this could cause the parallel
join to wait indefinitely for flows that may never arrive."
```

#### **Structural Issue Types:**

- **Deadlock patterns**: Exclusive→parallel join combinations
- **Gateway chains**: Complex gateway-to-gateway connections
- **Asymmetric flows**: Parallel branches with different convergence points
- **Loop complexities**: Gateway interactions within loop structures

### **Why Structural Path Analysis is Sufficient**

#### **Benefits for Process Modeling:**

1. **Design-Time Analysis**: Shows all possible process paths during modeling
2. **Incomplete Pattern Handling**: Works with invalid or incomplete BPMN patterns
3. **Visual Process Understanding**: Helps identify potential process issues
4. **Structural Insight**: Reveals process complexity and flow patterns
5. **Educational Value**: Shows the difference between structure and execution

#### **Use Cases Where This Approach Excels:**

- **Process design and review**: Understanding all possible execution scenarios
- **Process optimization**: Identifying redundant or problematic paths
- **Compliance analysis**: Verifying that all required paths are present
- **Training and documentation**: Showing process structure and complexity
- **Risk assessment**: Understanding worst-case execution scenarios

#### **Limitations Compared to Token Flow:**

- **Not execution-accurate**: Doesn't represent actual process engine behavior
- **Instance proliferation**: Same elements may appear multiple times
- **Synchronization differences**: May not match runtime synchronization behavior
- **Resource modeling**: Doesn't account for resource constraints or conflicts

### **Alternative: BPMN Token Flow Implementation**

A token-based implementation would provide execution-accurate modeling:

#### **Technical Approach:**

```typescript
interface TokenBasedElement {
  elementId: string;
  tokens: Array<{ sourceId: string; arrivalTime: number }>;
  executions: Array<{ startTime: number; endTime: number }>;
  overallDuration: number; // Extended for multiple token processing
}
```

#### **Benefits of Token Flow:**

- ✅ **BPMN Specification Compliance**: Matches actual process engine behavior
- ✅ **Accurate Resource Modeling**: Single instances with extended durations
- ✅ **Proper Synchronization**: Parallel joins wait for all required tokens
- ✅ **Realistic Timing**: Accounts for sequential token processing

#### **Why Current Approach is Preferred:**

1. **Modeling Flexibility**: Handles invalid BPMN patterns gracefully
2. **Design-Time Utility**: More useful during process design phase
3. **Implementation Simplicity**: Less complex state management
4. **Visual Clarity**: Easier to understand structural relationships
5. **Performance**: More efficient for large, complex processes

**The structural path analysis approach serves the component's primary purpose of process analysis and timeline visualization while remaining robust and user-friendly for process modeling scenarios.**

### **Implementation Status**

**✅ Current Features:**

- **Gateway-semantic traversal**: Implemented and tested
- **Parallel gateway synchronization**: Working with queueing mechanism
- **Exclusive gateway branching**: Path-based implementation
- **Direct source→target dependencies**: No gateway instances in timeline
- **Structural validation**: Deadlock pattern detection
- **Complex gateway patterns**: Nested, chained, and mixed gateway types supported

**⚠️ Known Considerations:**

- **BPMN vs. Structural semantics**: Shows structural paths, not token flow execution
- **Instance proliferation**: Same elements may appear multiple times in complex paths
- **Validation warnings**: Detects but allows potentially invalid BPMN patterns

### Unsupported Elements

**Current Limitations**: These elements are excluded and reported as errors

- Gateway types other than `bpmn:ExclusiveGateway` and `bpmn:ParallelGateway` (`bpmn:InclusiveGateway`, `bpmn:ComplexGateway`, `bpmn:EventBasedGateway`)
- `bpmn:SubProcess` and `bpmn:AdHocSubProcess`
- `bpmn:BoundaryEvent`

**Issue Reporting**: Comprehensive reporting with element details and exclusion reasons

- **Errors**: Block timeline generation (e.g., unsupported elements, malformed data)
- **Warnings**: Allow timeline generation but flag potential issues (e.g., structural problems, gateway mismatches)

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

## Issue Reporting and Validation

### Comprehensive Issue Reporting

```typescript
interface TransformationIssue {
  elementId: string;
  elementType: string;
  elementName?: string;
  reason: string;
  severity: 'error' | 'warning';
}
```

### Issue Severity Levels

**Errors (Blocking)**:

- **Impact**: Prevent timeline generation
- **Examples**: Unsupported elements, malformed data, missing dependencies
- **Handling**: Transformation stops, user must fix before proceeding

**Warnings (Non-blocking)**:

- **Impact**: Allow timeline generation but flag potential issues
- **Examples**: Gateway mismatches, structural deadlock risks
- **Handling**: Timeline generated with issue flags for user awareness

### Status Display

- **Success rate**: "15/20 elements processed successfully (75%)"
- **Issue summary**: "5 errors, 2 warnings occurred" with expandable details
- **Element breakdown**: Total vs processed vs failed vs warned counts

### Issue Categories

**1. Structural Validation (Warnings)**

- **Gateway mismatches**: Exclusive → parallel join patterns that could deadlock
- **Loop complexity**: Excessive nesting or iterations
- **Path explosion risks**: Complex branching patterns

**2. Element Support (Errors)**

- **Unsupported element types**: Complex gateways, SubProcesses, BoundaryEvents
- **Malformed data**: Missing required properties, invalid references
- **Resource limits**: Path explosion, memory constraints

**3. Process Structure (Errors)**

- **Circular dependencies**: Unresolvable loops without proper gateways
- **Disconnected components**: Elements not connected to main flow
- **Invalid references**: Sequence flows pointing to non-existent elements

### Testing Gateway Mismatch Detection

**Example Test Case**:

```typescript
// Process structure that triggers deadlock warning:
const testElements = [
  { id: 'start', $type: 'bpmn:StartEvent', outgoing: ['flow1'] },
  { id: 'task1', $type: 'bpmn:Task', incoming: ['flow1'], outgoing: ['flow2'] },
  {
    id: 'exclusive1',
    $type: 'bpmn:ExclusiveGateway',
    incoming: ['flow2'],
    outgoing: ['flow3', 'flow4'],
  },
  { id: 'task2', $type: 'bpmn:Task', incoming: ['flow3'], outgoing: ['flow5'] },
  { id: 'task3', $type: 'bpmn:Task', incoming: ['flow4'], outgoing: ['flow6'] },
  {
    id: 'parallel1',
    $type: 'bpmn:ParallelGateway',
    incoming: ['flow5', 'flow6'],
    outgoing: ['flow7'],
  },
  { id: 'task4', $type: 'bpmn:Task', incoming: ['flow7'], outgoing: ['flow8'] },
  { id: 'end', $type: 'bpmn:EndEvent', incoming: ['flow8'] },
  // Sequence flows...
];

// Expected warning:
// "Potential deadlock detected: Parallel join gateway 'parallel1' receives flows
//  from exclusive gateway(s) 'exclusive1'. In real BPMN execution, this could cause
//  the parallel join to wait indefinitely for flows that may never arrive."
```

**Test Patterns Covered**:

- ✅ **Direct exclusive → parallel**: Simple case above
- ✅ **Nested gateways**: Exclusive → Task → Exclusive → Parallel
- ✅ **Multiple exclusive origins**: Two exclusive gateways feeding one parallel join
- ✅ **Gateway chains**: Complex sequences with multiple gateway types
- ✅ **Loop structures**: Gateway mismatches within loop constructs

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
├── index.tsx              # Main component and UI
├── transform.ts           # Main transformation orchestration with gateway preprocessing
├── element-transformers.ts # Element transformation functions and gateway preprocessing
├── timing-calculator.ts   # Earliest occurrence timing calculation algorithm
├── path-traversal.ts      # Every occurrence algorithm
├── types.ts              # TypeScript interfaces
├── utils.ts              # Helper functions
├── requirements.md       # Implementation requirements
└── README.md            # This documentation
```

### Key Functions

- `transformBPMNToGantt()`: Main transformation entry point with mode-specific gateway handling
- `calculateElementTimings()`: Earliest occurrence algorithm with mathematical synchronization
- `calculatePathBasedTimings()`: Every occurrence algorithm with gateway-semantic traversal
- `buildProcessGraph()`: Graph construction for path traversal
- `traverseAllPaths()`: Core path exploration with **new gateway-semantic handling**
- `buildSynchronizationRequirements()`: Creates synchronization rules for parallel gateway joins
- `extractDuration()`: ISO 8601 duration parsing
- ~~`preprocessGateways()`~~: **Being phased out** - replaced by semantic approach
- ~~`extractGatewayMetadata()`~~: **May be deprecated** - less needed with semantic approach

### Gateway-Semantic Path Traversal Implementation ⚠️ **New Approach**

**Core Concept**: Instead of preprocessing gateways into synthetic flows, apply gateway semantics directly during path traversal.

**Implementation Logic**:

```typescript
// When encountering an element during traversal:
if (isGatewayElement(element)) {
  // Gateway: Apply semantics and continue to targets
  const gatewayDuration = extractDuration(element) || 0;
  const gatewayEndTime = currentTime + gatewayDuration;

  // Get outgoing flows and create paths directly to targets
  outgoingFlows.forEach((flow, flowIndex) => {
    const flowDuration = extractDuration(flow) || 0;
    const nextTime = gatewayEndTime + flowDuration; // Combined timing

    pathsToExplore.push({
      elementId: targetId,
      pathKey: `${pathKey}_gw_${elementId}_${flowIndex}`,
      currentTime: nextTime,
      sourceInstanceId: sourceInstanceId, // Skip gateway in dependency chain
      flowId: flow.id,
    });
  });
} else {
  // Non-gateway: Create instance and continue normally
  // ... standard instance creation and dependency logic
}
```

**Key Benefits**:

- ✅ **Eliminates complex transitive logic**: No post-processing dependency transformation needed
- ✅ **Natural instance flow**: Dependencies go directly from source to target instances
- ✅ **Consistent timing**: Gateway duration properly included in flow timing
- ✅ **Mode compatibility**: Works identically across earliest/every/latest occurrence modes
- ✅ **Simplified debugging**: No mismatch between element IDs and instance IDs

**Gateway Semantics Applied**:

- **Parallel Fork**: All outgoing paths get same source instance, different targets
- **Parallel Join**: Multiple source instances connect to same target (via synchronization)
- **Exclusive Gateway**: Alternative paths from same source to different targets
- **Gateway Chains**: Natural traversal through gateway sequences

**Current Status**:

- ✅ **Path traversal updated**: Gateway handling implemented in `traverseAllPaths()`
- ✅ **Instance creation**: Only non-gateway elements create instances
- ✅ **Dependency creation**: Direct source→target connections
- ⚠️ **Needs validation**: Parallel gateway synchronization behavior
- ⚠️ **Needs testing**: Complex gateway patterns and edge cases

### Synchronization Queue Implementation (Every Occurrence Mode)

**Core Algorithm**: Path-based synchronization with queueing mechanism

**Queue Management**:

```typescript
// Queue paths that need synchronization
const syncQueues = new Map<string, Array<QueuedPath>>(); // key: "targetId:gatewayId"

// Track which sources have arrived for each sync point
const syncArrivals = new Map<
  string,
  {
    arrivedSources: Set<string>;
    completionTimes: Map<string, number>;
  }
>(); // key: "targetId:gatewayId"
```

**Synchronization Process**:

1. **Path Detection**: When a path reaches an element requiring synchronization
2. **Queue Addition**: Path is queued with its completion time and source information
3. **Arrival Tracking**: System tracks which required sources have arrived
4. **Synchronization Check**: When all required sources arrive, synchronization triggers
5. **Batch Processing**: All queued paths are processed with synchronized timing (latest completion time)
6. **Unique Path Keys**: Synchronized paths get unique identifiers to prevent duplicate detection

**Path Signature Management**:

- **Duplicate Prevention**: Uses `elementId:pathKey:visitedElements` signatures to prevent infinite loops
- **Synchronized Path Uniqueness**: Adds sync markers to path keys (e.g., `_sync_targetId:gatewayId`) to ensure synchronized paths are processed
- **Visited Element Tracking**: Maintains full path history for accurate loop detection

**Benefits**:

- ✅ **Accurate parallel semantics**: All instances start at the correct synchronized time
- ✅ **Multi-path convergence**: Handles complex scenarios with multiple parallel branches
- ✅ **Loop compatibility**: Works correctly with parallel gateways inside loops
- ✅ **Performance optimized**: Only synchronizes when actually needed

### Testing Considerations

- **Unit tests**: Individual algorithm components, gateway preprocessing, synchronization logic
- **Integration tests**: Full transformation workflows with complex parallel structures
- **Performance tests**: Large process handling, path explosion scenarios
- **Edge case tests**: Loops, branches, malformed data, gateway chains, asymmetric flows
- **Synchronization tests**: Multi-path convergence, nested parallel gateways, mixed gateway types
