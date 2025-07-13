# Gateway-Semantic Implementation Test Cases

These test cases are designed to systematically verify the new gateway-semantic approach. Build each BPMN process and test with ALL modes ("earliest occurrence", "every occurrence", "latest occurrence") and "renderGateways = false".

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

## Test Case 4: Gateway Chain (Current Problem Case)

**Purpose**: Verify the original failing case with gateway chains
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
- T2 appears TWICE (once per path)

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

**⚠️ Note**: This tests **parallel join semantics** - elements that were split from the same source and rejoin should create only one target instance with multiple prerequisites.

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

**⚠️ Note**: This contrasts with Test Case 5 - here the **exclusive** join creates multiple paths to each target.

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

## Test Case 10: Mixed Gateway Chain

**Purpose**: Verify exclusive and parallel gateways in sequence
**Gateway Types**: **EXCLUSIVE GATEWAY** → **PARALLEL GATEWAY**

```
BPMN Structure:
S → G1(EXCLUSIVE) → T1 → G2(PARALLEL) → T3 → G3(PARALLEL) → E
    G1            → T2 → G2           → T4 → G3

Elements:
- StartEvent (S)
- ExclusiveGateway (G1) - Fork type
- Task (T1, T2, T3, T4)
- ParallelGateway (G2) - Join type
- ParallelGateway (G3) - Fork + Join type
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

- **Every Occurrence**: S, T1 (inst1), T2 (inst1), T3 (inst1), T4 (inst1), E (inst1)
- **Dependencies**: S→T1, S→T2, T1→T3, T1→T4, T2→T3, T2→T4, T3→E, T4→E
- **Semantics**: Two exclusive paths converge at G2 (parallel join), fork to T3+T4, then converge again at G3

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

**⚠️ KEY INSIGHT**: This pattern shows that when the same element appears in multiple paths, each instance follows its own execution path through subsequent elements. G2 doesn't synchronize the T2 instances because they represent different executions of the same task, not different tasks converging.

**Note**: This tests whether the implementation correctly handles:

1. **Same element (T2) appearing in multiple paths**: Creates separate instances for each path
2. **Independent path execution**: Each T2 instance follows its own execution path through G2→E
3. **Sequential dependency within parallel branch**: T1→T2 relationship maintained
4. **Path-based semantics**: Multiple instances of the same element create multiple downstream execution paths

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

✅ **Gateway-Semantic Working**: If all test cases show:

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

- ✅ **Gateway-semantic traversal**: Implemented
- ✅ **Direct source→target dependencies**: Implemented
- ⚠️ **Synchronization logic**: May need updates for new approach
- ⚠️ **Complex gateway patterns**: Untested

Start with **Test Case 1** (simplest) and progress through complexity.
