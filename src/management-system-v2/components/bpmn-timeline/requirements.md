# Implementation details for bpmn-timeline component

## General purpose description

The bpmn-timeline component is used by the process view of the management-system-v2 to visually render BPMN processes as a gantt-chart. The component receives the entire process data and interprets it into a useable format for the gantt-chart-canvas component. This interpretation follows specific rules.

## Current Implementation Status ✅

**COMPLETED FEATURES:**
- ✅ Full component restructure with clean separation of concerns (`index.tsx`, `transform.ts`, `types.ts`, `utils.ts`)
- ✅ Tasks (all types) transformation to Gantt tasks
- ✅ Events (excluding BoundaryEvents) transformation to Gantt milestones
- ✅ SequenceFlows transformation to Gantt dependencies
- ✅ First Possible Occurrence algorithm for timeline calculation
- ✅ Connected component analysis for color grouping
- ✅ Error handling and reporting system
- ✅ Integration with GanttChartCanvas component
- ✅ Status header with element processing statistics
- ✅ Expandable error display panel
- ✅ Close button functionality via timeline view store
- ✅ Current date marker line at transformation time
- ✅ ISO 8601 duration parsing
- ✅ Loop characteristics detection for tasks
- ✅ Event definitions detection for events
- ✅ Proper element ordering and row assignment

## Interpretation rules

### General approach

Because BPMN does not have native support for data in the temporal dimension, but gantt-charts main element is a timeline on which the elements are ordered, the interpretation needs to solve this. The current working system extends the BPMN model to provide a duration attribute for all elements. This information, together with the flow-elements connecting other elements, has to be used to determine the start- and end-times of the elements for the gantt-chart. The final goal is to interpret all possible BPMN elements into representations for the gantt-chart and handle elements which cannot be interpreted.

### Element Handling Strategy

- **Supported Elements**: Tasks (all types), Events (excluding BoundaryEvents), and SequenceFlows
- **Unsupported Elements**: Gateways, SubProcesses, BoundaryEvents (to be implemented later)
- **Error Handling**: Elements that cannot be interpreted should be excluded from the chart and logged in an error report

### Task (atomic activity)

BPMN tasks should be interpreted to gantt tasks with name and id. The extraInfo should contain a string which represents the specific type of the element, as well as additional info such as loopCharacteristics in the format "<ManualTask> [Parallel-Multi-Instance / Sequential-Multi-Instance / Loop]" or "<Task>" / "<ManualTask>" if no loop characteristic is present. If there is no previous element which leads to this task, its start-date should be the time on which the interpretation happens (now). Its end-time is either determined by its extensionElement "proceed:timePlannedDuration" which contains a duration / period in iso 8601 or a default duration which should be 1 hour for a task.

### SequenceFlow

SequenceFlows should be interpreted into gantt dependencies which connect the regarding elements. A SequenceFlow can also have a duration and should delay the start-time of the next element by its duration. its default duration is 0.

### Events (excluding BoundaryEvents)

Events should be interpreted to gantt milestones. All event types except BoundaryEvents are supported:

- StartEvent
- EndEvent
- IntermediateThrowEvent
- IntermediateCatchEvent

**Duration handling**: Events can have a duration (from extensionElements) with a default of 0ms. For the initial implementation, use **Option A** where events are positioned at the end of their duration (milestone appears when event completes).

**Milestone Interpretation**:

- Events with 0 duration: Interpret to milestone with only `start` property (diamond appears at event completion time)
- Events with duration > 0: Interpret to milestone with only `start` property set to the event completion time (start time + duration)
- Future extension (Option B): Use both `start` and `end` properties to show the event's time range with centered milestone

**Event Display**: The extraInfo column should contain:

- Event definition type in pointy brackets: `<Message>`, `<Timer>`, `<Signal>`, `<Error>`, `<Escalation>`, `<Cancel>`, `<Compensation>`, `<Conditional>`, `<Link>`, `<Terminate>`, or `<None>` if no event definition
- Event kind in square brackets: `[Start]`, `[End]`, `[Intermediate-Throw]`, or `[Intermediate-Catch]`
- Combined format example: `<Message>[Start]` or `<Timer>[Intermediate-Catch]`

