# Gateway-Semantic Implementation Test Cases

These test cases are designed to systematically verify the gateway-semantic approach. Build each BPMN process and test with ALL modes ("earliest occurrence", "every occurrence", "latest occurrence") and both "renderGateways = false" (default) and "renderGateways = true" (debug mode).

## Recent Changes (Post-Refactor)

**Architecture Simplified**:

- **Single approach**: All modes now use path-based traversal with gateway-semantic processing
- **Dead code removed**: ~600 lines of unused preprocessing logic eliminated
- **Unified algorithm**: Gateway semantics applied during path traversal, not preprocessing
- **Visibility control**: `renderGateways` parameter controls whether gateways appear in timeline

**Testing Focus**:

- Verify gateway instances are created during traversal (even when hidden)
- Confirm dependency bypass logic works correctly when `renderGateways = false`
- Test that both visibility modes produce consistent results

## Test Case 1: Simple Parallel Fork

**Purpose**: Verify basic parallel gateway fork semantics
**Gateway Type**: **PARALLEL GATEWAY** (AND Fork)

```
BPMN Structure:
S → G1(PARALLEL) → T1
           G1    → T2

Elements:
- StartEvent (S)
- ParallelGateway (G1) - Fork type
- Task (T1)
- Task (T2)

Flows:
- S → G1
- G1 → T1
- G1 → T2
```

**Expected Result**:

- Elements: S, T1, T2 (G1 hidden)
- Dependencies: S→T1, S→T2
- Both T1 and T2 start simultaneously after S

---

## Test Case 2: Simple Parallel Join

**Purpose**: Verify basic parallel gateway join semantics
**Gateway Type**: **PARALLEL GATEWAY** (AND Join)

```
BPMN Structure:
S → T1 → G1(PARALLEL) → T3
S → T2 → G1

Elements:
- StartEvent (S)
- Task (T1)
- Task (T2)
- ParallelGateway (G1) - Join type
- Task (T3)

Flows:
- S → T1
- S → T2
- T1 → G1
- T2 → G1
- G1 → T3
```

**Expected Result**:

- Elements: S, T1, T2, T3 (G1 hidden)
- Dependencies: S→T1, S→T2, T1→T3, T2→T3
- T3 waits for both T1 AND T2 to complete

---

## Test Case 3: Simple Exclusive Fork

**Purpose**: Verify basic exclusive gateway fork semantics
**Gateway Type**: **EXCLUSIVE GATEWAY** (XOR Fork)

```
BPMN Structure:
S → G1(EXCLUSIVE) → T1
           G1     → T2

Elements:
- StartEvent (S)
- ExclusiveGateway (G1) - Fork type
- Task (T1)
- Task (T2)

Flows:
- S → G1
- G1 → T1 (condition: path1)
- G1 → T2 (condition: path2)
```

**Expected Result**:

- Elements: S, T1 (instance 1), T2 (instance 1) (G1 hidden)
- Dependencies: S→T1, S→T2
- Two separate execution paths from S

---

## Test Case 4: Gateway Chain (Solved)

**Purpose**: Verify gateway chains with transitive bypass dependencies  
**Gateway Types**: **PARALLEL GATEWAY** Chain (G1→G2)

```
BPMN Structure:
S → G1(PARALLEL) → T1
    G1          → T2 (direct path)
    G1          → G2(PARALLEL) → T2 (indirect path)

Elements:
- StartEvent (S)
- ParallelGateway (G1) - Fork type
- ParallelGateway (G2) - Pass-through type
- Task (T1)
- Task (T2)

Flows:
- S → G1
- G1 → T1
- G1 → T2 (direct)
- G1 → G2
- G2 → T2 (indirect)
```

**Expected Result**:

- Elements: S, T1, T2 (instance 1), T2 (instance 2) (G1, G2 hidden)
- Dependencies: S→T1, S→T2(inst1), S→T2(inst2)
- T2 instances created via different paths
- **Fixed**: Transitive bypass logic correctly creates S→T2(inst2) through gateway chain

---

## Test Case 5: Parallel Fork + Join

**Purpose**: Verify complete parallel flow cycle
**Gateway Types**: **PARALLEL GATEWAY** Fork + **PARALLEL GATEWAY** Join

