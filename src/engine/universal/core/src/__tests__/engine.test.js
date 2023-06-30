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

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

describe('ProceedEngine', () => {
  let engine;
  let resolver;
  let hasEnded;

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
    hasEnded = new Promise((resolve) => (resolver = resolve));

    jest.clearAllMocks();
  });

  // This should allow engines to finish all execution before the test ends
  // Hotfix for the "A worker process has failed to exit gracefully [...]" warning from jest
  afterAll(async () => {
    await sleep(100);
  });

  it('calls given callbacks for executed process', async () => {
    distribution.db.getProcessVersion.mockResolvedValueOnce(scriptTaskBPMN);

    await engine.deployProcessVersion(0, 123);
    engine.startProcessVersion(123, {}, onStarted, onEnded, onTokenEnded);

    await sleep(1000);

    expect(onStarted).toHaveBeenCalled();
    expect(onTokenEnded).toHaveBeenCalledTimes(1);
    expect(onEnded).toHaveBeenCalled();
  });

  it('contains added information from proceed in token and logs for executed process', async () => {
    distribution.db.getProcessVersion.mockResolvedValueOnce(scriptTaskBPMN);

    await engine.deployProcessVersion(0, 123);
    engine.startProcessVersion(123, {}, onStarted, onEnded, onTokenEnded);

    await hasEnded;

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

    let onEnded1;
    const hasEnded1 = new Promise((resolve) => (onEnded1 = resolve));

    await engine.deployProcessVersion(0, 123);
    engine.startProcessVersion(123, {}, onStarted, onEnded1);
    expect(engine.instanceIDs.length).toBe(1);

    await hasEnded1;

    let onEnded2;
    const hasEnded2 = new Promise((resolve) => (onEnded2 = resolve));

    expect(() => {
      engine.startProcessVersion(123, {}, onStarted, onEnded2);
    }).not.toThrow();
    expect(engine.instanceIDs.length).toBe(2);

    await hasEnded2;
  });

  it('allows the creation of multiple instances of different process versions inside the same engine instance', async () => {
    distribution.db.getProcessVersion.mockResolvedValueOnce(taskBPMN);

    let onEnded1;
    const hasEnded1 = new Promise((resolve) => (onEnded1 = resolve));

    await engine.deployProcessVersion(0, 123);
    const onStarted1 = jest.fn();
    engine.startProcessVersion(123, {}, onStarted1, onEnded1);
    expect(engine.instanceIDs.length).toBe(1);

    await hasEnded1;

    distribution.db.getProcessVersion.mockResolvedValueOnce(taskBPMN);

    let onEnded2;
    const hasEnded2 = new Promise((resolve) => (onEnded2 = resolve));

    await engine.deployProcessVersion(0, 456);
    const onStarted2 = jest.fn();
    engine.startProcessVersion(456, {}, onStarted2, onEnded2);
    expect(engine.instanceIDs.length).toBe(2);

    await hasEnded2;

    expect(engine.instanceIDs.length).toBe(2);

    expect(Object.keys(engine._versionProcessMapping)).toEqual(['123', '456']);

    expect(onStarted1).toHaveBeenCalledTimes(1);
    expect(onStarted2).toHaveBeenCalledTimes(1);
  });

  it('calls given network-service in a script task', async () => {
    distribution.db.getProcessVersion.mockResolvedValueOnce(scriptTaskBPMN);

    await engine.deployProcessVersion(0, 123);
    engine.startProcessVersion(123, {}, onStarted, onEnded);

    await hasEnded;

    expect(System.http.request).toHaveBeenCalledWith('https://example.org/123', { method: 'GET' });
  });

  it('updates intermediateVariablesState on a userTask', async () => {
    distribution.db.getProcessVersion.mockResolvedValueOnce(userTaskBPMN);
    const userTaskID = 'Task_1y4wd2q';

    await engine.deployProcessVersion(0, 123);
    engine.startProcessVersion(123, {}, onStarted, onEnded);

    await sleep(500);

    const { userTasks } = engine;
    expect(userTasks.length).toBe(1);
    expect(userTasks[0].id).toBe(userTaskID);

    // Signal user input
    const instanceID = engine.userTasks[0].processInstance.id;
    engine.updateIntermediateVariablesState(instanceID, userTaskID, { a: 2 });

    await sleep(50);

    const instanceInformation = engine.getInstanceInformation(instanceID);
    expect(instanceInformation.tokens[0].intermediateVariablesState).toStrictEqual({ a: 2 });
    expect(instanceInformation.variables).toStrictEqual({});

    await engine.stopInstance(engine.instanceIDs[0]);
  });

  it('takes variables input on a userTask', async () => {
    distribution.db.getProcessVersion.mockResolvedValueOnce(userTaskBPMN);

    await engine.deployProcessVersion(0, 123);
    engine.startProcessVersion(123, {}, onStarted, onEnded);

    await sleep(500);

    const { userTasks } = engine;
    expect(userTasks.length).toBe(1);
    expect(userTasks[0].id).toBe('Task_1y4wd2q');

    // Signal user input
    const instanceID = engine.userTasks[0].processInstance.id;
    engine.completeUserTask(instanceID, 'Task_1y4wd2q', { a: 2 });

    await hasEnded;

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

    await sleep(500);

    await engine.stopInstance(engine.instanceIDs[0]);

    expect(distribution.db.archiveInstance.mock.calls[0][2].instanceState).toStrictEqual([
      'STOPPED',
    ]);
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
    engine.startProcessVersion(123, {}, instance, onStarted, onEnded);

    await hasEnded;

    expect(engine.instanceIDs).toStrictEqual(['0-123']);
  });
});
