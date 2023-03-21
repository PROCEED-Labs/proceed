jest.mock('@proceed/system');
jest.mock('@proceed/distribution');
jest.mock('@proceed/decider');
jest.mock('@proceed/machine');
const mockPassToken = jest.fn();
jest.mock('../engine/shouldPassToken.js', () => ({
  getShouldPassToken: () => mockPassToken,
}));

const fs = require('fs');
const path = require('path');

const taskBpmn = fs.readFileSync(path.resolve(__dirname, 'bpmn', 'task.bpmn'), 'utf-8');
const manualInterruptionHandlingBpmn = fs.readFileSync(
  path.resolve(__dirname, 'bpmn', 'manualInterruptionHandling.bpmn'),
  'utf-8'
);
const parallelBpmn = fs.readFileSync(path.resolve(__dirname, 'bpmn', 'parallel.bpmn'), 'utf-8');
const parallelMergeBpmn = fs.readFileSync(
  path.resolve(__dirname, 'bpmn', 'parallelMerge.bpmn'),
  'utf-8'
);
const subprocessBpmn = fs.readFileSync(path.resolve(__dirname, 'bpmn', 'subprocess.bpmn'), 'utf-8');
const manualSubprocessInterruptionHandlingBpmn = fs.readFileSync(
  path.resolve(__dirname, 'bpmn', 'manualSubprocessInterruptionHandling.bpmn'),
  'utf-8'
);
const importerBpmn = fs.readFileSync(path.resolve(__dirname, 'bpmn', 'importer.bpmn'), 'utf-8');
const manualCallActivityInterruptionHandlingBpmn = fs.readFileSync(
  path.resolve(__dirname, 'bpmn', 'manualCallActivityInterruption.bpmn'),
  'utf-8'
);
const importBpmn = fs.readFileSync(path.resolve(__dirname, 'bpmn', 'import.bpmn'), 'utf-8');

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

// Reload the System module for each test since its mock implementation is
// dependent on the test and the calls happen asynchronously, so the tests would
// interfere with each other if we used the same module for each one.
// We have to reload all other modules as well, because they need to use the new
// System module (and they use the new Engine module, so we need a reference and
// so on...).
let System;
let logging;
let information;
let management;
let Engine;
let distribution;
let decider;

