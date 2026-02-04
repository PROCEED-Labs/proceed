# BPMN Timeline Component

The BPMN Timeline component transforms BPMN process definitions into Gantt chart visualizations, providing comprehensive support for complex process flows, loops, collaborative structures, and multiple analysis perspectives.

## Overview

This component converts BPMN process data into timeline representations using sophisticated algorithms that handle complex process flows, loops, and branching structures. The component supports three primary modes: **Earliest Occurrence** (default), **Every Occurrence** (path-based), and **Latest Occurrence** (worst-case scenario).

**Core Architecture**: All traversal modes use unified **scoped path-based traversal** with hierarchical sub-process support and mode-specific result processing.

**Primary Implementation**: `transform.ts` → `calculateScopedTimings()` → Mode-specific handlers

## Traversal Modes

### Earliest Occurrence Mode (Default)

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

### Every Occurrence Mode

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

### Latest Occurrence Mode (Worst-Case Scenario)

**Algorithm**: Scoped path-based traversal with latest occurrence selection  
**Implementation**: `transform.ts` → `calculateScopedTimings()` → `handleLatestOccurrenceMode()`

#### Core Principles

- Each element appears exactly **once** in the timeline (like Earliest Occurrence)
- Elements show their **latest possible start time** across all execution paths and scopes
- Uses same scoped exploration as Every Occurrence but mode handler selects latest timing
- Supports hierarchical sub-processes with complex parent-child alignment logic
- Shows **worst-case scenario** for process completion across all scopes

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

**Visual Constraints**:

- **Slash Pattern Background**: Boundary event rows show subtle diagonal slash patterns in areas outside their attached task's duration
- **Constraint Visualization**: Slashes indicate time periods where the boundary event is constrained by its attachment timing
- **Pattern Details**: 45-degree diagonal lines with 12px spacing, clipped at task boundaries with dashed vertical edge lines
- **Purpose**: Provides visual feedback about timing relationships and execution constraints

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

### Sub-Processes → Hierarchical Groups

**Comprehensive sub-process implementation** with hierarchical traversal, proper parent-child relationships, and multi-level nesting support across all traversal modes.

#### Supported Types

- **Expanded SubProcesses**: `bpmn:SubProcess`, `bpmn:AdHocSubProcess`, and `bpmn:Transaction` with `flowElements` - fully supported
- **Collapsed SubProcesses**: SubProcesses without child elements - treated as regular tasks
- **Nested SubProcesses**: Multi-level sub-process hierarchies with recursion depth protection (50 levels max)

#### Core Architecture

**Hierarchical Scope System**:

- **ProcessScope structure**: Organizes elements into scopes (main process + sub-processes)
- **Scoped traversal**: Each sub-process traversed independently with own visit tracking
- **Instance management**: Shared counter ensures unique instance IDs across all scopes
- **Parent-child relationships**: Maintained through `parentInstanceId` and `scopeInstanceId`

**Visual Representation**:

- **Group elements**: Sub-processes rendered as `type: 'group'` with triangular start/end markers
- **Dashed connecting lines**: Visual connection between sub-process start and end triangles
- **Hierarchy indentation**: Child elements appear indented below parent sub-process
- **Constraint visualization**: Advanced diagonal slash pattern system shows timing relationships and constraints

#### Technical Implementation

**Timing & Bounds Calculation**:

- **Child-driven timing**: Sub-process start = earliest child start, end = latest child completion
- **Dynamic bounds**: `recalculateSubProcessBounds()` updates timing based on child execution
- **Downstream propagation**: Sub-process timing changes automatically adjust downstream elements
- **Inheritance patterns**: Children start when parent starts (`currentTime: pathTime`)

**Instance ID Structure**:

```typescript
// Simple instance pattern for all elements
'Activity_1c6bl41_instance_10';
'Event_1hx5yna_instance_15';
'Task_ABC_instance_23';

// Parent-child relationships stored in ProcessInstance structure
interface ProcessInstance {
  elementId: string;
  instanceId: string; // Simple: elementId_instance_N
  scopeId: string; // Scope this instance belongs to
  parentInstanceId?: string; // Direct parent instance ID
  children: ProcessInstance[]; // Child instances array
  // ... other properties
}
```

