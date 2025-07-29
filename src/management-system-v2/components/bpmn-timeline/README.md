# BPMN Timeline Component

The BPMN Timeline component transforms BPMN process definitions into Gantt chart visualizations, providing two distinct traversal modes for different analysis needs.

## Overview

This component converts BPMN process data into timeline representations using sophisticated algorithms that handle complex process flows, loops, and branching structures. The component supports three primary modes: **Earliest Occurrence** (default), **Every Occurrence** (path-based), and **Latest Occurrence** (worst-case scenario).

## Transform Rules and Algorithms

**Core Architecture**: All traversal modes use unified **scoped path-based traversal** with hierarchical sub-process support and mode-specific result processing.

**Primary Implementation**: `scoped-traversal.ts` → `calculateScopedTimings()` → Mode-specific handlers

### Scoped Traversal Architecture

**Hierarchical Scope System**:

- **ProcessScope structure**: Organizes elements into scopes (main process + nested sub-processes)
- **Independent traversal**: Each scope traversed with own path exploration and visit tracking
- **Shared instance counter**: Ensures unique instance IDs across all scopes and modes
- **Parent-child relationships**: Maintained through `parentInstanceId` and `scopeInstanceId`

**Technical Implementation**:

- **ProcessScope**: Hierarchical scope organization with child scope mapping
- **TraversalContext**: Maintains scope state, timing, visit tracking, and instance management
- **Recursion protection**: Maximum 10 levels depth to prevent stack overflow
- **Gateway-semantic processing**: Gateways processed during traversal, not post-processed

### 1. Earliest Occurrence Mode (Default)

**Algorithm**: Scoped path-based traversal with earliest occurrence selection
**Implementation**: `transform.ts` → `calculateScopedTimings()` → `handleEarliestOccurrenceMode()`

#### Core Principles

- Each element appears exactly **once** in the timeline
- Path-based exploration finds all possible execution routes
- Mode handler selects **earliest timing** from all discovered instances
- Supports hierarchical sub-processes with proper parent-child relationships

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

### 2. Every Occurrence Mode

**Algorithm**: Scoped path-based traversal with all instances preserved
**Implementation**: `transform.ts` → `calculateScopedTimings()` → `handleEveryOccurrenceMode()`

#### Core Principles

- Elements can appear **multiple times** (once per execution path within each scope)
- Scoped exploration of **all possible execution paths** through hierarchical process structure
- Creates **unique instances** for each occurrence with hierarchical instance IDs
- Supports **configurable loop iterations** per scope
- Handles **branching** (parallel/exclusive paths) with gateway-semantic processing
- Prevents path explosion with traversal limits (MAX_PATHS constraint)

#### Scoped Algorithm Process

```
1. Build hierarchical scope structure (main process + sub-processes)
2. For each scope:
   - Initialize path traversal with scope-specific context
   - Track loop iterations and visit counts per scope
   - Branch at decision points within scope boundaries
   - Generate hierarchical instance IDs with parent-child relationships
3. Flatten and organize all instances preserving scope hierarchy
4. Create dependencies respecting scope boundaries
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

**Algorithm**: Scoped path-based traversal with latest occurrence selection
**Implementation**: `transform.ts` → `calculateScopedTimings()` → `handleLatestOccurrenceMode()`

#### Core Principles

- Each element appears exactly **once** in the timeline (like Earliest Occurrence)
- Elements show their **latest possible start time** across all execution paths and scopes
- Uses same scoped exploration as Every Occurrence but mode handler selects latest timing
- Supports hierarchical sub-processes with complex parent-child alignment logic
- Shows **worst-case scenario** for process completion across all scopes

#### Scoped Algorithm Process

```
1. Execute scoped path-based traversal (same core process as Every Occurrence)
2. For each element ID across all scopes:
   - Collect all instances from all paths and scope contexts
   - Apply complex parent-child alignment logic for sub-processes
   - Select the instance with the latest start time
3. Create single Gantt element using latest timing with proper hierarchy
4. Fix parent-child relationships for sub-process instance alignment
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

**Supported Types**: All event types including BoundaryEvents

- `bpmn:StartEvent`
- `bpmn:EndEvent`
- `bpmn:IntermediateThrowEvent`
- `bpmn:IntermediateCatchEvent`
- `bpmn:BoundaryEvent`

**Transformation**:

- **Visual**: Diamond markers at completion time (Option A implementation)
- **Duration**: ISO 8601 from extensionElements or 0ms default
- **Positioning**: Milestone appears at `startTime + duration`
- **Type Column**: Shows event definition and position (e.g., "Message (Start)", "Timer (Intermediate)", "End")

#### Boundary Events

**Special Handling**: Boundary events have unique positioning, visual display, dependency behavior, and outgoing flow processing

**Visual Display**:

- **Milestone Type**: Always displayed as simple diamond milestones (no duration range visualization)
- **Duration Handling**: Even boundary events with duration are shown as point milestones, not duration ranges
- **Position**: Milestone appears at the calculated event time based on duration

**Positioning Logic**:

- **Vertical**: Positioned directly beneath their attached task using `groupAndSortElements` algorithm
- **Horizontal (No Duration)**: Centered horizontally within the attached task's timespan
- **Horizontal (With Duration)**: Positioned at task start time + event duration
- **Instance Handling**: Correctly handles task instance IDs (e.g., `Task_A_instance_1`) for proper positioning

**Dependencies**:

- **Attachment Dependencies**: Visual connection from attached task to boundary event

  - **Routing Strategy**:
    - **Normal**: Vertical line positioned 25px before the boundary event, then horizontal to event
    - **Constrained Space**: If insufficient space between task start and event, routes straight down from task to event
    - **Boundaries**: Never starts before task start time, never starts after event position
  - **Arrow Tips**: No arrow tips on boundary event dependencies (clean line ending)
  - **Line Style**: Solid lines for interrupting events, dashed lines for non-interrupting events
  - **Behavior**: Starts when attached task starts (`START_TO_START` dependency type)

- **Outgoing Dependencies**: Dependencies from boundary events to subsequent elements
  - **Start Position**: Always starts from the boundary event milestone position (not after duration)
  - **Standard Routing**: Uses normal dependency routing (no special visual treatment)
  - **Arrow Tips**: Standard arrow tips for outgoing dependencies

**Outgoing Flow Processing**:

- **Flow Inclusion**: Elements reachable through boundary event outgoing flows are automatically included
- **Multiple Instances**: In "every-occurrence" mode, handles loop instances intelligently:
  - **Loop Instance Integration**: When boundary events flow to elements already in loops, updates existing loop instances instead of creating duplicates
  - **New Elements Only**: Creates new instances only for elements not already reached through normal flow traversal
  - **Unique IDs**: For truly new elements, uses pattern `${targetId}_from_boundary_${boundaryEventId}_${flowId}`
  - **Example**: `Task_B_from_boundary_Event_Timer_Flow_123` (only if Task_B wasn't already in a loop)
- **Timing Calculation**: Target elements start at boundary event position + flow duration
- **Mode Support**: Works across all traversal modes (earliest, every, latest occurrence)

**Flow Types**:

- **Interrupting Boundary Events**: `boundary` flow type with solid dependency lines
- **Non-interrupting Boundary Events**: `boundary-non-interrupting` flow type with dashed dependency lines

**Properties**:

- `attachedToRef`: References the task this boundary event is attached to
- `cancelActivity`: Boolean indicating if this is an interrupting boundary event (default: true)
- `outgoing`: Array of outgoing sequence flows from the boundary event

**Path Traversal Integration**:

- **Exclusion**: Boundary events are excluded from normal path traversal to prevent duplicates
- **Special Processing**: Handled separately through dedicated boundary event functions
- **Component Assignment**: Assigned to same flow component as their attached task for proper coloring

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

**All BPMN gateway types are supported** with gateway-semantic path traversal:

| Gateway Type    | BPMN Element             | Fork Behavior       | Join Behavior         | Synchronization |
| --------------- | ------------------------ | ------------------- | --------------------- | --------------- |
| **Exclusive**   | `bpmn:ExclusiveGateway`  | Alternative paths   | Immediate consumption | None            |
| **Parallel**    | `bpmn:ParallelGateway`   | Simultaneous paths  | Wait for ALL tokens   | Yes             |
| **Inclusive**   | `bpmn:InclusiveGateway`  | Simultaneous paths  | Wait for ALL tokens   | Yes             |
| **Complex**     | `bpmn:ComplexGateway`    | Alternative paths\* | Immediate consumption | None\*          |
| **Event-Based** | `bpmn:EventBasedGateway` | Alternative paths   | Immediate consumption | None            |

\*Complex gateways: Shows all possible paths since custom conditions can't be evaluated - actual execution could be exclusive, parallel, inclusive, or custom behavior.

**Implementation**: Gateway-semantic path traversal processes gateways during traversal without creating visible instances. Timing and dependencies are applied directly, with synchronization queueing for parallel/inclusive joins only.

#### Gateway Processing Details

**Core Algorithm**: Gateway-semantic path traversal processes timing during traversal:

```
Next Element Start Time = Current Time + Gateway Duration + Flow Duration
```

**Synchronization Strategy** (Parallel/Inclusive only):

- **Fork**: All outgoing paths start simultaneously
- **Join**: Queue paths until ALL required sources complete, use latest completion time

**Conservative Analysis Approach**:

- **Inclusive**: Show all possible paths with synchronization (conservative since conditions can't be evaluated at design time)
- **Complex**: Show all possible paths without synchronization assumptions (unknown conditions)
- **Exclusive/Event-Based**: Show alternative paths without synchronization

**Example Pattern**:

```
TaskA → Gateway → TaskB, TaskC
Result: Dependencies TaskA→TaskB, TaskA→TaskC (direct, gateway hidden)
```

See table above for specific fork/join behavior per gateway type.

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

### SubProcess Support

**Comprehensive sub-process implementation** with hierarchical traversal, proper parent-child relationships, and multi-level nesting support across all traversal modes.

#### **Supported Types**

- **Expanded SubProcesses**: `bpmn:SubProcess` and `bpmn:AdHocSubProcess` with `flowElements` - fully supported
- **Collapsed SubProcesses**: SubProcesses without child elements - treated as regular tasks
- **Nested SubProcesses**: Multi-level sub-process hierarchies with recursion depth protection (10 levels max)

#### **Core Architecture**

**Hierarchical Scope System**:

- **ProcessScope structure**: Organizes elements into scopes (main process + sub-processes)
- **Scoped traversal**: Each sub-process traversed independently with own visit tracking
- **Instance management**: Shared counter ensures unique instance IDs across all scopes
- **Parent-child relationships**: Maintained through `parentInstanceId` and `scopeInstanceId`

**Visual Representation**:

- **Group elements**: Sub-processes rendered as `type: 'group'` with triangular start/end markers
- **Dashed connecting lines**: Visual connection between sub-process start and end triangles
- **Hierarchy indentation**: Child elements appear indented below parent sub-process
- **Slash pattern constraints**: Child elements show diagonal slashes outside parent duration

#### **Technical Implementation**

**Timing & Bounds Calculation**:

- **Child-driven timing**: Sub-process start = earliest child start, end = latest child completion
- **Dynamic bounds**: `recalculateSubProcessBounds()` updates timing based on child execution
- **Downstream propagation**: Sub-process timing changes automatically adjust downstream elements
- **Inheritance patterns**: Children start when parent starts (`currentTime: pathTime`)

**Instance ID Structure**:

```typescript
// Main sub-process instances
'Activity_1c6bl41_instance_10';

// Child elements of sub-process
'Event_1hx5yna_instance_2_subprocess_Activity_1c6bl41_instance_10';

// Nested sub-process children (multi-level)
'Task_ABC_instance_4_subprocess_Activity_04vzwbt_instance_3_subprocess_Activity_1c6bl41_instance_10';
```

**Parent-Child Relationship Management**:

- **Instance alignment**: Complex fixing logic ensures proper parent-child instance pairing
- **Orphaned children validation**: Automatic detection and relationship repair
- **Hierarchy levels**: Multi-level indentation based on nesting depth
- **Selection behavior**: Recursive selection of all child instances when parent selected

#### **Boundary Event Integration**

**Complete boundary event support** for sub-processes with proper timing, positioning, and dependency handling:

- **Attachment positioning**: Boundary events positioned based on attached sub-process timing
- **Timing calculation**: With duration: `subProcessStart + eventDuration`, without: `subProcessStart + subProcessDuration/2`
- **Loop status inheritance**: Boundary events inherit loop/loop-cut status from attached sub-process
- **Dependency creation**: Automatic task→boundary event dependencies with proper flow types
- **Outgoing flow processing**: Elements reachable through boundary event flows included with proper timing

#### **Mode-Specific Behavior**

**Every Occurrence Mode**:

- **Instance duplication**: Sub-process instances created for each loop iteration with full child duplication
- **Independent timing**: Each child instance calculated relative to its parent sub-process timing
- **Dependency creation**: Full dependency networks between child instances and targets
- **Path integration**: Sub-processes integrated into path-based traversal with proper scoping

**Earliest/Latest Occurrence Modes**:

- **Single instances**: Sub-processes appear once with bounds calculated from child timings
- **Parent-child alignment**: Complex instance selection ensures proper parent-child pairing
- **Timing selection**: Latest/earliest timing selected across all sub-process instances
- **Relationship preservation**: Parent-child relationships maintained for selection and visualization

**Ghost Elements Support**:

- **Limitation**: Ghost elements disabled for sub-processes due to parent-child relationship complexity
- **Alternative**: Use every-occurrence mode for complete sub-process instance visualization
- **Warning display**: User notification when ghost elements requested with sub-processes present

#### **Current Implementation Status**

**✅ Fully Working Features**:

- Hierarchical scope traversal with recursion depth protection (10 levels max)
- Complete boundary event support on sub-processes with proper timing
- Parent-child relationship management with instance alignment fixing
- Multi-level nesting with proper ID chain preservation
- Loop detection and cutoff handling per scope
- Visual constraints (slash patterns) and recursive selection behavior
- All traversal modes (earliest/latest/every occurrence) with mode-specific optimizations

**⚠️ Known Limitations**:

- Ghost elements not supported due to parent-child relationship conflicts
- Complex relationship fixing required for instance ID alignment across modes
- Performance considerations for deeply nested structures (>5 levels)

### Unsupported Elements

**Current Limitations**: These elements are excluded and reported as errors

- Currently, all major BPMN elements are supported

### Informational Artifacts

**Supported Artifacts**: These elements are displayed in the Process Information area but not included in the timeline

- `bpmn:TextAnnotation` - Text annotations and documentation with quoted text content
- `bpmn:DataObject` and `bpmn:DataObjectReference` - Data objects (only unreferenced DataObjects are shown separately)
- `bpmn:DataStore` and `bpmn:DataStoreReference` - Data stores with reference relationships
- `bpmn:Group` - Visual grouping containers
- `proceed:genericResource` / `proceed:GenericResource` - Custom resource definitions with type information

**Smart Filtering**:

- DataObjects referenced by DataObjectReferences are automatically filtered out to avoid duplication
- References show target relationships (e.g., "DataObjectRef → DataObject_123")
- Generic Resources display their resource type (e.g., "Generic Resource - Laptop")

**Display**: Informational artifacts appear in the "Process Artifacts" section with element counts and details

**Artifact Locations**: Searches across multiple BPMN sections:

- `process.flowElements` - Standard flow-level artifacts
- `process.artifacts` - Dedicated artifacts array (Groups, Annotations)
- `process.ioSpecification` - Data inputs/outputs

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

- **Unsupported element types**: None currently - all major BPMN elements are supported
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
enabled: boolean = true

// Algorithm selection (every-occurrence listed first in UI)
positioning-logic: 'every-occurrence' | 'earliest-occurrence' | 'latest-occurrence' = 'earliest-occurrence'

// Loop iteration control (path-based modes)
loop-depth: number = 1

// Element sorting within connected flows
chronological-sorting: boolean = false

// Visual enhancements
show-loop-icons: boolean = true
curved-dependencies: boolean = false
show-ghost-elements: boolean = false
show-ghost-dependencies: boolean = false

// Gateway visibility control
renderGateways: boolean = false
```

### Settings Dependencies

The gantt settings implement a dependency system similar to Process Documentation settings:

#### Main Dependencies

- **`enabled`**: Controls all other gantt settings
  - When disabled, all other settings are disabled and grayed out
  - Affects both modal and main settings views

#### Mode-Specific Dependencies

- **`positioning-logic`**: All settings are available in all modes
  - Loop-related settings (`loop-depth`, `show-loop-icons`) are useful in all modes
  - In earliest/latest modes, loop settings affect ghost elements when enabled
  - In every-occurrence mode, loop settings control path exploration directly

#### Ghost Dependencies

- **`show-ghost-elements`**: Required for ghost dependencies
  - When disabled, `show-ghost-dependencies` is disabled
  - Ghost dependencies only work when ghost elements are enabled

#### Implementation

- Uses shared `createGanttSettingsRenderer()` utility function
- Consistent behavior in both timeline modal and main settings page
- Real-time updates when dependencies change
- Settings remain visible but are disabled (not hidden)

### Ghost Elements

**Ghost elements** provide visualization of alternative occurrences in Earliest and Latest Occurrence modes. When enabled, ghost elements appear as semi-transparent shapes showing where elements could occur at different times.

#### Configuration

```typescript
show-ghost-elements: boolean = false     // Enable/disable ghost elements
show-ghost-dependencies: boolean = false // Enable/disable ghost dependencies
```

#### Visual Behavior

**Earliest Occurrence Mode with Ghosts**:

- **Primary element**: Solid rendering at earliest possible time
- **Ghost elements**: Semi-transparent (75% opacity) at all later occurrence times
- **Dependencies**: Connect to primary occurrences (or ghost occurrences if ghost dependencies enabled)

**Latest Occurrence Mode with Ghosts**:

- **Primary element**: Solid rendering at latest possible time
- **Ghost elements**: Semi-transparent (75% opacity) at all earlier occurrence times
- **Dependencies**: Connect to primary occurrences (or ghost occurrences if ghost dependencies enabled)

#### Rendering Details

**Ghost Elements**:

- **Opacity**: Fixed at 75% for ghost elements
- **Styling**: Fill-only rendering (no borders)
- **Color**: Same as primary element
- **Interaction**: No hover or click interactions on ghosts

**Ghost Dependencies**:

- **Opacity**: Fixed at 75% for ghost dependencies
- **Styling**: Same line style as regular dependencies
- **Connection**: Connect to specific ghost occurrence timing
- **Visibility**: Only shown when `show-ghost-dependencies` is enabled

#### Use Cases

- **Process awareness**: Understand timing flexibility while maintaining timeline clarity
- **Alternative paths**: Visualize how different execution paths affect element timing
- **Decision impact**: See how gateway choices influence element scheduling
- **Optimization**: Identify elements with high timing variability
- **Dependency tracking**: See how alternative timings affect process flow connections
- **Path analysis**: Understand complete alternative execution scenarios including dependencies

#### Example

```
BPMN Process:
Start → Gateway → Task A (2h) → End
            ↓
        Task B (1h) → Task A

Timeline (Earliest + Ghosts + Ghost Dependencies):
- Task A: Primary at 02:00-04:00, Ghost at 01:00-03:00
- Task B: Primary at 00:00-01:00
- Dependencies:
  - Regular: Gateway → Task B
  - Ghost: Task B → Task A (ghost occurrence at 01:00-03:00)
  - Regular: Task A (primary) → End
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
- **Mode descriptions**: Expandable info box with detailed explanations of positioning logic modes
- **Dependency system**: Settings automatically disabled based on dependencies

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
│   ├── scoped-traversal.ts            # Hierarchical scoped traversal algorithm
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

**Unified Scoped Path-Based Architecture**:

- All modes (earliest/every/latest) use hierarchical scoped traversal via `calculateScopedTimings()`
- **Core traversal**: `scoped-traversal.ts` handles path exploration within hierarchical scope structure
- **Mode processing**: `mode-handlers.ts` processes traversal results differently per mode
- Gateway semantics applied during traversal with scope-aware processing
- Sub-processes handled as independent scopes with parent-child relationship preservation

**Hierarchical Scope Processing**:

- **ProcessScope structure**: Organizes elements into main process + nested sub-process scopes
- **Independent traversal**: Each scope explored with own path context and visit tracking
- **Shared instance management**: Global counter ensures unique IDs across all scopes
- **Parent-child preservation**: Complex relationship fixing in mode handlers for proper hierarchy

**Performance Safeguards**:

- Maximum 100 concurrent paths (path explosion prevention)
- Maximum 1000 total path elements
- Configurable loop iteration limits
- Early termination when limits reached

### Current Implementation Status

- **Scoped path-based traversal**: Fully implemented via `calculateScopedTimings()`
- **Hierarchical sub-process support**: Complete with proper parent-child relationships
- **All traversal modes**: Working (earliest/every/latest occurrence) with unified core architecture
- **Gateway-semantic processing**: Complete with scope-aware gateway handling
- **Multi-level nesting**: Supported with recursion depth protection (10 levels max)
- **Complex parent-child alignment**: Implemented in mode handlers for proper instance relationships
- **Boundary event integration**: Complete support on sub-processes with proper timing
- **Gateway visibility control**: Implemented via `renderGateways` parameter
- **Issue detection**: Comprehensive validation with gateway mismatch warnings
- **Ghost elements and dependencies**: Fully implemented (disabled for sub-processes due to complexity)