```
BPMN Structure:
S → G1(PARALLEL) → T1 → G2(PARALLEL) → E
    G1           → T2 → G2

Elements:
- StartEvent (S)
- ParallelGateway (G1) - Fork type
- Task (T1)
- Task (T2)
- ParallelGateway (G2) - Join type
- EndEvent (E)

Flows:
- S → G1
- G1 → T1
- G1 → T2
- T1 → G2
- T2 → G2
- G2 → E
```

**Expected Result**:

- **Every Occurrence**: S, T1, T2, E (single instances - G1, G2 hidden)
- **Dependencies**: S→T1, S→T2, T1→E, T2→E
- **Semantics**: E has two prerequisites (T1 AND T2) but appears only once after synchronization
- **Timing**: E starts only after BOTH T1 and T2 complete (parallel join semantics)

**Note**: This tests **parallel join semantics** - elements that were split from the same source and rejoin should create only one target instance with multiple prerequisites.

---

## Test Case 6: Asymmetric Parallel Flows (Multiple Instances)

**Purpose**: Verify when elements should appear multiple times
**Gateway Types**: **PARALLEL GATEWAY** Fork + **EXCLUSIVE GATEWAY** Join

```
BPMN Structure:
S → G1(PARALLEL) → T1 → G2(EXCLUSIVE) → E1
    G1           → T2 → G2           → E2

Elements:
- StartEvent (S)
- ParallelGateway (G1) - Fork type
- Task (T1, T2)
- ExclusiveGateway (G2) - Join type
- EndEvent (E1, E2)

Flows:
- S → G1
- G1 → T1, G1 → T2
- T1 → G2, T2 → G2
- G2 → E1, G2 → E2
```

**Expected Result**:

- **Every Occurrence**: S, T1, T2, E1 (inst 1), E1 (inst 2), E2 (inst 1), E2 (inst 2)
- **Dependencies**: S→T1, S→T2, T1→E1, T1→E2, T2→E1, T2→E2
- **Semantics**: Both E1 and E2 are reachable from both T1 and T2 (4 total paths)

**Note**: This contrasts with Test Case 5 - here the **exclusive** join creates multiple paths to each target.

---

## Test Case 7: Sequential Tasks (Control Test)

**Purpose**: Verify normal flow without gateways still works

```
BPMN Structure:
S → T1 → T2 → E

Elements:
- StartEvent (S)
- Task (T1)
- Task (T2)
- EndEvent (E)

Flows:
- S → T1
- T1 → T2
- T2 → E
```

**Expected Result**:

- Elements: S, T1, T2, E
- Dependencies: S→T1, T1→T2, T2→E
- Sequential execution: S → T1 → T2 → E

---

## Test Case 8: Mixed Gateway Types

**Purpose**: Verify exclusive and parallel gateways together
**Gateway Types**: **PARALLEL GATEWAY** Fork + **EXCLUSIVE GATEWAY** Join

```
BPMN Structure:
S → G1(PARALLEL) → T1 → G2(EXCLUSIVE) → T3
    G1           → T2 → G2           → T4

Elements:
- StartEvent (S)
- ParallelGateway (G1) - Fork type
- Task (T1, T2, T3, T4)
- ExclusiveGateway (G2) - Join type

Flows:
- S → G1
- G1 → T1, G1 → T2
- T1 → G2, T2 → G2
- G2 → T3, G2 → T4
```

**Expected Result**:

- **Every Occurrence**: S, T1, T2, T3 (inst1), T3 (inst2), T4 (inst1), T4 (inst2)
- **Dependencies**: S→T1, S→T2, T1→T3, T1→T4, T2→T3, T2→T4
- **Semantics**: Both T1 and T2 execute in parallel, both can lead to either T3 or T4 (4 total paths)

---

## Test Case 9: Nested Parallel Gateways

**Purpose**: Verify nested parallel execution patterns
**Gateway Types**: Multiple **PARALLEL GATEWAYS** (nested)

```
BPMN Structure:
S → G1(PARALLEL) → T1 → G3(PARALLEL) → T3 → G4(PARALLEL) → E
    G1           → T2 → G3           → T4 → G4

Elements:
- StartEvent (S)
- ParallelGateway (G1) - Fork type
- Task (T1, T2, T3, T4)
- ParallelGateway (G3) - Join + Fork type
- ParallelGateway (G4) - Join type
- EndEvent (E)

Flows:
- S → G1
- G1 → T1, G1 → T2
- T1 → G3, T2 → G3
- G3 → T3, G3 → T4
- T3 → G4, T4 → G4
- G4 → E
```

**Expected Result**:

- **Every Occurrence**: S, T1, T2, T3, T4, E (single instances - all gateways hidden)
- **Dependencies**: S→T1, S→T2, T1→T3, T1→T4, T2→T3, T2→T4, T3→E, T4→E
- **Semantics**: Nested synchronization - G3 waits for T1 AND T2, then forks to T3 and T4, then G4 waits for T3 AND T4

---

## Test Case 10: Gateway Mismatch Pattern (Structural Warning)

**Purpose**: Verify detection of exclusive → parallel join deadlock patterns
**Gateway Types**: **EXCLUSIVE GATEWAY** → **PARALLEL GATEWAY** (problematic pattern)

```
BPMN Structure:
S → G1(EXCLUSIVE) → T1 → G2(PARALLEL) → T3 → G3(PARALLEL) → E
    G1            → T2 → G2           → T4 → G3

Elements:
- StartEvent (S)
- ExclusiveGateway (G1) - Fork type
- Task (T1, T2, T3, T4)
- ParallelGateway (G2) - Join type (PROBLEMATIC)
- ParallelGateway (G3) - Join type
- EndEvent (E)

Flows:
- S → G1
- G1 → T1 (condition: path1), G1 → T2 (condition: path2)
- T1 → G2, T2 → G2
- G2 → T3, G2 → T4
- T3 → G3, T4 → G3
- G3 → E
```

**Expected Result**:

- **Timeline Generated**: S, T1 (inst1), T2 (inst1), T3 (inst1), T4 (inst1), E (inst1)
- **Dependencies**: S→T1, S→T2, T1→T3, T1→T4, T2→T3, T2→T4, T3→E, T4→E
- **Structural Warning Expected**:
  ```
  "Potential deadlock detected: Parallel join gateway 'G2' receives flows from
  exclusive gateway(s) 'G1'. In real BPMN execution, this could cause the parallel
  join to wait indefinitely for flows that may never arrive."
  ```
- **Semantics**: Shows structural path analysis, not BPMN token flow semantics
- **Issue**: In real BPMN execution, G2 waits for BOTH T1 AND T2, but G1 only sends flow to ONE path

**Testing Focus**:

- Verify warning message appears in transformation issues
- Confirm timeline still generates despite structural problem
- Check that warning includes gateway names and path information

---

## Test Case 11: Asymmetric Parallel Flow

**Purpose**: Verify parallel flows with different convergence points
**Gateway Types**: **PARALLEL GATEWAY** with asymmetric rejoining

```
BPMN Structure:
S → G1(PARALLEL) → T1 → G2(PARALLEL) → T4 → E1
    G1           → T2 → G2           → T5 → E2
    G1           → T3 ──────────────────────→ E3

Elements:
- StartEvent (S)
- ParallelGateway (G1) - Fork type
- Task (T1, T2, T3, T4, T5)
- ParallelGateway (G2) - Join + Fork type
- EndEvent (E1, E2, E3)

Flows:
- S → G1
- G1 → T1, G1 → T2, G1 → T3
- T1 → G2, T2 → G2
- G2 → T4, G2 → T5
- T4 → E1, T5 → E2, T3 → E3
```

**Expected Result**:

- **Every Occurrence**: S, T1, T2, T3, T4, T5, E1, E2, E3 (single instances)
- **Dependencies**: S→T1, S→T2, S→T3, T1→T4, T1→T5, T2→T4, T2→T5, T4→E1, T5→E2, T3→E3
- **Semantics**: T3 is fire-and-forget, T1+T2 synchronize for T4+T5

---

## Test Case 12: Gateway Loop Pattern

**Purpose**: Verify gateways inside loops
**Gateway Types**: **EXCLUSIVE GATEWAY** with loop

```
BPMN Structure:
S → T1 → G1(EXCLUSIVE) → T2 → T3 → E
          G1           → T4 ──↑ (back to T1)

Elements:
- StartEvent (S)
- Task (T1, T2, T3, T4)
- ExclusiveGateway (G1) - Fork type
- EndEvent (E)

Flows:
- S → T1
- T1 → G1
- G1 → T2 (condition: continue), G1 → T4 (condition: loop)
- T2 → T3
- T3 → E
- T4 → T1 (loop back)
```

**Expected Result** (loop-depth: 1):