**Parent-Child Relationship Management**:

- **Instance alignment**: Complex fixing logic ensures proper parent-child instance pairing
- **Orphaned children validation**: Automatic detection and relationship repair
- **Hierarchy levels**: Multi-level indentation based on nesting depth
- **Selection behavior**: Recursive selection of all child instances when parent selected

#### Boundary Event Integration

**Complete boundary event support** for sub-processes with proper timing, positioning, and dependency handling:

- **Attachment positioning**: Boundary events positioned based on attached sub-process timing
- **Timing calculation**: With duration: `subProcessStart + eventDuration`, without: `subProcessStart + subProcessDuration/2`
- **Loop status inheritance**: Boundary events inherit loop/loop-cut status from attached sub-process
- **Dependency creation**: Automatic task→boundary event dependencies with proper flow types
- **Outgoing flow processing**: Elements reachable through boundary event flows included with proper timing

#### Mode-Specific Behavior

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

**Visual Constraints**:

- **Slash Pattern Background**: Sub-process child element rows show subtle diagonal slash patterns in areas outside their parent sub-process duration
- **Hierarchical Constraints**: Slashes indicate time periods where child elements are constrained by their parent sub-process timing
- **Pattern Details**: 45-degree diagonal lines with 12px spacing, clipped at sub-process boundaries with dashed vertical edge lines
- **Multi-level Support**: Nested sub-processes create cascading constraint visualizations for clear hierarchy understanding

### Informational Artifacts → Process Information Display

**Comprehensive artifact processing** with association support to connect artifacts to flow elements, providing rich process documentation.

#### Supported Types

- `bpmn:TextAnnotation` - Text notes and comments
- `bpmn:DataObject` - Data objects
- `bpmn:DataObjectReference` - References to data objects
- `bpmn:DataStore` - Data stores
- `bpmn:DataStoreReference` - References to data stores
- `bpmn:Group` - Element groupings
- `proceed:genericResource` / `proceed:GenericResource` - Generic resources

#### Association Support

**BPMN Association Processing**: The component processes `bpmn:Association` elements to connect artifacts with flow elements, providing context about which tasks, events, or gateways an artifact relates to.

**Association Structure**:

```xml
<textAnnotation id="TextAnnotation_15mcpxa">
  <text>test</text>
</textAnnotation>
<association id="Association_0901qoj"
             associationDirection="None"
             sourceRef="Activity_184c7hr"
             targetRef="TextAnnotation_15mcpxa" />
```

**Visual Display**: Artifacts appear in the Process Information section with association details:

- **Artifact Name/ID**: Primary identification
- **Artifact Type**: Human-readable type (e.g., "Text Annotation", "Data Object")
- **Content**: Text content for annotations, references for data objects/stores
- **Associated Elements**: Lists connected flow elements with names and types

**Example Display**:

```
Process Artifacts (2)
The following informational artifacts were found in the process and are not displayed in the timeline:

• Documentation Note (Text Annotation): "Process validation requirements"
  Associated with: Task A (Task), Quality Gate (ExclusiveGateway)

• Customer Data (Data Store Reference) → CustomerDatabase
  Associated with: Retrieve Customer Info (ServiceTask)
```

#### Processing Algorithm

1. **Artifact Extraction**: Collect artifacts from `process.artifacts` array
2. **Association Discovery**: Process `process.associations` array to find connections
3. **Bidirectional Mapping**: Create artifact ↔ flow element relationships
4. **Enrichment**: Add association metadata to artifact objects
5. **UI Display**: Show artifacts with associated element information

## Collaboration Support: Participants, Lanes & Message Flows

The BPMN Timeline component provides comprehensive support for BPMN collaboration diagrams, including participants (pools), lanes, and message flows between processes.

### Architecture Overview

**Core Implementation**: `collaboration-helpers.ts` + multi-process support throughout the transformation pipeline

**Key Features**:

- Multi-participant process visualization with automatic header generation
- Hierarchical lane organization within participants (unlimited nesting depth)
- Message flow visualization with intelligent routing and spacing
- Sub-process support within lanes and participants
- Automatic participant line length calculation respecting content visibility

