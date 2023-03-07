const fs = require('fs');
const path = require('path');

jest.mock('@proceed/machine', () => {
  const getLogger = jest.fn();
  getLogger.mockReturnValue({
    trace: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
    log: jest.fn(),
  });

  return {
    logging: { getLogger },
    information: {
      getMachineInformation: jest.fn().mockResolvedValue({ id: 'mockId', name: 'mockName' }),
    },
  };
});
jest.mock('@proceed/system', () => {
  // Keep references in factory scope so we always return the same objects. This
  // is the equivalent to returning singletons in the @proceed/data methods.
  const http = {
    request: jest.fn(),
  };
  const discovery = {
    discover: jest.fn(),
  };
  const console = {
    log: jest.fn(),
  };
  const config = {
    getConfig: jest.fn(),
  };
  const capability = {};
  const machine = {
    getMachineInfo: jest.fn(),
  };

  const timer = {
    clearTimeout: jest.fn().mockImplementation((...args) => clearTimeout(...args)),
    setTimeout: jest.fn().mockImplementation((...args) => setTimeout(...args)),
  };

  return {
    http,
    console,
    config,
    capability,
    device: machine,
    discovery,
    timer,
  };
});
jest.mock('@proceed/capabilities');
jest.mock('@proceed/distribution');

const System = require('@proceed/system');
const distribution = require('@proceed/distribution');
const ProceedEngine = require('../engine/engine.js');

const scriptTaskBPMN = fs.readFileSync(path.resolve(__dirname, 'bpmn', 'scriptTask.bpmn'), 'utf-8');

const userTaskBPMN = fs.readFileSync(path.resolve(__dirname, 'bpmn', 'userTask.bpmn'), 'utf-8');

const taskBPMN = fs.readFileSync(path.resolve(__dirname, 'bpmn', 'task.bpmn'), 'utf-8');