### Time-Dependencies

The flows between elements have to be regarded so that the start-time for elements which follow other elements are correctly assigned to start when the previous element ends / finishes. This means that there has to be some kind of algorithm that iterates through the BPMN elements and flows and assigns their actual start-times based on the start-time of the first element (now), the durations of all previous elements and the connecting flows between elements. There are maybe different approaches, for now, we implement a "first possible occurrence" solution, which determines the earliest logical occurrence of an element.

### First Possible Occurrence Algorithm

1. **Initialization**:

   - Start with all elements (tasks and events) that have no incoming flows (or incoming flows from unsupported elements)
   - Set their start time to "now"
   - For tasks: Calculate their end time based on duration
   - For events: Calculate completion time based on duration (using Option A approach)

2. **Propagation**:

   - For each completed element (task or event), find all outgoing sequence flows
   - For each sequence flow:
     - Calculate target element start time = source element completion time + flow duration
     - **Early Occurrence Check**: If target element was already scheduled, check if this new flow enables an earlier occurrence and use it as the new start date
     - This means only ONE flow needs to occur for the element to occur (earliest possibility)
   - Mark elements as scheduled once at least one incoming flow has been processed

3. **Multiple Incoming Flows**:

   - When an element has multiple incoming sequence flows, it starts as soon as the FIRST (earliest) incoming flow completes
   - The element's start time is the minimum of all possible incoming flow completion times
   - **Flow Duration Impact**: Include the optional duration of flows which delay the occurrence of the next element

4. **Event Timing Specifics**:
   - Event completion time = start time + duration (milestone appears at event completion time)
   - Events with 0 duration complete immediately at their start time
   - **Current Implementation**: Uses Option A - milestones positioned at completion time

### Default Durations

- **Tasks**: 1 hour (3600000 ms) if no duration specified
- **Events**: 0 ms if no duration specified
- **SequenceFlows**: 0 ms if no duration specified
- **Other elements**: Not supported in current implementation

### Visual Organization and Color Assignment

**Flow-Based Color Grouping**:

- All elements connected via sequence flows should be assigned the same color
- Each disconnected flow chain (connected component) gets a unique color
- Color assignment should be deterministic and consistent across transformations
- Use a predefined palette of distinct colors for better visual separation

**Element Ordering and Grouping**:

- Elements should be grouped by their connected flow chains (connected components)
- Within each group, elements should be sorted by their start date (earliest first)
- Groups themselves should be ordered by the earliest start date within each group
- This creates a visual hierarchy where related elements are grouped together and displayed in chronological order

**Color Palette**:

- Use a predefined set of distinct, accessible colors
- Colors should have sufficient contrast for readability
- Recommended palette: blue (#3b82f6), green (#10b981), purple (#8b5cf6), orange (#f97316), red (#ef4444), cyan (#06b6d4), yellow (#eab308), pink (#ec4899)
- Cycle through colors if more connected components exist than available colors

### Time Representation

- All times internally stored as milliseconds (Unix timestamps)
- Start time is always Date.now() for the initial transformation
- Future extension point: accept a configurable start time parameter

### Error Reporting and Status Display

**Status Header Area**:
The component should display a header area showing:

- Total number of elements in the process
- Number of elements successfully interpreted
- Success rate percentage (e.g., "15/20 elements processed successfully")

**Error Display**:
If errors occur during interpretation:

- Show error indicator in the header (e.g., "5 errors occurred")
- Provide an expandable area below the header to show detailed error logs
- Error details should include:
  - Element ID
  - Element Type
  - Element Name (if available)
  - Reason for interpretation failure (e.g., "Gateways not yet supported", "Missing required connections")

**UI Implementation**:

- Use collapsible/expandable UI pattern (e.g., Ant Design Collapse component)
- Error section should be clearly visible but not obstruct the main timeline view
- Consider using warning/error styling to indicate issues without being overly prominent

**Header Controls**:

- Include a close button in the header area to allow users to close/hide the BPMN timeline view
- The close button should call a `disableTimelineView` function provided via props
- Position the close button prominently in the header (typically top-right corner)
- Use appropriate icon (e.g., X or close icon) with accessible labeling

### Data Access

The BPMN process data should be accessed using `bpmnjsModeler.getDefinitions()` which returns a structure similar to ./bpmn-data.json. The example file demonstrates the general structure but doesn't show all possible BPMN elements or attributes. Key properties to expect:

- `rootElements[0].flowElements`: Array containing all process elements
- Each element has `$type`, `id`, `name` (optional)
- Tasks and Events may have `incoming` and `outgoing` arrays with flow IDs
- Tasks and Events have optional `extensionElements.values[0].$children` containing proceed-specific extensions like duration
- Tasks have optional `loopCharacteristics` with type information
- Events have optional `eventDefinitions` array containing event type information
- SequenceFlows have `sourceRef` and `targetRef` instead of `incoming`/`outgoing`

Note: The actual BPMN data may include additional task types (UserTask, ServiceTask, etc.), event types, and attributes not shown in the example. The implementation should handle these gracefully.

## Integration with Management System

### Timeline View State Management

The BPMN timeline component is integrated into the process modeler view as an optional overlay/panel that can be toggled on and off:

**State Management**:

- Timeline visibility is controlled by a boolean state (e.g., `timelineViewEnabled`) in the parent modeler component
- State should be managed at the modeler level using existing state management patterns (likely Zustand store)
- The timeline view state should persist during the user's session but reset between process switches

**Component Props Interface**:

```typescript
interface BpmnTimelineProps {
  bpmnjsModeler: any; // The bpmn-js modeler instance
  disableTimelineView: () => void; // Callback to close the timeline
  visible?: boolean; // Optional visibility control
}
```

**Integration Points**:

- **Modeler Toolbar**: Add a timeline toggle button in the modeler toolbar (similar to existing view controls)
- **Process Data Access**: Timeline component receives the bpmn-js modeler instance and calls `getDefinitions()` internally
- **Layout Considerations**: Timeline should overlay or split-view with the existing modeler without disrupting the main workflow
- **Responsive Design**: Timeline should adapt to different screen sizes and potentially collapse on mobile devices

**User Experience Flow**:

1. User opens a process in the modeler
2. User clicks timeline toggle button in toolbar
3. Timeline panel/overlay appears with status header and gantt chart
4. User can interact with timeline or close it using the header close button
5. Timeline state persists until user navigates away or explicitly toggles it off

### Data Flow Architecture

**Unidirectional Data Flow**:

- Parent modeler component manages timeline visibility state
- Timeline component receives modeler instance as prop
- Timeline component internally handles BPMN data interpretation
- Timeline component calls `disableTimelineView` callback to request closure
- Parent component updates visibility state in response

**Error Boundaries**:

- Timeline component should handle its own errors gracefully
- Failed timeline rendering should not break the main modeler functionality
- Error states should be contained within the timeline component

## Implementation process ✅ COMPLETED

The interpretation logic has been implemented with well-structured and encapsulated code with distinct responsibilities. The component receives BPMN data, performs interpretation, and renders the gantt-chart.

### Code Structure ✅ COMPLETED

The component has been completely rewritten with a clean, modular structure:

**✅ CURRENT STRUCTURE: Simple Folder Structure (Option 2)**

```
components/bpmn-timeline/
├── index.tsx           # Main component and UI ✅
├── transform.ts        # All interpretation logic ✅
├── types.ts           # All type definitions ✅
├── utils.ts           # Utility functions ✅
└── requirements.md     # This documentation ✅
```

**✅ IMPLEMENTED SECTIONS:**

1. **Type Definitions** (`types.ts`): BPMN element interfaces, interpretation state, error reports ✅
2. **Interpretation Logic** (`transform.ts`): Duration parsing, element extraction, time calculation, BPMN-to-Gantt conversion ✅
3. **Utility Functions** (`utils.ts`): Helper functions for duration parsing, element detection, color assignment ✅
4. **Component Logic** (`index.tsx`): Error handling, basic configuration ✅
5. **UI Rendering** (`index.tsx`): GanttChartCanvas integration, error display ✅

### GanttChartCanvas Integration ✅ COMPLETED

The bpmn-timeline component successfully uses the existing `GanttChartCanvas` component for rendering:

**✅ CURRENT IMPLEMENTATION:**

```tsx
import { GanttChartCanvas } from '@/components/gantt-chart-canvas';

// Transform BPMN data to gantt format ✅
const transformationResult = transformBPMNToGantt(definitions, transformationTimestamp);

// Render with appropriate options ✅
<GanttChartCanvas
  elements={transformationResult.elements}
  dependencies={transformationResult.dependencies}
  currentDateMarkerTime={nowTimestamp}
  width="100%"
  height="600px"
/>
```

**✅ DATA FORMAT IMPLEMENTATION:**

- ✅ BPMN Tasks → `GanttTask` with `type: 'task'`, `start`, `end`, `name`, and `extraInfo` properties
- ✅ BPMN Events → `GanttMilestone` with `type: 'milestone'`, `start` property (and `end` for events with duration)
- ✅ BPMN SequenceFlows → `GanttDependency` array with `sourceId`, `targetId`, and `id` properties
- ✅ Proper `name` and `extraInfo` properties according to gantt-chart-canvas types
- ✅ All timestamps are in milliseconds (Unix format)

### TypeScript Interfaces ✅ COMPLETED

**✅ IMPLEMENTED** in `types.ts` based on actual BPMN process data structure as returned by bpmn-js:

Note: The interfaces have been implemented based on the actual data structure we receive from `bpmnjsModeler.getDefinitions()`.

```typescript
// Base types for all BPMN elements
interface BPMNBaseElement {
  $type: string;
  id: string;
  name?: string;
  documentation?: Array<{ $type: string; text?: string }>;
  extensionElements?: BPMNExtensionElements;
}

interface BPMNExtensionElements {
  $type: 'bpmn:ExtensionElements';
  values: Array<{
    $type: string;
    $children?: Array<{
      $type: string;
      name?: string;
      $body?: string;
    }>;
  }>;
}

// Main structure
interface BPMNDefinitions {
  $type: 'bpmn:Definitions';
  id: string;
  name?: string;
  rootElements: BPMNProcess[];
  diagrams?: any[]; // Not needed for timeline transformation
}

interface BPMNProcess {
  $type: 'bpmn:Process';
  id: string;
  name?: string;
  isExecutable?: boolean;
  flowElements: BPMNFlowElement[];
  extensionElements?: BPMNExtensionElements;
}

// Flow elements union type
type BPMNFlowElement =
  | BPMNTask
  | BPMNSequenceFlow
  | BPMNEvent
  | BPMNGateway
  | BPMNSubProcess;

// Task types - based on bpmn.json metamodel, all task types inherit from Task
interface BPMNTask extends BPMNBaseElement {
  $type:
    | 'bpmn:Task'
    | 'bpmn:ManualTask'
    | 'bpmn:UserTask'
    | 'bpmn:ServiceTask'
    | 'bpmn:ScriptTask'
    | 'bpmn:BusinessRuleTask'
    | 'bpmn:SendTask'
    | 'bpmn:ReceiveTask'
    | 'bpmn:CallActivity'; // CallActivity also behaves like a task
  incoming?: string[]; // Array of SequenceFlow IDs
  outgoing?: string[]; // Array of SequenceFlow IDs
  loopCharacteristics?: {
    $type:
      | 'bpmn:StandardLoopCharacteristics'
      | 'bpmn:MultiInstanceLoopCharacteristics';
    isSequential?: boolean;
    // Additional properties exist but not needed for current implementation
  };
}

// Sequence Flow
interface BPMNSequenceFlow extends BPMNBaseElement {
  $type: 'bpmn:SequenceFlow';
  sourceRef: string;
  targetRef: string;
  conditionExpression?: any;
}

// Events - now supported (excluding BoundaryEvents)
interface BPMNEvent extends BPMNBaseElement {
  $type:
    | 'bpmn:StartEvent'
    | 'bpmn:EndEvent'
    | 'bpmn:IntermediateThrowEvent'
    | 'bpmn:IntermediateCatchEvent'
    | 'bpmn:BoundaryEvent';
  incoming?: string[]; // Array of SequenceFlow IDs
  outgoing?: string[]; // Array of SequenceFlow IDs
  eventDefinitions?: Array<{
    $type:
      | 'bpmn:MessageEventDefinition'
      | 'bpmn:TimerEventDefinition'
      | 'bpmn:SignalEventDefinition'
      | 'bpmn:ErrorEventDefinition'
      | 'bpmn:EscalationEventDefinition'
      | 'bpmn:CancelEventDefinition'
      | 'bpmn:CompensateEventDefinition'
      | 'bpmn:ConditionalEventDefinition'
      | 'bpmn:LinkEventDefinition'
      | 'bpmn:TerminateEventDefinition';
    // Additional properties per event type exist but not needed for current implementation
  }>;
}

// Gateways (for future implementation)
interface BPMNGateway extends BPMNBaseElement {
  $type:
    | 'bpmn:ExclusiveGateway'
    | 'bpmn:InclusiveGateway'
    | 'bpmn:ParallelGateway'
    | 'bpmn:ComplexGateway'
    | 'bpmn:EventBasedGateway';
  incoming?: string[];
  outgoing?: string[];
}

// SubProcess (for future implementation)
interface BPMNSubProcess extends BPMNBaseElement {
  $type: 'bpmn:SubProcess' | 'bpmn:AdHocSubProcess';
  incoming?: string[];
  outgoing?: string[];
  flowElements: BPMNFlowElement[];
}
```

### Example Interpretation

Given a BPMN process with:

- StartEvent (no incoming, duration: 0)
- Task A (incoming from StartEvent, duration: 2 hours)
- Task B (incoming from A, duration: 1 hour)
- Task C (incoming from A, duration: 30 minutes)
- IntermediateThrowEvent (incoming from C, duration: 15 minutes, type: Message)
- Task D (incoming from B and IntermediateThrowEvent, duration: 1 hour)
- EndEvent (incoming from D, duration: 0)

Timeline calculation:

- StartEvent: milestone at `now`
- Task A: starts at `now`, ends at `now + 2h`
- Task B: starts at `now + 2h`, ends at `now + 3h`
- Task C: starts at `now + 2h`, ends at `now + 2.5h`
- IntermediateThrowEvent: starts at `now + 2.5h`, milestone at `now + 2.75h`
- Task D: starts at `max(now + 3h, now + 2.75h) = now + 3h`, ends at `now + 4h`
- EndEvent: milestone at `now + 4h`

ExtraInfo display:

- StartEvent: `<None>[Start]`
- IntermediateThrowEvent: `<Message>[Intermediate-Throw]`
- EndEvent: `<None>[End]`

### Incremental development ✅ FOUNDATION COMPLETED

The current implementation includes Tasks, Events (excluding BoundaryEvents), and SequenceFlows. The code has been structured so that handling for gateways, boundary events, and other elements can be implemented later on.

**✅ Connected Component Analysis IMPLEMENTED**:

- ✅ Graph traversal algorithm to identify connected components in the BPMN flow
- ✅ Each connected component represents a flow chain that shares the same color
- ✅ Isolated elements (no connections) handled as single-element components
- ✅ Weakly connected component analysis implemented in `utils.ts`

### BPMN Data ✅ IMPLEMENTED

The component successfully receives BPMN process data using `bpmnjsModeler.getDefinitions()` which returns data in the format demonstrated in ./bpmn-data.json. The implementation correctly handles this data structure.

### Key Insights from BPMN Metamodel (bpmn.json)

From analyzing the complete metamodel, we can see:

1. **Inheritance Hierarchy**:

   - All flow elements inherit from `FlowElement` which has `name` and `id`
   - All tasks inherit from `Task`, which inherits from `Activity`
   - All events inherit from `Event`, which inherits from `FlowNode`
   - `FlowNode` elements (Tasks, Events, Gateways) have `incoming` and `outgoing` properties
   - `SequenceFlow` has `sourceRef` and `targetRef` instead

2. **Task Types**: The metamodel confirms these task types:

   - Task (generic)
   - ManualTask
   - UserTask
   - ServiceTask
   - ScriptTask
   - BusinessRuleTask
   - SendTask
   - ReceiveTask
   - CallActivity (behaves like a task but calls another process)

3. **Event Types**: The metamodel defines these event types:

   - StartEvent, EndEvent, IntermediateThrowEvent, IntermediateCatchEvent, BoundaryEvent
   - Events can have eventDefinitions (Message, Timer, Signal, Error, etc.)
   - StartEvent and EndEvent have no incoming/outgoing respectively by design
   - IntermediateEvents typically have both incoming and outgoing

4. **Extensibility**:

   - `BaseElement` includes `extensionElements` property for custom extensions
   - This is where PROCEED-specific properties like `timePlannedDuration` are stored

5. **Important Properties**:
   - Tasks can have `loopCharacteristics` (StandardLoop or MultiInstance)
   - MultiInstance loops have `isSequential` property
   - Events can have `eventDefinitions` array for typing
   - All elements can have `documentation` array

## Future Extensions

The following features are planned for future implementation:

### User Control Panel ⏳ PLANNED

- Allow users to choose between event display options:
  - **Option A**: Events positioned at the end of their duration ✅ (current implementation)
  - **Option B**: Display the range in which the event can occur with milestone centered (using start/end properties) ⏳
- Configuration controls for other visualization preferences ⏳
- Performance analysis integration ⏳

### Additional BPMN Elements ⏳ PLANNED

- Support for Gateways (all types) ⏳
  - ExclusiveGateway, InclusiveGateway, ParallelGateway, ComplexGateway, EventBasedGateway
- Support for SubProcesses ⏳
- Support for BoundaryEvents ⏳
- Configurable start time parameter (instead of always using Date.now()) ⏳

### Enhancement Opportunities ⏳ POTENTIAL

- **Performance Optimization**: Large process model handling
- **UI Enhancements**: Better error visualization, collapsible groups
- **Integration Features**: Export timeline as image/PDF, share links
- **Advanced Time Features**: Time zones, working hours consideration
- **Process Analysis**: Critical path identification, bottleneck detection

---

## Current Implementation Summary ✅

### What Works Today

The bpmn-timeline component is **fully functional** and ready for production use with the following capabilities:

1. **Complete BPMN Element Support** (for supported types):
   - ✅ All Task types (Task, ManualTask, UserTask, ServiceTask, etc.)
   - ✅ All Events except BoundaryEvents (StartEvent, EndEvent, IntermediateThrowEvent, IntermediateCatchEvent)
   - ✅ SequenceFlows with optional durations

2. **Advanced Timeline Features**:
   - ✅ First Possible Occurrence algorithm for accurate timeline calculation
   - ✅ Connected component analysis for color grouping
   - ✅ ISO 8601 duration parsing (P1D, PT2H, P1DT2H30M format)
   - ✅ Current date marker line
   - ✅ Proper element ordering and grouping

3. **Robust Error Handling**:
   - ✅ Comprehensive error reporting for unsupported elements
   - ✅ Status header showing processing statistics
   - ✅ Expandable error details panel
   - ✅ Graceful handling of malformed data

4. **Clean Architecture**:
   - ✅ Modular code structure with clear separation of concerns
   - ✅ Full TypeScript type safety
   - ✅ Integration with existing GanttChartCanvas component
   - ✅ Timeline view state management

### Ready for Extension

The codebase is well-structured to support future additions:
- Gateway support can be added by extending the transformation logic
- BoundaryEvent support requires additional event handling
- UI enhancements can be added without affecting core logic
- Performance optimizations can be applied incrementally

### Integration Status

- ✅ Fully integrated with the process modeler view
- ✅ Timeline toggle functionality implemented
- ✅ Proper error boundaries and state management
- ✅ Responsive design and user experience