### Participants (Pools)

**Definition**: Top-level organizational containers representing different processes or organizations in a collaboration.

#### Implementation Details

**Detection & Processing**:

```typescript
// In parseCollaboration()
const collaboration = definitions.rootElements?.find(
  (element) => element.$type === 'bpmn:Collaboration',
);
```

**Participant Header Generation**:

- **ID Pattern**: `participant-header-${participantId}`
- **Positioning**: Spans entire duration of contained elements
- **Visual**: Light gray background (`#f0f0f0`) with participant name
- **Hierarchy**: Level -1 (above all other elements)
- **Dashed Lines**: Vertical lines spanning only visible content rows

**Child Element Association**:

- All elements from participant's process are annotated with `_participantMetadata`
- Participant headers generated in `createParticipantGroups()`
- Vertical centering calculated across participant and all child elements

#### Participant Line Calculation

**Intelligent Row Counting**:

- **Empty lane headers skipped**: Lane headers with no visible content don't contribute to line length
- **Collapsed sub-process respect**: Only counts visible rows when sub-processes are collapsed
- **Nested hierarchy support**: Properly handles multi-level lane structures
- **Accurate visual representation**: Dashed lines match actual content height

```typescript
// Empty lane headers are automatically excluded
if (isLaneHeader && childIds.length === 0) {
  return 0; // Don't count empty lanes
}
```

### Lanes

**Definition**: Organizational subdivisions within participants representing roles, departments, or responsibilities.

#### Implementation Details

**Parsing & Hierarchy**:

```typescript
// Lane hierarchy extracted from laneSets with unlimited nesting depth
const laneHierarchy = parseLaneHierarchy(process.laneSets);
```

**Lane Header Generation**:

- **ID Pattern**: `lane-header-${laneId}`
- **Properties**: `isLaneHeader: true`, `hierarchyLevel` based on nesting
- **Visual**: Indented based on nesting level with hierarchical colors
- **Scope**: Contains all elements assigned to the lane
- **Empty lane handling**: Headers created for structural lanes even without direct elements

**Lane Duration & Timing Behavior**:

- **No Duration Bars**: Lane headers are organizational containers, not process elements with execution time
- **Dynamic Span**: Lane header spans the complete duration of all contained elements (earliest start to latest end)
- **Auto-calculation**: Lane timing automatically adjusts when contained elements change
- **Visual Representation**: Appears as colored header row without traditional Gantt bar visualization
- **Timing Impact**: Lanes provide organizational structure only - they don't affect process execution timing or dependencies

**Technical Features**:

- **Multi-level nesting**: Support for unlimited lane hierarchy depth
- **Hierarchical colors**: Different colors per nesting level for visual clarity
- **Element annotation**: `_laneMetadata` object with `laneId`, `laneName`, `laneLevel`
- **Metadata preservation**: Pure metadata approach - no execution timing impact
- **Sub-process integration**: Lane elements properly nested within sub-process hierarchies

#### Lane Metadata System

**Metadata Structure**:

```typescript
// Lane metadata attached to elements
element._laneMetadata = {
  laneId: string,
  laneName: string,
  laneLevel: number,
};
```

**Instance Element Inheritance**:

- **Automatic inheritance**: Instance elements (`_instance_` suffix) inherit lane metadata from base elements
- **Proper grouping**: Lane grouping recognizes both new `_laneMetadata` format and legacy `laneId` property
- **Hierarchy preservation**: Sub-process children maintain original parent-child relationships within lanes

### Sub-Process Integration

**Lane + Sub-Process Support**:

- **Flattening process**: Sub-processes flattened before lane metadata annotation (both collaboration and non-collaboration scenarios)
- **Hierarchy preservation**: Sub-process parent-child relationships preserved within lane contexts
- **Metadata inheritance**: Sub-process children inherit lane metadata from parent sub-processes
- **Filtering logic**: Lane headers exclude sub-process children from direct childIds to maintain proper nesting

**Technical Implementation**:

```typescript
// Critical processing order for lane + sub-process integration
const flattenedElements = flattenExpandedSubProcesses(process.flowElements);
const elementsWithLanes = annotateElementsWithLanes(
  flattenedElements,
  laneHierarchy,
);
```