describe('Tests for the restart of interrupted processes at engine startup', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.resetModules();

    System = require('@proceed/system');
    ({ information, logging } = require('@proceed/machine'));
    management = require('../management.js');
    Engine = require('../engine/engine.js');
    distribution = require('@proceed/distribution');
    decider = require('@proceed/decider');

    mockPassToken.mockImplementation(async () => true);

    distribution.communication.getAvailableMachines.mockReturnValue([
      { ip: '192.168.1.3', id: 'mockId', port: 33029 },
    ]);
    distribution.db.getProcess.mockReturnValue(taskBpmn);
    distribution.db.getProcessInfo.mockResolvedValue({
      bpmn: taskBpmn,
      deploymentMethod: 'dynamic',
    });
    distribution.db.isProcessVersionValid.mockResolvedValue(true);
    decider.allowedToExecuteLocally.mockReturnValue(true);
    information.getMachineInformation.mockResolvedValue({
      id: 'mockId',
      name: 'mockName',
      port: 33029,
    });
    logging.getLogger.mockReturnValue({
      trace: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      fatal: jest.fn(),
      log: jest.fn(),
    });
  });

  it('checks the database for interrupted process instances', async () => {
    distribution.db.getAllProcesses.mockResolvedValue(['Process 1', 'Process 2']);
    distribution.db.getArchivedInstances.mockResolvedValue({});
    await management.restoreInterruptedInstances();

    expect(distribution.db.getAllProcesses).toHaveBeenCalled();
    expect(distribution.db.getArchivedInstances).toBeCalledTimes(2);
    expect(distribution.db.getArchivedInstances).toHaveBeenCalledWith('Process 1');
    expect(distribution.db.getArchivedInstances).toHaveBeenCalledWith('Process 2');
  });

  it('will create an execution engine for a process that has interrupted instances and load the correct process versions', async () => {
    distribution.db.getAllProcesses.mockResolvedValue(['Process 1']);
    distribution.db.getArchivedInstances.mockResolvedValue({
      instance1: { processVersion: 123, tokens: [], instanceState: ['ENDED'], some: 'data' },
      instance2: {
        processVersion: 123,
        tokens: [],
        instanceState: ['RUNNING'],
        isCurrentlyExecutedInBpmnEngine: true,
      },
      instance3: { processVersion: 456, tokens: [], instanceState: ['TERMINATED'], some: 'data' },
      instance4: {
        processVersion: 789,
        tokens: [],
        instanceState: ['DEPLOYMENT-WAITING'],
        some: 'data',
        isCurrentlyExecutedInBpmnEngine: true,
      },
    });
    const ensureExecutionEngine = jest.spyOn(management, 'ensureProcessEngineWithVersion');
    const deployVersionInEngine = jest.spyOn(Engine.prototype, 'deployProcessVersion');

    const startInstance = jest.spyOn(Engine.prototype, 'startProcessVersion');
    startInstance.mockImplementation(() => {});

    distribution.db.getProcessVersion.mockResolvedValue(taskBpmn);

    await management.restoreInterruptedInstances();

    expect(ensureExecutionEngine).toBeCalledTimes(2);
    expect(ensureExecutionEngine).toHaveBeenCalledWith('Process 1', 123);
    expect(ensureExecutionEngine).toHaveBeenCalledWith('Process 1', 789);

    expect(deployVersionInEngine).toBeCalledTimes(2);
    expect(deployVersionInEngine).toHaveBeenCalledWith('Process 1', 123);
    expect(deployVersionInEngine).toHaveBeenCalledWith('Process 1', 789);

    expect(management.getAllEngines().length).toBe(1);

    ensureExecutionEngine.mockRestore();
    deployVersionInEngine.mockRestore();
  });

  it('will try to restore instances that are marked as still being executed in the bpmn engine', async () => {
    distribution.db.getAllProcesses.mockResolvedValue(['Process1']);

    const archivedState = {
      processId: 'Process1',
      processInstanceId: 'Process1-instance1',
      globalStartTime: 1677597235740,
      instanceState: ['READY'],
      tokens: [
        {
          machineHops: 0,
          deciderStorageTime: 0,
          deciderStorageRounds: 0,
          localStartTime: 1677597235740,
          tokenId: 'c1a1922d-2018-419f-9b25-089c85c48ea2',
          state: 'READY',
          currentFlowElementId: 'Task_1y4wd2q',
          previousFlowElementId: 'SequenceFlow_14mwzvq',
          intermediateVariablesState: null,
          localExecutionTime: 5,
        },
      ],
      variables: {},
      log: [
        {
          flowElementId: 'StartEvent_1',
          tokenId: 'c1a1922d-2018-419f-9b25-089c85c48ea2',
          executionState: 'COMPLETED',
          startTime: 1677597235755,
          endTime: 1677597235760,
          machine: {
            id: 'mockId',
            name: 'mockName',
            ip: '192.168.1.3',
            port: 33029,
          },
        },
      ],
      adaptationLog: [],
      processVersion: '1677505265559',
      isCurrentlyExecutedInBpmnEngine: true,
    };

    distribution.db.getArchivedInstances.mockResolvedValue({ instance1: archivedState });

    const startInstance = jest.spyOn(Engine.prototype, 'startProcessVersion');
    startInstance.mockImplementation(() => {});

    distribution.db.getProcessVersion.mockResolvedValue(taskBpmn);

    await management.restoreInterruptedInstances();

    expect(startInstance).toBeCalledTimes(1);
    expect(startInstance).toBeCalledWith(
      '1677505265559',
      archivedState.variables,
      {
        ...archivedState,
        tokens: [{ ...archivedState.tokens[0], flowElementExecutionWasInterrupted: true }],
        processId: 'Process1#1677505265559',
        processVersion: undefined,
      },
      expect.any(Function)
    );

    startInstance.mockRestore();
  });

  it('will continue executing an instance that was previously interrupted', async () => {
    distribution.db.getAllProcesses.mockResolvedValue(['Process1']);

    const archivedState = {
      processId: 'Process1',
      processInstanceId: 'Process1-instance1',
      globalStartTime: 1677597235740,
      instanceState: ['READY'],
      tokens: [
        {
          machineHops: 0,
          deciderStorageTime: 0,
          deciderStorageRounds: 0,
          localStartTime: 1677597235740,
          tokenId: 'c1a1922d-2018-419f-9b25-089c85c48ea2',
          state: 'READY',
          currentFlowElementId: 'Task_1y4wd2q',
          previousFlowElementId: 'SequenceFlow_14mwzvq',
          intermediateVariablesState: null,
          localExecutionTime: 5,
        },
      ],
      variables: {},
      log: [
        {
          flowElementId: 'StartEvent_1',
          tokenId: 'c1a1922d-2018-419f-9b25-089c85c48ea2',
          executionState: 'COMPLETED',
          startTime: 1677597235755,
          endTime: 1677597235760,
          machine: {
            id: 'mockId',
            name: 'mockName',
            ip: '192.168.1.3',
            port: 33029,
          },
        },
      ],
      adaptationLog: [],
      processVersion: '1677505265559',
      isCurrentlyExecutedInBpmnEngine: true,
    };

    distribution.db.getArchivedInstances.mockResolvedValue({ instance1: archivedState });

    distribution.db.getProcessVersion.mockResolvedValue(taskBpmn);

    await management.restoreInterruptedInstances();

    const engine = management.getAllEngines()[0];
    const instanceId = engine.instanceIDs[0];

    let instanceState = engine.getInstanceState(instanceId);
    expect(instanceState).toBe('running');

    let instanceInformation = engine.getInstanceInformation(instanceId);

    expect(instanceInformation).toEqual({
      ...archivedState,

      tokens: [
        {
          ...archivedState.tokens[0],
          state: 'READY',
          intermediateVariablesState: {},
          localExecutionTime: expect.any(Number),
          currentFlowElementStartTime: expect.any(Number),
          currentFlowNodeState: 'READY',
          flowElementExecutionWasInterrupted: true,
        },
      ],

      isCurrentlyExecutedInBpmnEngine: undefined,
    });

    await sleep(100);

    instanceState = engine.getInstanceState(instanceId);
    expect(instanceState).toBe('ended');

    instanceInformation = engine.getInstanceInformation(instanceId);
    expect(instanceInformation).toEqual({
      ...archivedState,
      instanceState: ['ENDED'],
      tokens: [
        {
          ...archivedState.tokens[0],
          state: 'ENDED',
          currentFlowElementId: 'EndEvent_02e1jkg',
          currentFlowNodeState: 'COMPLETED',
          previousFlowElementId: 'SequenceFlow_0jfbrh9',
          localExecutionTime: expect.any(Number),
          currentFlowElementStartTime: expect.any(Number),
          localExecutionTime: expect.any(Number),
        },
      ],
      log: [
        ...archivedState.log,
        {
          flowElementId: 'Task_1y4wd2q',
          tokenId: 'c1a1922d-2018-419f-9b25-089c85c48ea2',
          executionState: 'COMPLETED',
          startTime: expect.any(Number),
          endTime: expect.any(Number),
          machine: {
            id: 'mockId',
            name: 'mockName',
            ip: '192.168.1.3',
            port: 33029,
          },
          executionWasInterrupted: true,
        },
        {
          flowElementId: 'EndEvent_02e1jkg',
          tokenId: 'c1a1922d-2018-419f-9b25-089c85c48ea2',
          executionState: 'COMPLETED',
          startTime: expect.any(Number),
          endTime: expect.any(Number),
          machine: {
            id: 'mockId',
            name: 'mockName',
            ip: '192.168.1.3',
            port: 33029,
          },
        },
      ],

      isCurrentlyExecutedInBpmnEngine: undefined,
    });
  });

  it('will restart an activity that was previously running allowing the instance to finish', async () => {
    distribution.db.getAllProcesses.mockResolvedValue(['Process1']);

    const archivedState = {
      processId: 'Process1',
      processInstanceId: 'Process1-instance1',
      globalStartTime: 1677597235740,
      instanceState: ['RUNNING'],
      tokens: [
        {
          machineHops: 0,
          deciderStorageTime: 0,
          deciderStorageRounds: 0,
          localStartTime: 1677597235740,
          tokenId: 'c1a1922d-2018-419f-9b25-089c85c48ea2',
          state: 'RUNNING',
          currentFlowElementId: 'Task_1y4wd2q',
          previousFlowElementId: 'SequenceFlow_14mwzvq',
          intermediateVariablesState: null,
          localExecutionTime: 5,
        },
      ],
      variables: {},
      log: [
        {
          flowElementId: 'StartEvent_1',
          tokenId: 'c1a1922d-2018-419f-9b25-089c85c48ea2',
          executionState: 'COMPLETED',
          startTime: 1677597235755,
          endTime: 1677597235760,
          machine: {
            id: 'mockId',
            name: 'mockName',
            ip: '192.168.1.3',
            port: 33029,
          },
        },
      ],
      adaptationLog: [],
      processVersion: '1677505265559',
      isCurrentlyExecutedInBpmnEngine: true,
    };

    distribution.db.getArchivedInstances.mockResolvedValue({ instance1: archivedState });

    distribution.db.getProcessVersion.mockResolvedValue(taskBpmn);

    await management.restoreInterruptedInstances();

    await sleep(100);

    const engine = management.getAllEngines()[0];
    const instanceId = engine.instanceIDs[0];
    const instanceState = engine.getInstanceState(instanceId);
    expect(instanceState).toBe('ended');
  });

  it('will retrigger the decider for tokens where it was pending a decision if the token can continue locally allowing the instance to finish', async () => {
    distribution.db.getAllProcesses.mockResolvedValue(['Process1']);

    const archivedState = {
      processId: 'Process1',
      processInstanceId: 'Process1-instance1',
      globalStartTime: 1677597235740,
      instanceState: ['DEPLOYMENT-WAITING'],
      tokens: [
        {
          machineHops: 0,
          deciderStorageTime: 0,
          deciderStorageRounds: 0,
          localStartTime: 1677597235740,
          tokenId: 'c1a1922d-2018-419f-9b25-089c85c48ea2',
          state: 'DEPLOYMENT-WAITING',
          currentFlowElementId: 'SequenceFlow_14mwzvq',
          previousFlowElementId: 'StartEvent_1',
          intermediateVariablesState: null,
          localExecutionTime: 5,
        },
      ],
      variables: {},
      log: [
        {
          flowElementId: 'StartEvent_1',
          tokenId: 'c1a1922d-2018-419f-9b25-089c85c48ea2',
          executionState: 'COMPLETED',
          startTime: 1677597235755,
          endTime: 1677597235760,
          machine: {
            id: 'mockId',
            name: 'mockName',
            ip: '192.168.1.3',
            port: 33029,
          },
        },
      ],
      adaptationLog: [],
      processVersion: '1677505265559',
      isCurrentlyExecutedInBpmnEngine: true,
    };

    distribution.db.getArchivedInstances.mockResolvedValue({ instance1: archivedState });

    distribution.db.getProcessVersion.mockResolvedValue(taskBpmn);

    await management.restoreInterruptedInstances();

    await sleep(100);

    expect(mockPassToken).toHaveBeenCalled();

    const engine = management.getAllEngines()[0];
    const instanceId = engine.instanceIDs[0];
    const instanceState = engine.getInstanceState(instanceId);
    expect(instanceState).toBe('ended');
  });

  it('will put a previously pausing instance into the paused state', async () => {
    distribution.db.getAllProcesses.mockResolvedValue(['Process1']);

    const archivedState = {
      processId: 'Process1',
      processInstanceId: 'Process1-instance1',
      globalStartTime: 1678109224940,
      instanceState: ['PAUSING'],
      tokens: [
        {
          machineHops: 0,
          deciderStorageTime: 0,
          deciderStorageRounds: 0,
          localStartTime: 1678109224940,
          currentFlowNodeProgress: { value: 0, manual: false },
          milestones: {},
          tokenId: '9eaa615d-a624-4861-bbde-5eef0df2745f',
          state: 'RUNNING',
          currentFlowElementId: 'Task_1y4wd2q',
          currentFlowNodeState: 'READY',
          currentFlowElementStartTime: 1678109226210,
          previousFlowElementId: 'SequenceFlow_14mwzvq',
          intermediateVariablesState: {},
          localExecutionTime: 6,
        },
      ],
      variables: {},
      log: [
        {
          flowElementId: 'StartEvent_1',
          tokenId: '9eaa615d-a624-4861-bbde-5eef0df2745f',
          executionState: 'COMPLETED',
          startTime: 1678109224956,
          endTime: 1678109224962,
          machine: {
            id: 'mockId',
            name: 'mockName',
            ip: '192.168.1.3',
            port: 33029,
          },
        },
      ],
      adaptationLog: [],
      processVersion: '1678107905166',
      isCurrentlyExecutedInBpmnEngine: true,
    };

    distribution.db.getArchivedInstances.mockResolvedValue({ instance1: archivedState });

    distribution.db.getProcessVersion.mockResolvedValue(taskBpmn);

    await management.restoreInterruptedInstances();

    await sleep(100);

    expect(distribution.db.archiveInstance).toHaveBeenCalledWith('Process1', 'Process1-instance1', {
      ...archivedState,
      instanceState: ['PAUSED'],
      tokens: [
        {
          ...archivedState.tokens[0],
          state: 'PAUSED',
          localExecutionTime: expect.any(Number),
          flowElementExecutionWasInterrupted: true,
        },
      ],
      isCurrentlyExecutedInBpmnEngine: undefined,
    });
  });

  it('will only retrigger tokens that were still running before the intterruption; tokens that already ended their execution are left as they were', async () => {
    distribution.db.getAllProcesses.mockResolvedValue(['Process1']);

    const archivedState = {
      processId: '_13636438-452d-44a9-b1bc-b5e8d8bad8fc',
      processInstanceId:
        '_13636438-452d-44a9-b1bc-b5e8d8bad8fc-1677676738178-330fd69c-b251-4de5-b016-1fd1792906c4',
      globalStartTime: 1677676740527,
      instanceState: ['RUNNING', 'FAILED', 'TERMINATED'],
      tokens: [
        {
          machineHops: 0,
          deciderStorageTime: 0,
          deciderStorageRounds: 0,
          localStartTime: 1677676740528,
          tokenId: 'e195264a-93d7-47a8-bcff-26bb3dc2db0b|1-3-e1ed000f-f49b-4524-983a-1a295ea0c974',
          state: 'RUNNING',
          currentFlowElementId: 'Activity_0jjzsn7',
          currentFlowNodeState: 'READY',
          currentFlowElementStartTime: 1677676740578,
          previousFlowElementId: 'Flow_13rsymi',
          intermediateVariablesState: {},
          localExecutionTime: 3,
        },
        {
          machineHops: 0,
          deciderStorageTime: 0,
          deciderStorageRounds: 0,
          localStartTime: 1677676740528,
          tokenId: 'e195264a-93d7-47a8-bcff-26bb3dc2db0b|2-3-a3679499-2673-4af1-a87b-f87e9a7696fc',
          state: 'FAILED',
          currentFlowElementId: 'Flow_15l0o0p',
          previousFlowElementId: 'Gateway_1lwhjkl',
          intermediateVariablesState: null,
          localExecutionTime: 3,
        },
        {
          machineHops: 0,
          deciderStorageTime: 0,
          deciderStorageRounds: 0,
          localStartTime: 1677676740528,
          tokenId: 'e195264a-93d7-47a8-bcff-26bb3dc2db0b|3-3-bf1f3a78-3b0e-432c-811d-e37dc16c204f',
          state: 'TERMINATED',
          currentFlowElementId: 'Activity_0o4tgs8',
          previousFlowElementId: 'Flow_1cieo5q',
          intermediateVariablesState: null,
          localExecutionTime: 3,
        },
      ],
      variables: {},
      log: [
        {
          flowElementId: 'StartEvent_1mcodvt',
          tokenId: 'e195264a-93d7-47a8-bcff-26bb3dc2db0b',
          executionState: 'COMPLETED',
          startTime: 1677676740539,
          endTime: 1677676740542,
          machine: {
            id: 'mockId',
            name: 'mockName',
            ip: '192.168.1.3',
            port: 33029,
          },
        },
        {
          flowElementId: 'Gateway_1lwhjkl',
          tokenId: 'e195264a-93d7-47a8-bcff-26bb3dc2db0b',
          executionState: 'COMPLETED',
          startTime: 1677676740555,
          endTime: 1677676740557,
          machine: {
            id: 'mockId',
            name: 'mockName',
            ip: '192.168.1.3',
            port: 33029,
          },
        },
      ],
      adaptationLog: [],
      processVersion: '1677676738178',
      isCurrentlyExecutedInBpmnEngine: true,
    };

    distribution.db.getArchivedInstances.mockResolvedValue({ instance1: archivedState });

    distribution.db.getProcessVersion.mockResolvedValue(parallelBpmn);

    await management.restoreInterruptedInstances();

    await sleep(100);

    const engine = management.getAllEngines()[0];
    const instanceId = engine.instanceIDs[0];
    const instanceState = engine.getInstanceState(instanceId);
    expect(instanceState).toBe('ended');

    const instanceInformation = engine.getInstanceInformation(instanceId);
    expect(instanceInformation.instanceState).toEqual(['ENDED', 'FAILED', 'TERMINATED']);
  });

  it('will put an interrupted element into an error state if it has the manualInterruptionHandling flag', async () => {
    distribution.db.getAllProcesses.mockResolvedValue(['Process1']);

    const archivedState = {
      processId: 'Process1',
      processInstanceId: 'Process1-instance1',
      globalStartTime: 1677597235740,
      instanceState: ['RUNNING'],
      tokens: [
        {
          machineHops: 0,
          deciderStorageTime: 0,
          deciderStorageRounds: 0,
          localStartTime: 1677597235740,
          tokenId: 'c1a1922d-2018-419f-9b25-089c85c48ea2',
          state: 'RUNNING',
          currentFlowElementId: 'Task_1y4wd2q',
          previousFlowElementId: 'SequenceFlow_14mwzvq',
          intermediateVariablesState: null,
          localExecutionTime: 5,
        },
      ],
      variables: {},
      log: [
        {
          flowElementId: 'StartEvent_1',
          tokenId: 'c1a1922d-2018-419f-9b25-089c85c48ea2',
          executionState: 'COMPLETED',
          startTime: 1677597235755,
          endTime: 1677597235760,
          machine: {
            id: 'mockId',
            name: 'mockName',
            ip: '192.168.1.3',
            port: 33029,
          },
        },
      ],
      adaptationLog: [],
      processVersion: '1677505265559',
      isCurrentlyExecutedInBpmnEngine: true,
    };

    distribution.db.getArchivedInstances.mockResolvedValue({ instance1: archivedState });

    distribution.db.getProcessVersion.mockResolvedValue(manualInterruptionHandlingBpmn);

    await management.restoreInterruptedInstances();

    await sleep(100);

    const engine = management.getAllEngines()[0];
    const instanceId = engine.instanceIDs[0];

    const instanceInformation = engine.getInstanceInformation(instanceId);
    expect(instanceInformation.instanceState).toEqual(['ERROR-INTERRUPTED']);
    expect(instanceInformation).toEqual({
      ...archivedState,
      instanceState: ['ERROR-INTERRUPTED'],
      tokens: [
        {
          ...archivedState.tokens[0],
          state: 'ERROR-INTERRUPTED',
          currentFlowNodeState: 'ERROR-INTERRUPTED',
          intermediateVariablesState: {},
          localExecutionTime: expect.any(Number),
          flowElementExecutionWasInterrupted: true,
          currentFlowElementStartTime: expect.any(Number),
        },
      ],
      isCurrentlyExecutedInBpmnEngine: undefined,
    });

    const instanceState = engine.getInstanceState(instanceId);
    expect(instanceState).toBe('running');
  });

  it('will continue executing the contents of a subprocess without restarting the subprocess itself', async () => {
    distribution.db.getAllProcesses.mockResolvedValue(['Process1']);

    const archivedState = {
      processId: 'Process1',
      processInstanceId: 'Process1-instance1',
      globalStartTime: 1678112173919,
      instanceState: ['RUNNING'],
      tokens: [
        {
          machineHops: 0,
          deciderStorageTime: 0,
          deciderStorageRounds: 0,
          localStartTime: 1678112173919,
          tokenId: '6aad16be-0d9d-48e3-8014-7fa1fe2b8f5d',
          state: 'RUNNING',
          currentFlowElementId: 'Activity_116klim',
          currentFlowNodeState: 'ACTIVE',
          currentFlowElementStartTime: 1678112173953,
          previousFlowElementId: 'Flow_1q1qn9y',
          intermediateVariablesState: {},
          localExecutionTime: 5,
        },
        {
          machineHops: 0,
          deciderStorageTime: 0,
          deciderStorageRounds: 0,
          localStartTime: 1678112173919,
          tokenId: '6aad16be-0d9d-48e3-8014-7fa1fe2b8f5d#f4a5356a-2df3-461a-969d-11330a63dfda',
          state: 'RUNNING',
          currentFlowElementId: 'Activity_0ne9y7m',
          currentFlowNodeState: 'READY',
          currentFlowElementStartTime: 1678112173981,
          previousFlowElementId: 'Flow_0z65t3n',
          intermediateVariablesState: {},
          localExecutionTime: 13,
        },
      ],
      variables: {},
      log: [
        {
          flowElementId: 'StartEvent_1pripzt',
          tokenId: '6aad16be-0d9d-48e3-8014-7fa1fe2b8f5d',
          executionState: 'COMPLETED',
          startTime: 1678112173932,
          endTime: 1678112173937,
          machine: {
            id: 'mockId',
            name: 'mockName',
            ip: '192.168.1.3',
            port: 33029,
          },
        },
        {
          flowElementId: 'Event_04si2rz',
          tokenId: '6aad16be-0d9d-48e3-8014-7fa1fe2b8f5d#f4a5356a-2df3-461a-969d-11330a63dfda',
          executionState: 'COMPLETED',
          startTime: 1678112173953,
          endTime: 1678112173961,
          machine: {
            id: 'mockId',
            name: 'mockName',
            ip: '192.168.1.3',
            port: 33029,
          },
        },
      ],
      adaptationLog: [],
      processVersion: '1678112170075',
      isCurrentlyExecutedInBpmnEngine: true,
    };

    distribution.db.getArchivedInstances.mockResolvedValue({ instance1: archivedState });

    distribution.db.getProcessVersion.mockResolvedValue(subprocessBpmn);

    await management.restoreInterruptedInstances();

    await sleep(100);

    const engine = management.getAllEngines()[0];
    const instanceId = engine.instanceIDs[0];

    const instanceInformation = engine.getInstanceInformation(instanceId);
    expect(instanceInformation.tokens.length).toBe(2);

    const instanceState = engine.getInstanceState(instanceId);
    expect(instanceState).toBe('ended');
  });

  it('will put all children of an interrupted subprocess with the manualInterruptionHandling flag into an error state', async () => {
    distribution.db.getAllProcesses.mockResolvedValue(['Process1']);

    const archivedState = {
      processId: 'Process1',
      processInstanceId: 'Process1-instance1',
      globalStartTime: 1678112173919,
      instanceState: ['RUNNING'],
      tokens: [
        {
          machineHops: 0,
          deciderStorageTime: 0,
          deciderStorageRounds: 0,
          localStartTime: 1678112173919,
          tokenId: '6aad16be-0d9d-48e3-8014-7fa1fe2b8f5d',
          state: 'RUNNING',
          currentFlowElementId: 'Activity_116klim',
          currentFlowNodeState: 'ACTIVE',
          currentFlowElementStartTime: 1678112173953,
          previousFlowElementId: 'Flow_1q1qn9y',
          intermediateVariablesState: {},
          localExecutionTime: 5,
        },
        {
          machineHops: 0,
          deciderStorageTime: 0,
          deciderStorageRounds: 0,
          localStartTime: 1678112173919,
          tokenId: '6aad16be-0d9d-48e3-8014-7fa1fe2b8f5d#f4a5356a-2df3-461a-969d-11330a63dfda',
          state: 'RUNNING',
          currentFlowElementId: 'Activity_0ne9y7m',
          currentFlowNodeState: 'READY',
          currentFlowElementStartTime: 1678112173981,
          previousFlowElementId: 'Flow_0z65t3n',
          intermediateVariablesState: {},
          localExecutionTime: 13,
        },
      ],
      variables: {},
      log: [
        {
          flowElementId: 'StartEvent_1pripzt',
          tokenId: '6aad16be-0d9d-48e3-8014-7fa1fe2b8f5d',
          executionState: 'COMPLETED',
          startTime: 1678112173932,
          endTime: 1678112173937,
          machine: {
            id: 'mockId',
            name: 'mockName',
            ip: '192.168.1.3',
            port: 33029,
          },
        },
        {
          flowElementId: 'Event_04si2rz',
          tokenId: '6aad16be-0d9d-48e3-8014-7fa1fe2b8f5d#f4a5356a-2df3-461a-969d-11330a63dfda',
          executionState: 'COMPLETED',
          startTime: 1678112173953,
          endTime: 1678112173961,
          machine: {
            id: 'mockId',
            name: 'mockName',
            ip: '192.168.1.3',
            port: 33029,
          },
        },
      ],
      adaptationLog: [],
      processVersion: '1678112170075',
      isCurrentlyExecutedInBpmnEngine: true,
    };

    distribution.db.getArchivedInstances.mockResolvedValue({ instance1: archivedState });

    distribution.db.getProcessVersion.mockResolvedValue(manualSubprocessInterruptionHandlingBpmn);

    await management.restoreInterruptedInstances();

    await sleep(100);

    const engine = management.getAllEngines()[0];
    const instanceId = engine.instanceIDs[0];

    const instanceInformation = engine.getInstanceInformation(instanceId);
    expect(instanceInformation).toEqual({
      ...archivedState,
      instanceState: ['ERROR-INTERRUPTED'],
      tokens: [
        {
          ...archivedState.tokens[0],
          state: 'ERROR-INTERRUPTED',
          currentFlowNodeState: 'ERROR-INTERRUPTED',
          flowElementExecutionWasInterrupted: true,
        },
        {
          ...archivedState.tokens[1],
          state: 'ERROR-INTERRUPTED',
          currentFlowNodeState: 'ERROR-INTERRUPTED',
          flowElementExecutionWasInterrupted: true,
        },
      ],
      isCurrentlyExecutedInBpmnEngine: undefined,
    });

    const instanceState = engine.getInstanceState(instanceId);
    // we currently consider the instance as being in a running state awaiting error handling from the user
    expect(instanceState).toBe('running');
  });

  it('will continue executing a call-activity without reinvoking the call-activity element in the calling instance', async () => {
    distribution.db.getAllProcesses.mockResolvedValue(['Process1', 'Process2']);

    const archivedImporterState = {
      processId: 'Process1',
      processInstanceId: 'Process1_instance1',
      globalStartTime: 1678113974602,
      instanceState: ['RUNNING'],
      tokens: [
        {
          machineHops: 0,
          deciderStorageTime: 0,
          deciderStorageRounds: 0,
          localStartTime: 1678113974602,
          calledInstance: 'Process2_instance1',
          tokenId: '769ff134-2e7c-4646-acec-4b63a27be1ca',
          state: 'RUNNING',
          currentFlowElementId: 'Activity_0bcvgz5',
          currentFlowNodeState: 'ACTIVE',
          currentFlowElementStartTime: 1678113974636,
          previousFlowElementId: 'Flow_0xrwj67',
          intermediateVariablesState: {},
          localExecutionTime: 5,
        },
      ],
      variables: {},
      log: [
        {
          flowElementId: 'StartEvent_1bprzcx',
          tokenId: '769ff134-2e7c-4646-acec-4b63a27be1ca',
          executionState: 'COMPLETED',
          startTime: 1678113974615,
          endTime: 1678113974620,
          machine: {
            id: 'mockId',
            name: 'mockName',
            ip: '192.168.1.3',
            port: 33029,
          },
        },
      ],
      adaptationLog: [],
      processVersion: '1678113954667',
      isCurrentlyExecutedInBpmnEngine: true,
    };

    const archivedImportState = {
      processId: 'Process2',
      processInstanceId: 'Process2_instance1',
      globalStartTime: 1678113974679,
      instanceState: ['RUNNING'],
      tokens: [
        {
          machineHops: 0,
          deciderStorageTime: 0,
          deciderStorageRounds: 0,
          localStartTime: 1678113974679,
          currentFlowNodeProgress: { value: 0, manual: false },
          milestones: {},
          tokenId: 'a5a97a63-8b1d-404f-afd3-548f2e5a4867',
          state: 'RUNNING',
          currentFlowElementId: 'Activity_1eakizd',
          currentFlowNodeState: 'READY',
          currentFlowElementStartTime: 1678113974704,
          previousFlowElementId: 'Flow_1o1yusn',
          intermediateVariablesState: {},
          localExecutionTime: 10,
        },
      ],
      variables: {},
      log: [
        {
          flowElementId: 'StartEvent_0ja864u',
          tokenId: 'a5a97a63-8b1d-404f-afd3-548f2e5a4867',
          executionState: 'COMPLETED',
          startTime: 1678113974686,
          endTime: 1678113974696,
          machine: {
            id: 'mockId',
            name: 'mockName',
            ip: '192.168.1.3',
            port: 33029,
          },
        },
      ],
      adaptationLog: [],
      processVersion: '1678113930181',
      callingInstance: 'Process1_instance1',
      isCurrentlyExecutedInBpmnEngine: true,
    };

    distribution.db.getArchivedInstances.mockImplementation(async (processName) => {
      if (processName === 'Process1') return { instance1: archivedImporterState };
      else return { instance1: archivedImportState };
    });

    distribution.db.getProcessVersion.mockImplementation(async (processName) => {
      if (processName === 'Process1') return importerBpmn;
      else return importBpmn;
    });

    await management.restoreInterruptedInstances();

    await sleep(100);

    const engines = management.getAllEngines();
    expect(engines.length).toBe(2);

    for (let engine of engines) {
      // the engine should not have created a second called instance for the call activity
      expect(engine.instanceIDs.length).toBe(1);
      const instanceId = engine.instanceIDs[0];

      const instanceState = engine.getInstanceState(instanceId);
      expect(instanceState).toBe('ended');
    }
  });

  // TODO: handle call-activities that have manualInterruptionHandling (put the called instance into a paused state?)
  it('will put a call-activity with the manualInterruptionHandling attribute into an error state pausing the called instance', async () => {
    distribution.db.getAllProcesses.mockResolvedValue(['Process1', 'Process2']);

    const archivedImporterState = {
      processId: 'Process1',
      processInstanceId: 'Process1_instance1',
      globalStartTime: 1678113974602,
      instanceState: ['RUNNING'],
      tokens: [
        {
          machineHops: 0,
          deciderStorageTime: 0,
          deciderStorageRounds: 0,
          localStartTime: 1678113974602,
          calledInstance: 'Process2_instance1',
          tokenId: '769ff134-2e7c-4646-acec-4b63a27be1ca',
          state: 'RUNNING',
          currentFlowElementId: 'Activity_0bcvgz5',
          currentFlowNodeState: 'ACTIVE',
          currentFlowElementStartTime: 1678113974636,
          previousFlowElementId: 'Flow_0xrwj67',
          intermediateVariablesState: {},
          localExecutionTime: 5,
        },
      ],
      variables: {},
      log: [
        {
          flowElementId: 'StartEvent_1bprzcx',
          tokenId: '769ff134-2e7c-4646-acec-4b63a27be1ca',
          executionState: 'COMPLETED',
          startTime: 1678113974615,
          endTime: 1678113974620,
          machine: {
            id: 'mockId',
            name: 'mockName',
            ip: '192.168.1.3',
            port: 33029,
          },
        },
      ],
      adaptationLog: [],
      processVersion: '1678113954667',
      isCurrentlyExecutedInBpmnEngine: true,
    };

    const archivedImportState = {
      processId: 'Process2',
      processInstanceId: 'Process2_instance1',
      globalStartTime: 1678113974679,
      instanceState: ['RUNNING'],
      tokens: [
        {
          machineHops: 0,
          deciderStorageTime: 0,
          deciderStorageRounds: 0,
          localStartTime: 1678113974679,
          currentFlowNodeProgress: { value: 0, manual: false },
          milestones: {},
          tokenId: 'a5a97a63-8b1d-404f-afd3-548f2e5a4867',
          state: 'RUNNING',
          currentFlowElementId: 'Activity_1eakizd',
          currentFlowNodeState: 'READY',
          currentFlowElementStartTime: 1678113974704,
          previousFlowElementId: 'Flow_1o1yusn',
          intermediateVariablesState: {},
          localExecutionTime: 10,
        },
      ],
      variables: {},
      log: [
        {
          flowElementId: 'StartEvent_0ja864u',
          tokenId: 'a5a97a63-8b1d-404f-afd3-548f2e5a4867',
          executionState: 'COMPLETED',
          startTime: 1678113974686,
          endTime: 1678113974696,
          machine: {
            id: 'mockId',
            name: 'mockName',
            ip: '192.168.1.3',
            port: 33029,
          },
        },
      ],
      adaptationLog: [],
      processVersion: '1678113930181',
      callingInstance: 'Process1_instance1',
      isCurrentlyExecutedInBpmnEngine: true,
    };

    distribution.db.getArchivedInstances.mockImplementation(async (processName) => {
      if (processName === 'Process1') return { instance1: archivedImporterState };
      else return { instance1: archivedImportState };
    });

    distribution.db.getProcessVersion.mockImplementation(async (processName) => {
      if (processName === 'Process1') return manualCallActivityInterruptionHandlingBpmn;
      else return importBpmn;
    });

    await management.restoreInterruptedInstances();

    await sleep(100);

    const importerEngine = management.getEngineWithID('Process1_instance1');
    expect(importerEngine.getInstanceState('Process1_instance1')).toBe('running');
    expect(importerEngine.getInstanceInformation('Process1_instance1')).toEqual({
      ...archivedImporterState,
      instanceState: ['ERROR-INTERRUPTED'],
      tokens: [
        {
          ...archivedImporterState.tokens[0],
          state: 'ERROR-INTERRUPTED',
          currentFlowNodeState: 'ERROR-INTERRUPTED',
          flowElementExecutionWasInterrupted: true,
        },
      ],
      isCurrentlyExecutedInBpmnEngine: undefined,
    });

    expect(distribution.db.archiveInstance).toHaveBeenCalledWith('Process2', 'Process2_instance1', {
      ...archivedImportState,
      instanceState: ['PAUSED'],
      tokens: [
        {
          ...archivedImportState.tokens[0],
          state: 'PAUSED',
          flowElementExecutionWasInterrupted: true,
        },
      ],
      isCurrentlyExecutedInBpmnEngine: undefined,
    });
  });

  it('will reactivate tokens that already arrived at a gateway allowing them to be merged when the remaining tokens arrive', async () => {
    distribution.db.getAllProcesses.mockResolvedValue(['Process1']);

    const archivedState = {
      processId: 'Process1',
      processInstanceId: 'Process1_instance1',
      globalStartTime: 1678193052889,
      instanceState: ['RUNNING', 'READY'],
      tokens: [
        {
          machineHops: 0,
          deciderStorageTime: 0,
          deciderStorageRounds: 0,
          localStartTime: 1678193052890,
          tokenId: '4ebf6b8b-02d1-410c-8d31-0cd2132afafe|1-2-6d698a45-57d5-44b7-9752-d27eeed41c0f',
          state: 'RUNNING',
          currentFlowElementId: 'Activity_1hcy6jj',
          currentFlowNodeState: 'READY',
          currentFlowElementStartTime: 1678193052970,
          previousFlowElementId: 'Flow_1wuudkw',
          intermediateVariablesState: {},
          localExecutionTime: 6,
        },
        {
          machineHops: 0,
          deciderStorageTime: 0,
          deciderStorageRounds: 0,
          localStartTime: 1678193052890,
          tokenId: '4ebf6b8b-02d1-410c-8d31-0cd2132afafe|2-2-ce4b267a-7209-45db-84f1-bcd92d900d62',
          state: 'READY',
          currentFlowElementId: 'Gateway_19fi5zi',
          currentFlowNodeState: 'ACTIVE',
          currentFlowElementStartTime: 1678193052996,
          previousFlowElementId: 'Flow_0l0qebs',
          intermediateVariablesState: {},
          localExecutionTime: 9,
        },
      ],
      variables: {},
      log: [
        {
          flowElementId: 'StartEvent_1xsfkzx',
          tokenId: '4ebf6b8b-02d1-410c-8d31-0cd2132afafe',
          executionState: 'COMPLETED',
          startTime: 1678193052907,
          endTime: 1678193052913,
          machine: {
            id: 'mockId',
            name: 'mockName',
            ip: '192.168.1.3',
            port: 33029,
          },
        },
        {
          flowElementId: 'Gateway_02w5btg',
          tokenId: '4ebf6b8b-02d1-410c-8d31-0cd2132afafe',
          executionState: 'COMPLETED',
          startTime: 1678193052936,
          endTime: 1678193052940,
          machine: {
            id: 'mockId',
            name: 'mockName',
            ip: '192.168.1.3',
            port: 33029,
          },
        },
        {
          flowElementId: 'Activity_1cv3nun',
          tokenId: '4ebf6b8b-02d1-410c-8d31-0cd2132afafe|2-2-ce4b267a-7209-45db-84f1-bcd92d900d62',
          executionState: 'COMPLETED',
          startTime: 1678193052978,
          endTime: 1678193052981,
          machine: {
            id: 'mockId',
            name: 'mockName',
            ip: '192.168.1.3',
            port: 33029,
          },
        },
      ],
      adaptationLog: [],
      processVersion: '1678193019512',
      isCurrentlyExecutedInBpmnEngine: true,
    };
    distribution.db.getArchivedInstances.mockResolvedValue({ instance1: archivedState });

    distribution.db.getProcessVersion.mockResolvedValue(parallelMergeBpmn);

    await management.restoreInterruptedInstances();

    await sleep(100);

    const engine = management.getAllEngines()[0];
    const instanceId = engine.instanceIDs[0];
    const instanceState = engine.getInstanceState(instanceId);
    expect(instanceState).toBe('ended');
  });
});
