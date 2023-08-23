/* eslint-disable global-require */
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

  const getMachineInformation = jest.fn();
  getMachineInformation.mockResolvedValue({
    id: 'mockId',
    name: 'mockName',
  });

  const readConfig = jest.fn();
  readConfig.mockResolvedValue({
    processes: {
      deactivateProcessExecution: false,
    },
  });

  return {
    logging: { getLogger },
    information: { getMachineInformation },
    config: { readConfig },
  };
});

jest.mock('@proceed/system', () => {
  // Keep references in factory scope so we always return the same objects. This
  // is the equivalent to returning singletons in the @proceed/data methods.
  const data = {
    read: jest.fn(),
    write: jest.fn(),
    delete: jest.fn(),
  };

  const network = {
    sendData: jest.fn(async () => {
      throw new Error('Status code was: 404');
    }),
    get: jest.fn(),
    post: jest.fn(),
  };

  const console = {
    log: jest.fn(),
  };

  const capability = {};

  const config = {
    getConfig: jest.fn(),
    constructor: {
      _setConfigModule: jest.fn(),
    },
  };

  const device = {
    getMachineInfo: jest.fn(),
  };

  const timer = {
    clearTimeout: jest.fn().mockImplementation((...args) => clearTimeout(...args)),
    setTimeout: jest.fn().mockImplementation((...args) => setTimeout(...args)),
  };

  return {
    data,
    network,
    console,
    config,
    capability,
    device,
    discovery: {},
    timer,
  };
});
jest.mock('@proceed/distribution');
jest.mock('@proceed/capabilities');
jest.mock('@proceed/decider');

// Reload the System module for each test since its mock implementation is
// dependent on the test and the calls happen asynchronously, so the tests would
// interfere with each other if we used the same module for each one.
// We have to reload all other modules as well, because they need to use the new
// System module (and they use the new Engine module, so we need a reference and
// so on...).
let System;
let Logging;
let management;
let Engine;
let distribution;
let capabilities;
let decider;
let testBPMN;