### Message Flows

**Definition**: Communication between participants that doesn't affect process timing but shows information exchange.

#### Transformation Pipeline

**1. Detection & Parsing**:

```typescript
// In parseCollaboration()
const messageFlows = collaboration.messageFlows || [];
```

**2. Dependency Creation**:

```typescript
// In transformMessageFlows()
const messageDependencies = transformMessageFlows(
  messageFlows,
  sortedElements,
  participants,
);
```

**3. Visual Rendering**:

- **Type**: `DependencyType.START_TO_START` with `flowType: 'message'`
- **Visual Style**: Dashed lines (`[8, 4]` pattern) with 80% opacity
- **Direction**: Always points toward target (left-pointing arrows for participant targets)

#### Connection Rules

**Element-to-Element**:

- **Source**: Vertical edge (top/bottom of element based on direction)
- **Target**: Vertical edge (top/bottom of element based on direction)
- **Spacing**: 15px vertical separation for multiple flows on same element
- **Visual**: Small empty circle (3px) at origin, arrow at destination
- **Direct routing**: Vertical connection without horizontal spacing

**Participant Connections**:

- **Participant edges**: Always connect to right edge of participant header
- **Approach direction**: Participant targets approached from right side with 20px spacing
- **Vertical centering**: Connection point at vertical center of participant + all children
- **Clean routing**: Horizontal approach with vertical segments for clean visual flow

#### Routing & Spacing Algorithm

**Multi-Flow Spacing**:

```typescript
// Applied when element has both incoming/outgoing message flows
const hasBothTypes = outgoingCount > 0 && incomingCount > 0;
if (hasBothTypes) {
  outgoingOffset = -FLOW_SPACING / 2; // -7.5px (upward)
  incomingOffset = FLOW_SPACING / 2; // +7.5px (downward)
}
```

**Routing Strategy**:

- **Element-to-Element**: Direct vertical connections at element edges
- **Element-to-Participant**: Vertical-then-horizontal with 20px approach spacing from right
- **Participant-to-Element**: Horizontal-then-vertical with proper edge connections
- **Participant-to-Participant**: Direct horizontal routing with vertical spacing

**Connection Point Calculation**:

- **Element edges**: Uses `getElementConnectionPoint()` for precise edge positioning
- **Participant centering**: Calculates vertical center across participant and all visible children
- **Direction-aware**: Circles appear at source edge, arrows at target edge with correct orientation

#### Visual Elements

**Start Indicators**: 3px empty circles (`#ffffff` fill, colored stroke) positioned at element edges
**End Indicators**: Directional arrowheads pointing toward target
**Line Style**: Dashed pattern (`[8, 4]`) with dependency line color
**Opacity**: 80% to distinguish from sequence flows

### Technical Implementation

#### Key Files & Functions

**Core Processing**:

- `collaboration-helpers.ts`: Main collaboration parsing, message flow transformation, and sub-process flattening
- `transform.ts`: Integration point with proper execution order for lane + sub-process support
- `utils.ts`: Enhanced `groupAndSortElements()` with hierarchical lane processing and filtering logic
- `lane-helpers.ts`: Lane metadata annotation with sub-process parent inheritance

**Rendering**:

- `DependencyRenderer.ts`: Message flow routing, spacing, visual rendering, and connection point calculation
- `ElementRenderer.ts`: Participant dashed lines with intelligent row counting
- `GanttChartCanvas.tsx`: Enhanced dependency type display ("Message Flow")

#### Processing Order

**Critical Sequence**:

```typescript
// 1. Flatten sub-processes BEFORE lane annotation (both collaboration and single process)
const flattenedElements = flattenExpandedSubProcesses(process.flowElements);
const elementsWithLanes = annotateElementsWithLanes(
  flattenedElements,
  laneHierarchy,
);

// 2. Mode handling with lane metadata inheritance for instance elements
modeResult.ganttElements.forEach((ganttElement) => {
  if (ganttElement.id.includes('_instance_')) {
    // Inherit lane metadata from base element
  }
});

// 3. Group elements (creates participant/lane headers with proper filtering)
const sortedElements = groupAndSortElements(/*...*/);

// 4. Transform message flows (requires headers to exist)
const messageDependencies = transformMessageFlows(/*...*/);

// 5. Combine dependencies
const allDependencies = [...regularDeps, ...messageDependencies];
```