describe('ProceedEngine', () => {
  let engine;
  let resolver;
  let flushPromise;
  const onStarted = jest.fn();
  const onTokenEnded = jest.fn();
  const onEnded = jest.fn().mockImplementation(() => resolver());
  distribution.db.isProcessVersionValid.mockResolvedValue(true);
  distribution.communication.getAvailableMachines.mockReturnValue([
    { ip: '192.168.1.1', id: 'mockId' },
  ]);

  beforeEach(() => {
    engine = new ProceedEngine();
    distribution.db.getProcess.mockReset();
    flushPromise = new Promise((resolve) => {
      resolver = resolve;
      setTimeout(resolve, 1000);
    });

    jest.clearAllMocks();
  });

  it('calls given callbacks for executed process', async () => {
    distribution.db.getProcessVersion.mockResolvedValueOnce(scriptTaskBPMN);

    await engine.deployProcessVersion(0, 123);
    engine.startProcessVersion(123, {}, onStarted, onEnded, onTokenEnded);
    await flushPromise;

    expect(onStarted).toHaveBeenCalled();
    expect(onTokenEnded).toHaveBeenCalledTimes(1);
    expect(onEnded).toHaveBeenCalled();
  });

  it('contains added information from proceed in token and logs for executed process', async () => {
    distribution.db.getProcessVersion.mockResolvedValueOnce(scriptTaskBPMN);

    await engine.deployProcessVersion(0, 123);
    engine.startProcessVersion(123, {}, onStarted, onEnded, onTokenEnded);
    await flushPromise;

    const instanceInformation = engine.getInstanceInformation(engine.instanceIDs[0]);

    // state of process
    expect(instanceInformation.instanceState).toEqual(['ENDED']);

    // state of token
    expect(instanceInformation.tokens).toEqual([
      {
        tokenId: expect.any(String),
        state: 'ENDED',
        intermediateVariablesState: null,
        localStartTime: expect.any(Number),
        localExecutionTime: expect.any(Number),
        currentFlowElementId: 'EndEvent_02e1jkg',
        currentFlowNodeState: 'COMPLETED',
        currentFlowElementStartTime: expect.any(Number),
        previousFlowElementId: 'SequenceFlow_0jfbrh9',
        machineHops: 0,
        deciderStorageRounds: 0,
        deciderStorageTime: 0,
      },
    ]);

    // every execution of process
    expect(instanceInformation.log).toEqual([
      {
        flowElementId: 'StartEvent_1',
        tokenId: expect.any(String),
        executionState: 'COMPLETED',
        startTime: expect.any(Number),
        endTime: expect.any(Number),
        machine: expect.objectContaining({
          id: expect.any(String),
          ip: expect.any(String),
          name: expect.any(String),
        }),
      },
      {
        flowElementId: 'Task_1y4wd2q',
        tokenId: expect.any(String),
        executionState: 'COMPLETED',
        startTime: expect.any(Number),
        endTime: expect.any(Number),
        machine: expect.objectContaining({
          id: expect.any(String),
          ip: expect.any(String),
          name: expect.any(String),
        }),
        progress: { value: 100, manual: false },
      },
      {
        flowElementId: 'EndEvent_02e1jkg',
        tokenId: expect.any(String),
        executionState: 'COMPLETED',
        startTime: expect.any(Number),
        endTime: expect.any(Number),
        machine: expect.objectContaining({
          id: expect.any(String),
          ip: expect.any(String),
          name: expect.any(String),
        }),
      },
    ]);
  });

  it('allows the creation of multiple instances of the same process version inside the same engine instance', async () => {
    distribution.db.getProcessVersion.mockResolvedValueOnce(scriptTaskBPMN);

    await engine.deployProcessVersion(0, 123);
    engine.startProcessVersion(123, {}, onStarted, onEnded);
    expect(engine.instanceIDs.length).toBe(1);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    expect(() => {
      engine.startProcessVersion(123, {}, onStarted, onEnded);
    }).not.toThrow();
    expect(engine.instanceIDs.length).toBe(2);

    await flushPromise;
  });

  it('allows the creation of multiple instances of different process versions inside the same engine instance', async () => {
    distribution.db.getProcessVersion.mockResolvedValueOnce(taskBPMN);

    await engine.deployProcessVersion(0, 123);
    const onStarted1 = jest.fn(),
      onEnded1 = jest.fn();
    engine.startProcessVersion(123, {}, onStarted1, onEnded1);
    expect(engine.instanceIDs.length).toBe(1);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    distribution.db.getProcessVersion.mockResolvedValueOnce(taskBPMN);

    await engine.deployProcessVersion(0, 456);
    const onStarted2 = jest.fn(),
      onEnded2 = jest.fn();
    engine.startProcessVersion(456, {}, onStarted2, onEnded2);
    expect(engine.instanceIDs.length).toBe(2);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    expect(engine.instanceIDs.length).toBe(2);

    expect(Object.keys(engine._versionProcessMapping)).toEqual(['123', '456']);

    expect(onStarted1).toHaveBeenCalledTimes(1);
    expect(onEnded1).toHaveBeenCalledTimes(1);
    expect(onStarted2).toHaveBeenCalledTimes(1);
    expect(onEnded2).toHaveBeenCalledTimes(1);
  });

  it('calls given network-service in a script task', async () => {
    distribution.db.getProcessVersion.mockResolvedValueOnce(scriptTaskBPMN);

    await engine.deployProcessVersion(0, 123);
    engine.startProcessVersion(123, {}, onStarted, onEnded);
    await flushPromise;
    await new Promise((resolve) => setTimeout(resolve, 1000));

    expect(System.http.request).toHaveBeenCalledWith('https://example.org/123', { method: 'GET' });
  });

  it('updates intermediateVariablesState on a userTask', async () => {
    distribution.db.getProcessVersion.mockResolvedValueOnce(userTaskBPMN);
    const userTaskID = 'Task_1y4wd2q';

    await engine.deployProcessVersion(0, 123);
    engine.startProcessVersion(123, {}, onStarted, onEnded);
    await flushPromise;

    const { userTasks } = engine;
    expect(userTasks.length).toBe(1);
    expect(userTasks[0].id).toBe(userTaskID);

    // Signal user input
    const instanceID = engine.userTasks[0].processInstance.id;
    engine.updateIntermediateVariablesState(instanceID, userTaskID, { a: 2 });

    const instanceInformation = engine.getInstanceInformation(instanceID);
    expect(instanceInformation.tokens[0].intermediateVariablesState).toStrictEqual({ a: 2 });
    expect(instanceInformation.variables).toStrictEqual({});
  });

  it('takes variables input on a userTask', async () => {
    distribution.db.getProcessVersion.mockResolvedValueOnce(userTaskBPMN);

    await engine.deployProcessVersion(0, 123);
    engine.startProcessVersion(123, {}, onStarted, onEnded);
    await flushPromise;

    const { userTasks } = engine;
    expect(userTasks.length).toBe(1);
    expect(userTasks[0].id).toBe('Task_1y4wd2q');

    // Signal user input
    const instanceID = engine.userTasks[0].processInstance.id;
    engine.completeUserTask(instanceID, 'Task_1y4wd2q', { a: 2 });

    const instanceInformation = engine.getInstanceInformation(instanceID);
    expect(instanceInformation.variables).toStrictEqual({
      a: {
        value: 2,
        log: [
          {
            changedBy: 'Task_1y4wd2q',
            changedTime: expect.any(Number),
          },
        ],
      },
    });
  });

  it('can be stopped through api function', async () => {
    distribution.db.getProcessVersion.mockResolvedValueOnce(userTaskBPMN);
    await engine.deployProcessVersion(0, 123);
    engine.startProcessVersion(123, {}, onStarted, onEnded);
    await flushPromise;

    engine.stopInstance(engine.instanceIDs[0]);
    const instanceInformation = engine.getInstanceInformation(engine.instanceIDs[0]);
    expect(instanceInformation.instanceState).toEqual(['STOPPED']);
  });

  it('can be started somewhere inside the process flow using an instance', async () => {
    distribution.db.getProcessVersion.mockResolvedValueOnce(scriptTaskBPMN);

    const instance = {
      processId: '0',
      processInstanceId: '0-123',
      tokens: [
        {
          tokenId: 'a',
          currentFlowElementId: 'Task_1y4wd2q',
        },
      ],
      variables: {},
      log: [],
    };

    await engine.deployProcessVersion(0, 123);
    engine.startProcessVersion(123, {}, instance, undefined, onEnded);
    await flushPromise;

    expect(onEnded).toHaveBeenCalled();
    expect(engine.instanceIDs).toStrictEqual(['0-123']);
  });
});
