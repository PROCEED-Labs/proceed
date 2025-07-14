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

**Transformation Strategy**: **Gateway-Semantic Path Traversal** **Implemented**

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

#### Inclusive Gateway (OR) Logic

**Timeline Visualization Approach**:

For timeline visualization purposes, inclusive gateways are treated identically to parallel gateways. This design choice provides a conservative analysis showing the maximum possible process duration.

**Reasoning**:

1. **Condition Evaluation Challenge**: BPMN inclusive gateways depend on runtime conditions (e.g., `amount > 1000`, `urgent == true`) that are not available during static process analysis.

2. **Conservative Analysis**: By treating inclusive gateways like parallel gateways, we show the "worst-case scenario" where all conditional flows are taken, providing useful insights for:
   - **Capacity planning**: Maximum resource requirements
   - **Timeline estimation**: Longest possible process duration
   - **Bottleneck identification**: All potential execution paths

3. **Semantic Translation**: 
   - **Inclusive Fork**: Creates paths for ALL outgoing flows (same as parallel fork)
   - **Inclusive Join**: Waits for ALL incoming flows (same as parallel join)
   - **Result**: Conservative timeline showing maximum complexity

**Gateway-Semantic Process**:

```
Original BPMN:
TaskA → InclusiveGateway → TaskB (condition: amount > 1000)
                        → TaskC (condition: urgent == true)

Timeline Visualization:
Path 1: TaskA → TaskB (showing potential execution)
Path 2: TaskA → TaskC (showing potential execution)
Dependencies: TaskA→TaskB, TaskA→TaskC
Result: Shows timeline if both conditions were true
```

**Benefits of This Approach**:
- **Simple implementation**: Reuses proven parallel gateway logic
- **Conservative estimates**: Never underestimates process complexity
- **No false assumptions**: Doesn't guess at business rule conditions
- **Useful for planning**: Shows maximum resource and time requirements

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

- **BPMN Specification Compliance**: Matches actual process engine behavior
- **Accurate Resource Modeling**: Single instances with extended durations
- **Proper Synchronization**: Parallel joins wait for all required tokens
- **Realistic Timing**: Accounts for sequential token processing

#### **Why Current Approach is Preferred:**

1. **Modeling Flexibility**: Handles invalid BPMN patterns gracefully
2. **Design-Time Utility**: More useful during process design phase
3. **Implementation Simplicity**: Less complex state management
4. **Visual Clarity**: Easier to understand structural relationships
5. **Performance**: More efficient for large, complex processes

**The structural path analysis approach serves the component's primary purpose of process analysis and timeline visualization while remaining robust and user-friendly for process modeling scenarios.**

### **Implementation Status**

**Current Features:**

- **Gateway-semantic traversal**: Implemented and tested
- **Parallel gateway synchronization**: Working with queueing mechanism
- **Exclusive gateway branching**: Path-based implementation
- **Direct source→target dependencies**: No gateway instances in timeline
- **Structural validation**: Deadlock pattern detection
- **Complex gateway patterns**: Nested, chained, and mixed gateway types supported

**Known Considerations:**

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

The component displays transformation results in the UI:

- **Issue Panel**: Collapsible panel showing process issues when errors or warnings exist
- **Error Section**: "Unsupported Elements (N)" - elements excluded from timeline
- **Warning Section**: "Structural Warnings (N)" - patterns that may not execute as expected
- **Default Duration Panel**: Shows elements using default durations with expandable details
- **Issue Details**: Each issue shows element name/ID, type, and specific reason

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

// Gateway visibility control
renderGateways: boolean = false
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

// Gateway visibility control
renderGateways: boolean = false
```

### Gateway Visibility and Filtering

The `renderGateways` parameter controls whether gateway elements are visible in the final timeline:

**When `renderGateways = false` (Default)**:

- Gateway instances are created during path traversal but filtered out of final output
- Dependencies are automatically "bypassed" to connect around hidden gateways
- Direct source→target connections are created via `filterDependenciesForVisibleElements()`
- Users see a clean timeline with tasks and events connected by logical dependencies

**When `renderGateways = true`**:

- Gateway instances appear as milestones in the timeline
- All dependencies preserved as-is, including connections to/from gateways
- Useful for debugging gateway logic and understanding process structure

**Bypass Dependency Creation**:

```typescript
// When gateways are hidden, direct connections are created:
// Original: Task A → Gateway → Task B
// Filtered: Task A → Task B (bypass dependency)
```

This approach allows the same gateway processing logic to serve both visualization modes without duplicating the transformation algorithms.

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

---

## Implementation Architecture

### File Organization

The component is organized into logical folders for better maintainability and scalability:

- **`core/`** - Core transformation algorithms and orchestration logic
- **`transformers/`** - Element-specific transformation functions and mode handlers
- **`types/`** - All TypeScript interface and type definitions
- **`utils/`** - Utility functions and helper methods
- **`styles/`** - Component styling and CSS modules

### Core Components

```
components/bpmn-timeline/
├── index.tsx                          # Main component and UI
├── GanttSettingsModal.tsx             # Settings modal component
├── gantt-settings-definition.ts       # Settings configuration
├── README.md                          # This documentation
├── test-cases.md                      # Comprehensive test cases
├── core/                              # Core transformation logic
│   ├── transform.ts                   # Transformation orchestration
│   ├── transform-helpers.ts           # Validation and utility functions
│   ├── path-traversal.ts              # Path-based traversal algorithm
│   └── synchronization.ts             # Gateway synchronization logic
├── transformers/                      # Element-specific transformers
│   ├── element-transformers.ts        # Element transformation functions
│   └── mode-handlers.ts               # Mode-specific result processing
├── types/                             # TypeScript definitions
│   └── types.ts                       # All interface definitions
├── utils/                             # Utilities and helpers
│   └── utils.ts                       # Helper functions and utilities
└── styles/                            # Component styling
    └── BPMNTimeline.module.scss       # CSS modules for styling
```

### Key Implementation Details

**Unified Path-Based Architecture**:

- All modes (earliest/every/latest) use path-based traversal with gateway-semantic processing
- Gateway semantics applied during traversal, not in post-processing
- Optional gateway visibility controlled by `renderGateways` parameter
- Dependency filtering creates bypass connections when gateways are hidden

**Gateway Processing**:

- Gateways processed semantically during path traversal
- Direct source→target dependencies created, skipping gateway instances
- Parallel gateway synchronization uses queueing mechanism
- Gateway timing and flow durations combined in single operation

**Performance Safeguards**:

- Maximum 100 concurrent paths (path explosion prevention)
- Maximum 1000 total path elements
- Configurable loop iteration limits
- Early termination when limits reached

### Current Implementation Status

- **Gateway-semantic traversal**: Fully implemented
- **Parallel/exclusive gateway support**: Complete
- **All traversal modes**: Working (earliest/every/latest occurrence)
- **Gateway visibility control**: Implemented via `renderGateways`
- **Dependency filtering**: Bypass logic for hidden gateways
- **Synchronization logic**: Queueing mechanism for parallel joins
- **Issue detection**: Gateway mismatch warnings, unsupported element errors

### Future Enhancements

- **Additional gateway types**: Inclusive, complex, event-based gateways
- **SubProcess support**: Nested process handling
- **BoundaryEvent support**: Exception and interruption handling
- **Advanced features**: Critical path analysis, resource modeling