- **Every Occurrence**: S, T1 (inst1), T1 (inst2), T2 (inst1), T3 (inst1), T4 (inst1), E (inst1)
- **Dependencies**: S→T1(1), T1(1)→T2, T1(1)→T4, T2→T3, T3→E, T4→T1(2), T1(2)→[loop cut]
- **Semantics**: Shows both loop and exit paths with proper loop termination

---

## Test Case 13: Complex Synchronization

**Purpose**: Verify complex multi-point synchronization
**Gateway Types**: Multiple **PARALLEL GATEWAYS** with complex convergence

```
BPMN Structure:
S1 → T1 → G1(PARALLEL) → T3 → G3(PARALLEL) → T6 → E
S2 → T2 → G1           → T4 → G3
S3 → G2(PARALLEL) → T5 → G3

Elements:
- StartEvent (S1, S2, S3)
- Task (T1, T2, T3, T4, T5, T6)
- ParallelGateway (G1) - Join + Fork type
- ParallelGateway (G2) - Fork type
- ParallelGateway (G3) - Join + Fork type
- EndEvent (E)

Flows:
- S1 → T1, S2 → T2, S3 → G2
- T1 → G1, T2 → G1
- G1 → T3, G1 → T4
- G2 → T5
- T3 → G3, T4 → G3, T5 → G3
- G3 → T6
- T6 → E
```

**Expected Result**:

- **Every Occurrence**: S1, S2, S3, T1, T2, T3, T4, T5, T6, E (single instances)
- **Dependencies**: S1→T1, S2→T2, S3→T5, T1→T3, T1→T4, T2→T3, T2→T4, T3→T6, T4→T6, T5→T6, T6→E
- **Semantics**: Multiple synchronization points - G1 waits for T1+T2, G3 waits for T3+T4+T5

---

## Test Case 14: Gateway Chain Resolution

**Purpose**: Verify gateway-to-gateway connections
**Gateway Types**: **PARALLEL GATEWAY** → **EXCLUSIVE GATEWAY** chain

```
BPMN Structure:
S → G1(PARALLEL) → G2(EXCLUSIVE) → T1 → E1
    G1           → T2            → T3 → E2
                   G2            → T4 → E3

Elements:
- StartEvent (S)
- ParallelGateway (G1) - Fork type
- ExclusiveGateway (G2) - Fork type
- Task (T1, T2, T3, T4)
- EndEvent (E1, E2, E3)

Flows:
- S → G1
- G1 → G2, G1 → T2
- G2 → T1, G2 → T4
- T1 → E1, T2 → T3, T3 → E2, T4 → E3
```

**Expected Result**:

- **Every Occurrence**: S, T1 (inst1), T2, T3, T4 (inst1), E1 (inst1), E2, E3 (inst1)
- **Dependencies**: S→T1, S→T2, S→T4, T1→E1, T2→T3, T3→E2, T4→E3
- **Semantics**: Parallel fork to exclusive choice plus direct task path

---

## Test Case 15: Dead-End Parallel Branch

**Purpose**: Verify parallel branches that don't rejoin
**Gateway Types**: **PARALLEL GATEWAY** with non-rejoining branches

```
BPMN Structure:
S → G1(PARALLEL) → T1 → T2 → E1
    G1           → T3 → T4 → E2
    G1           → T5 ──────→ E3

Elements:
- StartEvent (S)
- ParallelGateway (G1) - Fork type
- Task (T1, T2, T3, T4, T5)
- EndEvent (E1, E2, E3)

Flows:
- S → G1
- G1 → T1, G1 → T3, G1 → T5
- T1 → T2, T3 → T4
- T2 → E1, T4 → E2, T5 → E3
```

**Expected Result**:

- **Every Occurrence**: S, T1, T2, T3, T4, T5, E1, E2, E3 (single instances)
- **Dependencies**: S→T1, S→T3, S→T5, T1→T2, T3→T4, T2→E1, T4→E2, T5→E3
- **Semantics**: Three independent parallel branches with no synchronization

---

## Test Case 16: Parallel Gateway with Sequential Branch

**Purpose**: Verify parallel fork with one branch containing sequential tasks
**Gateway Types**: **PARALLEL GATEWAY** fork with asymmetric branch lengths

```
BPMN Structure:
S → G1(PARALLEL) → T1 → T2 → G2(PARALLEL) → E
    G1           → T2 ────→ G2

Elements:
- StartEvent (S)
- ParallelGateway (G1) - Fork type
- Task (T1, T2)
- ParallelGateway (G2) - Join type
- EndEvent (E)

Flows:
- S → G1
- G1 → T1, G1 → T2
- T1 → T2 (creates second T2 instance)
- T2 → G2 (BOTH T2 instances must connect to G2)
- G2 → E
```