#### Integration Points

**Data Flow**:

1. **BPMN Parsing**: Extract collaboration, participants, lanes, message flows
2. **Sub-Process Flattening**: Flatten sub-processes before metadata annotation
3. **Lane Annotation**: Add lane metadata to all elements including sub-process children
4. **Instance Inheritance**: Instance elements inherit lane metadata from base elements
5. **Header Generation**: Create participant/lane headers with intelligent child filtering
6. **Message Flow Transformation**: Convert to visual dependencies with proper routing
7. **Rendering**: Apply spacing, routing, visual styling, and participant line calculation

**Error Handling**:

- **Missing participants**: Graceful fallback to element-level connections
- **Invalid message flows**: Filtered out during transformation
- **Empty lanes**: Handled gracefully without affecting participant line calculations
- **Sub-process conflicts**: Proper hierarchy preservation prevents conflicts

## Structural Path Interpretation and Validation

### Current Approach: Structural Path Analysis

The BPMN timeline component implements **structural path analysis** rather than strict BPMN token flow semantics. This design choice provides valuable insights for process modeling and analysis while handling invalid or incomplete BPMN patterns gracefully.

#### Key Characteristics

**Path-Based Element Creation**:

- **Multiple instances**: Elements can appear multiple times if reached via different paths
- **Structural exploration**: Shows all possible execution routes through the process
- **Instance identification**: Each path-based occurrence gets a unique instance ID
- **Timing calculation**: Based on path arrival times and element durations

**Gateway Semantic Processing**:

- **No gateway instances**: Gateways are processed semantically during traversal
- **Direct dependencies**: Create source→target connections skipping gateway instances
- **Timing integration**: Gateway and flow durations combined in path timing
- **Synchronization logic**: Parallel joins queue paths until all required sources arrive

#### Example: Same Element, Multiple Paths

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

### Comparison with BPMN Token Flow Semantics

#### BPMN Token Flow (Specification-Compliant)

```
Token Behavior:
- Single element instances receive multiple tokens
- Parallel joins synchronize tokens before proceeding
- Result: S, T1, T2 (single instance), E (single instance)
- T2 processes both tokens sequentially or in parallel
- G2 waits for both tokens from T2 before creating single E token
```

#### Structural Path Analysis (Current Implementation)

```
Path Behavior:
- Elements create instances for each execution path
- Paths are tracked independently through the process
- Result: S, T1, T2 (inst1), T2 (inst2), E (inst1), E (inst2)
- Each T2 instance follows its own execution path
- G2 doesn't synchronize T2 instances (same element, different paths)
```

### Validation and Structural Warnings

The component includes validation logic to detect potentially problematic BPMN patterns while still generating useful timeline visualizations.

#### Gateway Mismatch Detection

Identifies patterns that would cause deadlocks in real BPMN execution:

```typescript
// Example: Exclusive Gateway → Parallel Join
S → G1(EXCLUSIVE) → T1 → G2(PARALLEL) → E
    G1            → T2 → G2

Warning: "Potential deadlock detected: Parallel join gateway 'G2' receives flows
from exclusive gateway 'G1'. In real BPMN execution, this could cause the parallel
join to wait indefinitely for flows that may never arrive."
```

#### Structural Issue Types

- **Deadlock patterns**: Exclusive→parallel join combinations
- **Gateway chains**: Complex gateway-to-gateway connections
- **Asymmetric flows**: Parallel branches with different convergence points
- **Loop complexities**: Gateway interactions within loop structures

### Why Structural Path Analysis is Sufficient

#### Benefits for Process Modeling

1. **Design-Time Analysis**: Shows all possible process paths during modeling
2. **Incomplete Pattern Handling**: Works with invalid or incomplete BPMN patterns
3. **Visual Process Understanding**: Helps identify potential process issues
4. **Structural Insight**: Reveals process complexity and flow patterns
5. **Educational Value**: Shows the difference between structure and execution