describe('Management', () => {
  beforeEach(() => {
    jest.resetModules();
    System = require('@proceed/system');
    Logging = require('@proceed/machine').logging;
    monitoring = Logging.getLogger();
    management = require('../management.js');
    Engine = require('../engine/engine.js');
    distribution = require('@proceed/distribution');
    capabilities = require('@proceed/capabilities');
    decider = require('@proceed/decider');
    testBPMN = `
    <?xml version="1.0" encoding="UTF-8"?>
    <bpmn2:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:bpmn2="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" xmlns:proceed="https://docs.proceed-labs.org/BPMN" id="sample-diagram" name="gvc" targetNamespace="http://bpmn.io/schema/bpmn" expressionLanguage="javascript" typeLanguage="json" exporter="PROCEED Management System" exporterVersion="0.1.0" xsi:schemaLocation="http://www.omg.org/spec/BPMN/20100524/MODEL BPMN20.xsd">
      <bpmn2:process id="_969178a8-ff78-4d19-ae51-47d2c1f94b9a" name="PROCEED Main Process" processType="Private" isExecutable="true">
        <bpmn2:startEvent id="StartEvent_1">
          <bpmn2:outgoing>SequenceFlow_14mwzvq</bpmn2:outgoing>
        </bpmn2:startEvent>
        <bpmn2:task id="Task_1y4wd2q">
          <bpmn2:incoming>SequenceFlow_14mwzvq</bpmn2:incoming>
          <bpmn2:outgoing>SequenceFlow_0jfbrh9</bpmn2:outgoing>
        </bpmn2:task>
        <bpmn2:sequenceFlow id="SequenceFlow_14mwzvq" sourceRef="StartEvent_1" targetRef="Task_1y4wd2q"/>
        <bpmn2:task id="Task_09mcdr9">
          <bpmn2:incoming>SequenceFlow_0jfbrh9</bpmn2:incoming>
          <bpmn2:outgoing>SequenceFlow_1xrprzt</bpmn2:outgoing>
        </bpmn2:task>
        <bpmn2:sequenceFlow id="SequenceFlow_0jfbrh9" sourceRef="Task_1y4wd2q" targetRef="Task_09mcdr9"/>
        <bpmn2:endEvent id="EndEvent_02e1jkg">
          <bpmn2:incoming>SequenceFlow_1xrprzt</bpmn2:incoming>
        </bpmn2:endEvent>
        <bpmn2:sequenceFlow id="SequenceFlow_1xrprzt" sourceRef="Task_09mcdr9" targetRef="EndEvent_02e1jkg"/>
      </bpmn2:process>
    </bpmn2:definitions>
`;
    distribution.communication.getAvailableMachines.mockReturnValue([
      { ip: '192.168.1.1', id: 'mockId' },
    ]);
    distribution.db.getProcessVersion.mockReturnValue(testBPMN);
    distribution.db.getProcessVersionInfo.mockResolvedValue({
      bpmn: testBPMN,
      deploymentMethod: 'static',
    });
    distribution.db.isProcessVersionValid.mockResolvedValue(true);
    decider.allowedToExecuteLocally.mockReturnValue(true);
  });

  it('creates a new ProceedEngine instance when there is none for the given definitionsId', async () => {
    jest.spyOn(Engine.prototype, 'deployProcessVersion');
    jest.spyOn(Engine.prototype, 'startProcessVersion');
    distribution.db.isProcessVersionValid.mockResolvedValue(true);
    const instanceId = await management.createInstance(0, 123, {});
    expect(management.getEngineWithID(instanceId)).toBeInstanceOf(Engine);
    expect(Engine.prototype.deployProcessVersion).toHaveBeenCalledWith(0, 123);
    expect(Engine.prototype.startProcessVersion).toHaveBeenCalledWith(
      123,
      {},
      undefined,
      undefined,
      undefined,
    );
  });

  it('reuses an existing ProceedEngine instance when there is one for the given definitionsId to start an instance', async () => {
    jest.spyOn(Engine.prototype, 'deployProcessVersion');
    jest.spyOn(Engine.prototype, 'startProcessVersion');
    const firstInstanceId = await management.createInstance(0, 123, {});

    const secondInstanceId = await management.createInstance(0, 123, {});

    const firstEngine = management.getEngineWithID(firstInstanceId);
    expect(management.getEngineWithID(firstInstanceId)).toBe(
      management.getEngineWithID(secondInstanceId),
    );
    expect(firstEngine.instanceIDs).toEqual([firstInstanceId, secondInstanceId]);
  });

  it('starts instance which was already started on another engine', async () => {
    jest.spyOn(Engine.prototype, 'deployProcessVersion');
    jest.spyOn(Engine.prototype, 'startProcessVersion');

    const instance = {
      processId: '0',
      processVersion: 789,
      processInstanceId: '0-123',
      tokens: [
        {
          tokenId: 'a',
          from: 'Task_1y4wd2q',
          to: 'Task_09mcdr9',
          machineHops: 0,
        },
      ],
      variables: {},
      log: [],
    };

    const startingInstanceInfo = {
      ...instance,
      processId: '0#789',
      processVersion: undefined,
      tokens: [
        {
          tokenId: 'a',
          currentFlowElementId: 'Task_09mcdr9',
          machineHops: 1,
          deciderStorageTime: 0,
          deciderStorageRounds: 0,
        },
      ],
    };

    // try to continue instance which was never started on this engine
    const engine = await management.continueInstance(0, instance);
    expect(engine).toBeInstanceOf(Engine);
    expect(Engine.prototype.deployProcessVersion).toHaveBeenCalledWith(0, 789);
    expect(Engine.prototype.startProcessVersion).toHaveBeenCalledWith(
      789,
      {},
      startingInstanceInfo,
      expect.any(Function),
    );
    expect(management.getEngineWithID(engine.instanceIDs[0])).toBeInstanceOf(Engine);
  });

  it('returns all pending activities', async () => {
    testBPMN = `
    <?xml version="1.0" encoding="UTF-8"?>
    <bpmn2:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:bpmn2="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" xmlns:proceed="https://docs.proceed-labs.org/BPMN" id="sample-diagram" name="gvc" targetNamespace="http://bpmn.io/schema/bpmn" expressionLanguage="javascript" typeLanguage="json" exporter="PROCEED Management System" exporterVersion="0.1.0" xsi:schemaLocation="http://www.omg.org/spec/BPMN/20100524/MODEL BPMN20.xsd">
      <bpmn2:process id="_969178a8-ff78-4d19-ae51-47d2c1f94b9a" name="PROCEED Main Process" processType="Private" isExecutable="true">
        <bpmn2:startEvent id="StartEvent_1">
          <bpmn2:outgoing>SequenceFlow_14mwzvq</bpmn2:outgoing>
        </bpmn2:startEvent>
        <bpmn2:sequenceFlow id="SequenceFlow_14mwzvq" sourceRef="StartEvent_1" targetRef="Task_1y4wd2q"/>
        <bpmn2:userTask id="Task_1y4wd2q">
          <bpmn2:incoming>SequenceFlow_14mwzvq</bpmn2:incoming>
          <bpmn2:outgoing>SequenceFlow_07r7avf</bpmn2:outgoing>
        <bpmn2:extensionElements><proceed:capabilities><proceed:capability>has-screen</proceed:capability></proceed:capabilities></bpmn2:extensionElements></bpmn2:userTask>
        <bpmn2:endEvent id="EndEvent_1tc17io">
          <bpmn2:incoming>SequenceFlow_07r7avf</bpmn2:incoming>
        </bpmn2:endEvent>
        <bpmn2:sequenceFlow id="SequenceFlow_07r7avf" sourceRef="Task_1y4wd2q" targetRef="EndEvent_1tc17io"/>
      </bpmn2:process>
    </bpmn2:definitions>
`;
    // Start three user tasks
    distribution.db.getProcessVersionInfo.mockResolvedValue({
      bpmn: testBPMN,
      deploymentMethod: 'static',
    });
    distribution.db.getProcessVersion.mockReturnValue(testBPMN);
    distribution.db.isProcessVersionValid.mockResolvedValue(true);
    await management.createInstance(0, 123, {});

    // distribution.db.getProcess.mockResolvedValueOnce(testBPMN);
    await management.createInstance(1, 456, {});

    // distribution.db.getProcess.mockResolvedValueOnce(testBPMN);
    await management.createInstance(2, 789, {});

    await new Promise((resolve) => {
      setTimeout(() => {
        const activities = management.getPendingUserTasks();
        expect(activities.length).toBe(3);
        resolve();
      }, 200);
    });
  });

  it('remove process engine', async () => {
    jest.spyOn(Engine.prototype, 'startProcessVersion');
    await management.createInstance(0, 123, {});
    expect(management.getEngineWithDefinitionId(0)).toBeInstanceOf(Engine);
    management.removeProcessEngine(0);
    expect(management.getEngineWithDefinitionId(0)).toBeUndefined();
  });
});