**Expected Result**:

- **Every Occurrence**: S, T1, T2 (instance 1), T2 (instance 2), E (instance 1), E (instance 2)
- **Dependencies**: S→T2(inst1), S→T1, T1→T2(inst2), T2(inst1)→E(inst1), T2(inst2)→E(inst2)
- **Semantics**: G1 forks to T1 and T2 in parallel, T1 leads to a second T2 instance, each T2 instance follows the same outgoing path (T2→G2→E) creating separate execution paths

**KEY INSIGHT**: This pattern shows that when the same element appears in multiple paths, each instance follows its own execution path through subsequent elements. G2 doesn't synchronize the T2 instances because they represent different executions of the same task, not different tasks converging.

**Note**: This tests whether the implementation correctly handles:

1. **Same element (T2) appearing in multiple paths**: Creates separate instances for each path
2. **Independent path execution**: Each T2 instance follows its own execution path through G2→E
3. **Sequential dependency within parallel branch**: T1→T2 relationship maintained
4. **Path-based semantics**: Multiple instances of the same element create multiple downstream execution paths

---

## Test Case 17: Inclusive Gateway Fork

**Purpose**: Verify inclusive gateway fork behavior (treated as parallel fork)
**Gateway Type**: **INCLUSIVE GATEWAY** (OR Fork)

```
BPMN Structure:
S → G1(INCLUSIVE) → T1 (condition: amount > 1000)
         G1       → T2 (condition: urgent == true)
         G1       → T3 (condition: vip == true)

Elements:
- StartEvent (S)
- InclusiveGateway (G1) - Fork type
- Task (T1, T2, T3)

Flows:
- S → G1
- G1 → T1 (condition: amount > 1000)
- G1 → T2 (condition: urgent == true)
- G1 → T3 (condition: vip == true)
```

**Expected Result**:

- **Elements**: S, T1, T2, T3 (G1 hidden)
- **Dependencies**: S→T1, S→T2, S→T3
- **Semantics**: Conservative analysis - shows all possible paths as if all conditions were true
- **Timing**: All tasks start simultaneously after S (parallel fork behavior)

---

## Test Case 18: Inclusive Gateway Join

**Purpose**: Verify inclusive gateway join behavior (treated as parallel join)
**Gateway Type**: **INCLUSIVE GATEWAY** (OR Join)

```
BPMN Structure:
S1 → T1 → G1(INCLUSIVE) → T4 → E
S2 → T2 → G1
S3 → T3 → G1

Elements:
- StartEvent (S1, S2, S3)
- Task (T1, T2, T3, T4)
- InclusiveGateway (G1) - Join type
- EndEvent (E)

Flows:
- S1 → T1, S2 → T2, S3 → T3
- T1 → G1, T2 → G1, T3 → G1
- G1 → T4
- T4 → E
```

**Expected Result**:

- **Elements**: S1, S2, S3, T1, T2, T3, T4, E (G1 hidden)
- **Dependencies**: S1→T1, S2→T2, S3→T3, T1→T4, T2→T4, T3→T4, T4→E
- **Semantics**: T4 waits for ALL three tasks (T1, T2, T3) to complete
- **Timing**: Conservative analysis assuming all paths are active

---

## Test Case 19: Mixed Inclusive and Parallel Gateways

**Purpose**: Verify inclusive gateways work correctly with other gateway types
**Gateway Types**: **PARALLEL GATEWAY** + **INCLUSIVE GATEWAY**

```
BPMN Structure:
S → G1(PARALLEL) → T1 → G2(INCLUSIVE) → T4 → E1
    G1           → T2 → G2           → T5 → E2
    G1           → T3 ──────────────────────→ E3

Elements:
- StartEvent (S)
- ParallelGateway (G1) - Fork type
- Task (T1, T2, T3, T4, T5)
- InclusiveGateway (G2) - Join + Fork type
- EndEvent (E1, E2, E3)

Flows:
- S → G1
- G1 → T1, G1 → T2, G1 → T3
- T1 → G2, T2 → G2
- G2 → T4, G2 → T5
- T4 → E1, T5 → E2, T3 → E3
```

**Expected Result**:

- **Elements**: S, T1, T2, T3, T4, T5, E1, E2, E3 (G1, G2 hidden)
- **Dependencies**: S→T1, S→T2, S→T3, T1→T4, T1→T5, T2→T4, T2→T5, T4→E1, T5→E2, T3→E3
- **Semantics**: G1 creates parallel paths, G2 waits for T1+T2 then forks to T4+T5, T3 is independent
- **Timing**: Mixed gateway behavior working together

---

## Testing Instructions

For each test case:

1. **Build the BPMN**: Create the process in the BPMN modeler
2. **Test All Modes**: Test with ALL three modes ("earliest", "every", "latest") with `renderGateways = false`
3. **Check Elements**: Verify expected elements appear (gateways hidden in all modes)
4. **Check Dependencies**: Verify correct source→target connections (no gateway IDs in dependency chains)
5. **Check Timing**: Verify parallel/sequential timing behavior across modes
6. **Check Instances**: For "every occurrence", verify correct instance counts; for "earliest"/"latest", verify single instances with correct timing

## Success Criteria

**Gateway-Semantic Working**: If all test cases show:

- Gateways hidden from visualization
- Correct dependencies created (source→target, no gateway IDs)
- Proper timing semantics (parallel vs sequential)
- Correct instance creation in multi-path scenarios

❌ **Needs Fix**: If any test case shows:

- Missing dependencies
- Gateway instances in dependency chains
- Incorrect timing/synchronization
- Missing or duplicate element instances

## Current Implementation Status

- **Gateway-semantic traversal**: Fully implemented and tested
- **Direct source→target dependencies**: Implemented and working
- **Synchronization logic**: Fully implemented with queueing mechanism
- **Gateway visibility control**: Implemented via renderGateways parameter
- **Dependency filtering**: Bypass logic working for hidden gateways
- **Complex gateway patterns**: Ready for testing

Start with **Test Case 1** (simplest) and progress through complexity.

## Expected Issue Messages

### Error Messages (Block Timeline Generation)

**Unsupported Gateway Types**:

```
Gateway type bpmn:InclusiveGateway is not supported. Only exclusive and parallel gateways are currently supported.
```

**Unsupported Elements**:

```
Element type bpmn:SubProcess is not supported in timeline transformation
Element type bpmn:BoundaryEvent is not supported in timeline transformation
```

**BPMN Parsing Errors**:

```
Failed to parse BPMN XML
No valid process found in definitions
```

### Warning Messages (Allow Timeline Generation)

**Gateway Mismatch Detection**:

```
Potential deadlock detected: Parallel join gateway 'Gateway_2' receives flows from exclusive gateway(s) 'Gateway_1'. In real BPMN execution, this could cause the parallel join to wait indefinitely for flows that may never arrive. Paths: Path through Gateway_1: [StartEvent → Task_1 → Gateway_1 → Task_2 → Gateway_2]
```

**Path Explosion Limits**:

```
Path traversal exceeded maximum iterations (1000), stopping to prevent infinite loop
Maximum paths limit (100) reached during path exploration
```

**Loop Iteration Limits**:

```
Loop iteration limit reached for element Task_1 (max depth: 2)
```

### Success Messages

**Successful Transformation**:

```
15/20 elements processed successfully (75%)
Timeline generated with 3 warnings
```

**Status Display Format**:

```
Elements: 15 processed, 3 errors, 2 warnings
Dependencies: 12 created (8 direct, 4 bypass)
```

### Debug Information

**When renderGateways = true**:

- Gateway elements appear as milestones in timeline
- All dependencies visible including gateway connections
- Useful for debugging gateway logic

**When renderGateways = false (default)**:

- Gateway instances hidden from final output
- Bypass dependencies created automatically
- Clean timeline showing only tasks and events

### Testing Error Scenarios

**Test Unsupported Gateways**:

1. Create BPMN with InclusiveGateway
2. Expected: Error message blocking timeline generation
3. Verify error details include gateway ID and type

**Test Gateway Mismatches**:

1. Create ExclusiveGateway → ParallelGateway pattern
2. Expected: Warning message with deadlock explanation
3. Verify timeline still generates with warning indicator

**Test BPMN Parsing**:

1. Provide invalid BPMN XML
2. Expected: Error message with parsing failure details
3. Verify graceful error handling without component crash

---

## Structural Issue Test Cases

These test cases are designed to systematically test all types of structural warnings and errors that the component can detect. Each case should trigger specific validation logic.

### Test Case S1: Simple Exclusive → Parallel Deadlock