#### Use Cases Where This Approach Excels

- **Process design and review**: Understanding all possible execution scenarios
- **Process optimization**: Identifying redundant or problematic paths
- **Compliance analysis**: Verifying that all required paths are present
- **Training and documentation**: Showing process structure and complexity
- **Risk assessment**: Understanding worst-case execution scenarios

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
- **Sub-process awareness**: Offset colors distinguish sub-process elements from main process
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

### Interactive Collapsible Groups

The timeline provides interactive collapse/expand functionality for hierarchical elements, allowing users to manage visual complexity and focus on relevant parts of the process.

#### Supported Collapsible Elements

**Sub-Processes**:

- **Expanded Sub-Processes**: Can be collapsed to hide all child elements
- **Visual Indicators**: Triangular markers (▼ expanded, ▶ collapsed) in task list
- **Hierarchy Preservation**: Child elements maintain proper indentation and relationships when expanded

**Lanes**:

- **Lane Headers**: Can be collapsed to hide all lane contents
- **Nested Lanes**: Support for multi-level lane hierarchy collapse/expand
- **Organizational Focus**: Collapse unrelated lanes to focus on specific roles or departments

**Participants**:

- **Participant Headers**: Can be collapsed to hide entire participant content
- **Cross-Participant Workflows**: Collapse individual participants while maintaining message flow visibility

#### Interactive Controls

**Task List Integration**:

- **Clickable Icons**: Triangle icons (▼/▶) next to collapsible elements in the task list
- **Immediate Response**: Click to toggle expand/collapse state instantly
- **Visual Feedback**: Icons update immediately to reflect current state

**Collapse Behavior**:

- **Children Hiding**: All child elements become hidden when parent is collapsed
- **Dependency Preservation**: Dependencies to/from collapsed elements remain visible as connection points
- **Collapsed Indicators**: Subtle visual indicators show collapsed sections in the timeline area

#### Technical Implementation

**State Management**:

```typescript
// Collapsed sub-processes tracked via state
const [collapsedSubProcesses, setCollapsedSubProcesses] = useState<Set<string>>(
  new Set(),
);

// Toggle function for interactive control
const toggleSubProcessCollapse = useCallback((subProcessId: string) => {
  setCollapsedSubProcesses((prev) => {
    const newSet = new Set(prev);
    if (newSet.has(subProcessId)) {
      newSet.delete(subProcessId);
    } else {
      newSet.add(subProcessId);
    }
    return newSet;
  });
}, []);
```

**Visual Rendering**:

- **Element Filtering**: Collapsed elements are filtered from the visible element list
- **Participant Line Adjustment**: Dashed participant lines automatically adjust to visible content only
- **Dependency Routing**: Dependencies route to collapsed group boundaries when children are hidden
- **Slash Pattern Respect**: Constraint visualization respects collapsed state boundaries

#### Use Cases

**Process Exploration**:

- **Overview First**: Start with collapsed sub-processes to see high-level process flow
- **Drill Down**: Expand specific sub-processes to examine detailed implementation
- **Focus Mode**: Collapse unrelated sections to focus on problematic areas

**Collaboration Review**:

- **Role Focus**: Collapse other lanes to focus on specific role responsibilities
- **Participant Analysis**: Collapse other participants to analyze single organization workflows
- **Message Flow Tracing**: Collapse detailed implementation while keeping message flows visible

**Performance Optimization**:

- **Large Process Handling**: Collapse sections to improve rendering performance in complex processes
- **Memory Efficiency**: Hidden elements consume less rendering resources
- **Scroll Optimization**: Reduced visible elements improve scroll performance

#### Visual Design

**Collapse Indicators**:

- **Standard Icons**: Universal ▼ (expanded) and ▶ (collapsed) triangular indicators
- **Consistent Placement**: Always positioned to the left of element names in task list
- **Interactive Feedback**: Icons respond to hover states for clear interactivity indication

**Collapsed State Visualization**:

- **Subtle Background**: Light gray background indicates collapsed sections in timeline area
- **Boundary Markers**: Clear visual boundaries show where collapsed content would appear
- **Connection Points**: Dependencies still connect to collapsed group boundaries