**Purpose**: Test basic exclusive-to-parallel deadlock detection
**Issue Type**: Structural Warning (Gateway Mismatch)

```
BPMN Structure:
S → G1(EXCLUSIVE) → T1 → G2(PARALLEL) → E
    G1            → T2 → G2

Elements:
- StartEvent (S)
- ExclusiveGateway (G1) - Fork
- Task (T1, T2)
- ParallelGateway (G2) - Join
- EndEvent (E)

Flows:
- S → G1
- G1 → T1 (condition: path1)
- G1 → T2 (condition: path2)
- T1 → G2, T2 → G2
- G2 → E
```

**Expected Warning**:

```
Potential deadlock detected in parallel join gateway 'G2' - it expects multiple incoming flows but receives them from exclusive gateway(s) 'G1' which only executes one path. The parallel join will wait indefinitely for flows that never arrive.
```

**Expected Result**: Timeline generates with warning

---

### Test Case S2: Multiple Exclusive → Single Parallel

**Purpose**: Test multiple exclusive gateways feeding one parallel join
**Issue Type**: Structural Warning (Gateway Mismatch)

```
BPMN Structure:
S1 → G1(EXCLUSIVE) → T1 → G3(PARALLEL) → E
      G1           → T2 → G3
S2 → G2(EXCLUSIVE) → T3 → G3
     G2            → T4 → G3

Elements:
- StartEvent (S1, S2)
- ExclusiveGateway (G1, G2) - Forks
- Task (T1, T2, T3, T4)
- ParallelGateway (G3) - Join
- EndEvent (E)
```

**Expected Warning**:

```
Potential deadlock detected in parallel join gateway 'G3' - it expects multiple incoming flows but receives them from exclusive gateway(s) 'G1, G2' which only executes one path. The parallel join will wait indefinitely for flows that never arrive.
```

**Expected Result**: Timeline generates with warning

---

### Test Case S3: Nested Exclusive → Parallel Chain

**Purpose**: Test deep exclusive-to-parallel chains
**Issue Type**: Structural Warning (Gateway Mismatch)

```
BPMN Structure:
S → G1(EXCLUSIVE) → T1 → G2(EXCLUSIVE) → T3 → G3(PARALLEL) → E
    G1            → T2 → G2           → T4 → G3

Elements:
- StartEvent (S)
- ExclusiveGateway (G1, G2) - Forks
- Task (T1, T2, T3, T4)
- ParallelGateway (G3) - Join
- EndEvent (E)
```

**Expected Warning**:

```
Potential deadlock detected in parallel join gateway 'G3' - it expects multiple incoming flows but receives them from exclusive gateway(s) 'G1, G2' which only executes one path. The parallel join will wait indefinitely for flows that never arrive.
```

**Expected Result**: Timeline generates with warning

---

### Test Case S4: Unsupported Gateway Types

**Purpose**: Test error handling for unsupported gateway types
**Issue Type**: Error (Unsupported Elements)

```
BPMN Structure:
S → G1(INCLUSIVE) → T1 → E1
    G1           → T2 → E2

Elements:
- StartEvent (S)
- InclusiveGateway (G1) - Fork
- Task (T1, T2)
- EndEvent (E1, E2)

Flows:
- S → G1
- G1 → T1, G1 → T2
- T1 → E1, T2 → E2
```

**Expected Error**:

```
Gateway type bpmn:InclusiveGateway is not supported. Only exclusive and parallel gateways are currently supported.
```

**Expected Result**: Timeline generation blocked

---

### Test Case S5: Unsupported Element Types

**Purpose**: Test error handling for unsupported element types
**Issue Type**: Error (Unsupported Elements)

```
BPMN Structure:
S → T1 → SUB → T2 → E
         ↑ BoundaryEvent

Elements:
- StartEvent (S)
- Task (T1, T2)
- SubProcess (SUB)
- BoundaryEvent (attached to SUB)
- EndEvent (E)
```

**Expected Errors**:

```
Element type bpmn:SubProcess is not supported in timeline transformation
Element type bpmn:BoundaryEvent is not supported in timeline transformation
```

**Expected Result**: Timeline generation blocked

---

### Test Case S6: Complex Gateway Mismatch

**Purpose**: Test complex exclusive-to-parallel patterns with multiple levels
**Issue Type**: Structural Warning (Gateway Mismatch)

```
BPMN Structure:
S → G1(EXCLUSIVE) → T1 → G3(PARALLEL) → T5 → G4(PARALLEL) → E
    G1            → T2 → G3           → T6 → G4

Elements:
- StartEvent (S)
- ExclusiveGateway (G1) - Fork
- Task (T1, T2, T5, T6)
- ParallelGateway (G3, G4) - Joins
- EndEvent (E)
```

**Expected Warnings**:

```
Potential deadlock detected in parallel join gateway 'G3' - it expects multiple incoming flows but receives them from exclusive gateway(s) 'G1' which only executes one path...
Potential deadlock detected in parallel join gateway 'G4' - it expects multiple incoming flows but receives them from exclusive gateway(s) 'G1' which only executes one path...
```

**Expected Result**: Timeline generates with multiple warnings

---

### Test Case S7: Mixed Supported/Unsupported Elements

**Purpose**: Test partial processing with mixed element support
**Issue Type**: Mixed (Errors + Successful Processing)

```
BPMN Structure:
S → T1 → G1(INCLUSIVE) → T2 → SUB → T3 → E
                       → T4 ────────→

Elements:
- StartEvent (S) ✓
- Task (T1, T2, T3, T4) ✓
- InclusiveGateway (G1) ✗
- SubProcess (SUB) ✗
- EndEvent (E) ✓
```

**Expected Results**:

- **Errors**: InclusiveGateway and SubProcess not supported
- **Timeline**: Shows S, T1, E (T2, T3, T4 unreachable due to unsupported G1)
- **Status**: "3/7 elements processed successfully (43%)"

---

### Test Case S8: Path Explosion Prevention

**Purpose**: Test path explosion limits in complex branching
**Issue Type**: Warning (Performance Limits)

```
BPMN Structure:
Complex branching pattern with multiple exclusive gateways creating
exponential path explosion (design to exceed 100 paths or 1000 elements)

S → G1(EXCLUSIVE) → G2(EXCLUSIVE) → G3(EXCLUSIVE) → ... (deep nesting)
```

**Expected Warning**:

```
Maximum paths limit (100) reached during path exploration
Path traversal exceeded maximum iterations (1000), stopping to prevent infinite loop
```

**Expected Result**: Timeline generates with path cutoff warnings displayed in issues panel

---

### Test Case S9: Loop Iteration Limits

**Purpose**: Test loop iteration limit handling
**Issue Type**: Warning (Performance Limits)

```
BPMN Structure:
S → T1 → G1(EXCLUSIVE) → T2 → E
     ↑     G1           → T3 → (loop back to T1)

With loop-depth setting that causes iteration limit to be reached
```

**Expected Warning**:

```
Loop iteration limit reached for element T1 (max depth: 2)
```

**Expected Result**: Timeline generates with loop cutoff warnings displayed in issues panel

---

### Test Case S10: Invalid BPMN Structure

**Purpose**: Test handling of malformed BPMN
**Issue Type**: Error (Parsing/Structure)

```
Test scenarios:
1. Invalid XML structure
2. Missing process definition
3. Circular references without proper gateways
4. Disconnected elements
5. Missing target/source references in flows
```

**Expected Errors**:

```
Failed to parse BPMN XML
No valid process found in definitions
Invalid references: Sequence flows pointing to non-existent elements
```

**Expected Result**: Timeline generation blocked with specific error details

---

## Testing Instructions for Structural Issues

### Systematic Testing Approach

1. **Create each test case** in BPMN modeler
2. **Test with renderGateways = false** (default mode)
3. **Verify expected warnings/errors** appear in issue panel
4. **Check timeline generation** - should generate for warnings, block for errors
5. **Verify error details** include element IDs, types, and explanations
6. **Test with renderGateways = true** - should show same structural issues

### Success Criteria

**Warning Cases (S1-S3, S6, S8, S9)**:

- ✅ Timeline generates successfully
- ✅ Warning appears in issues panel with expandable details
- ✅ Warning message includes specific element names and explanations
- ✅ Timeline shows structural path analysis (not BPMN token flow)
- ✅ Performance limit warnings (S8, S9) now properly displayed in UI

**Error Cases (S4, S5, S7, S10)**:

- ✅ Timeline generation blocked
- ✅ Specific error messages appear
- ✅ Error details include element IDs and types
- ✅ Component handles errors gracefully without crashing

**Mixed Cases (S7)**:

- ✅ Partial timeline generation
- ✅ Success rate percentage shown
- ✅ Both errors and successful elements reported