This interactive collapse/expand system enables efficient navigation and analysis of complex BPMN processes while maintaining full process context and relationships.

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

### Core Settings

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

## Data Integration

### BPMN Access

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
├── gantt-settings-utils.tsx           # Settings rendering utilities
├── README.md                          # This documentation
├── test-cases.md                      # Comprehensive test cases
├── constants/                         # Shared constants
│   └── index.ts                       # Constants (durations, limits, colors)
├── core/                              # Core transformation logic
│   ├── transform.ts                   # Transformation orchestration
│   ├── transform-helpers.ts           # Validation and utility functions
│   ├── scoped-traversal.ts            # Hierarchical scoped traversal algorithm
│   ├── synchronization.ts             # Gateway synchronization logic
│   └── process-model.ts               # Hierarchical process scope model
├── transformers/                      # Element-specific transformers
│   ├── element-transformers.ts        # Element transformation functions
│   └── mode-handlers.ts               # Mode-specific result processing
├── types/                             # TypeScript definitions
│   └── types.ts                       # All interface definitions
├── utils/                             # Utilities and helpers
│   ├── utils.ts                       # Helper functions and utilities
│   ├── collaboration-helpers.ts       # Participant, lane, message flow support
│   ├── lane-helpers.ts                # Lane metadata annotation system
│   ├── boundary-dependencies.ts       # Boundary event dependency creation
│   ├── duration-helpers.ts            # Duration parsing and extraction
│   ├── element-maps.ts                # Element mapping utilities
│   ├── element-processing.ts          # Element processing pipeline
│   ├── element-transformer-factory.ts # Element transformer factory
│   ├── id-helpers.ts                  # Instance ID parsing utilities
│   ├── iterator-patterns.ts           # Sub-process iteration patterns
│   ├── loop-helpers.ts                # Loop status management
│   ├── mode-initialization.ts         # Mode handler initialization
│   └── reference-extractor.ts         # BPMN reference extraction
└── styles/                            # Component styling
    └── BPMNTimeline.module.scss       # CSS modules for styling
```

### Core Processing Pipeline

```typescript
// 1. Parse BPMN structure (collaboration-aware)
const { process, participants, messageFlows } = validateAndExtractProcess(definitions);

// 2. Flatten sub-processes and annotate with lane metadata
const flattenedElements = flattenExpandedSubProcesses(process.flowElements);
const elementsWithLanes = annotateElementsWithLanes(flattenedElements, laneHierarchy);

// 3. Scoped path-based traversal
const { timingsMap, dependencies, flattenedElements } =
  calculateScopedTimings(supportedElements, startTime, defaultDurations, loopDepth);

// 4. Mode-specific processing
const modeResult = handleTraversalMode(traversalMode, timingsMap, dependencies, ...);

// 5. Lane metadata inheritance for instance elements
modeResult.ganttElements.forEach(ganttElement => {
  if (ganttElement.id.includes('_instance_')) {
    // Inherit lane metadata from base element
  }
});

// 6. Element grouping and sorting (creates participant/lane headers)
const sortedElements = groupAndSortElements(modeResult.ganttElements, ...);

// 7. Message flow transformation
const messageDependencies = transformMessageFlows(messageFlows, sortedElements, participants);

// 8. Final assembly
return { elements: sortedElements, dependencies: [...regularDeps, ...messageDependencies] };
```

### Key Design Decisions

**Unified Scoped Architecture**: All modes use same core traversal with different result processing for consistency and maintainability.

**Structural Path Analysis**: Chosen over token flow semantics for design-time utility, invalid pattern handling, and visual clarity.

**Metadata Preservation**: Pure metadata approach for lanes/participants ensures no execution timing impact while enabling organizational visualization.

**Gateway Semantic Processing**: Processing during traversal rather than post-processing provides better performance and cleaner dependency creation.

**Hierarchical Sub-Process Support**: Independent scope processing with shared instance management balances complexity with proper parent-child relationships.

This implementation provides comprehensive BPMN timeline visualization with advanced collaboration support, maintaining clean architecture and robust error handling across all complexity levels.
