jest.mock('neo-bpmn-engine', () => ({
  LogLevel: {
    info: 'info',
  },
}));
jest.mock('@proceed/distribution');
jest.mock('@proceed/bpmn-helper');
jest.mock('../processForwarding.js');

const { getNewInstanceHandler } = require('../hookCallbacks.js');
const { db } = require('@proceed/distribution');
const { abortInstanceOnNetwork } = require('../processForwarding.js');

let mockEngine;

const onStarted = jest.fn();
const onEnded = jest.fn();
const onTokenEnded = jest.fn();

let mockNewInstance;

let instanceHandler;
describe('Test for the function that sets up callbacks for the different lifecycle hooks exposed by the neo engine', () => {
  beforeEach(async () => {
    jest.resetAllMocks();

    mockEngine = {
      definitionId: 'processFile',
      _log: {
        log: jest.fn(),
        info: jest.fn(),
      },
      getToken: jest.fn(),
      instanceIDs: [],
      userTasks: [],
      _versionProcessMapping: {},
      _instanceIdProcessMapping: {},
      getInstanceInformation: jest.fn().mockReturnValue({}),
      instanceEventHandlers: { onStarted, onEnded, onTokenEnded },
      archiveInstance: jest.fn(),
    };

    mockNewInstance = {
      id: 'newInstanceId',
      getState: jest.fn().mockImplementation(() => ({ processId: 'a#b' })),
      logExecution: jest.fn(),
      updateLog: jest.fn(),
      completeActivity: jest.fn(),
      getLog$: jest.fn().mockImplementation(function () {
        return { subscribe: (cb) => (this.logCallback = cb) };
      }),
      onEnded: jest.fn().mockImplementation(function (cb) {
        this.endedCallback = cb;
      }),
      onAborted: jest.fn().mockImplementation(function (cb) {
        this.abortedCallback = cb;
      }),
      onUserTaskInterrupted: jest.fn().mockImplementation(function (cb) {
        this.userTaskInterruptedCallback = cb;
      }),
      onCallActivityInterrupted: jest.fn().mockImplementation(function (cb) {
        this.callActivityInterruptedCallback = cb;
      }),
      onScriptTaskError: jest.fn().mockImplementation(function (cb) {
        this.scriptTaskErrorCallback = cb;
      }),
      onTokenEnded: jest.fn().mockImplementation(function (cb) {
        this.tokenEndedCallback = cb;
      }),
      onFlowNodeExecuted: jest.fn().mockImplementation(function (cb) {
        this.flowNodeExecutedCallback = cb;
      }),
      onInstanceStateChange: jest.fn().mockImplementation(function (cb) {
        this.instanceStateChangeCallback = cb;
      }),
      logCallback: null,
      endedCallback: null,
      abortedCallback: null,
      scriptTaskErrorCallback: null,
      userTaskInterruptedCallback: null,
      callActivityInterruptedCallback: null,
      tokenEndedCallback: null,
      flowNodeExecutedCallback: null,
      instanceStateChangeCallback: null,

      log: jest.fn().mockImplementation(function (log) {
        this.logCallback(log);
      }),
      ended: jest.fn().mockImplementation(function () {
        this.endedCallback();
      }),
      aborted: jest.fn().mockImplementation(function () {
        this.abortedCallback();
      }),
      scriptTaskError: jest.fn().mockImplementation(function (token) {
        this.scriptTaskErrorCallback(token);
      }),
      userTaskInterrupted: jest.fn().mockImplementation(function (token) {
        this.userTaskInterruptedCallback(token);
      }),
      callActivityInterrupted: jest.fn().mockImplementation(function (token) {
        this.callActivityInterruptedCallback(token);
      }),
      tokenEnded: jest.fn().mockImplementation(function (token) {
        this.tokenEndedCallback(token);
      }),
      flowNodeExecuted: jest.fn().mockImplementation(function (execution) {
        this.flowNodeExecutedCallback(execution);
      }),
      instanceStateChange: jest.fn().mockImplementation(function (state) {
        this.instanceStateChangeCallback(state);
      }),
    };

    instanceHandler = getNewInstanceHandler(mockEngine, undefined);

    await instanceHandler(mockNewInstance);
    mockEngine._log.info.mockReset();
  });

  it('saves the id of a new instance in the given engine and calls onStarted function', async () => {
    expect(mockEngine.instanceIDs).toStrictEqual(['newInstanceId']);
    expect(onStarted).toHaveBeenCalled();
  });

  describe('different events for which hooks are set up', () => {
    describe('new log message', () => {
      it('gives new logs originating from the instance to the engine', async () => {
        mockNewInstance.log({ level: 'info', message: 'test123' });

        expect(mockEngine._log.log).toHaveBeenCalledWith({
          level: 'info',
          moduleName: 'BPMN-ENGINE',
          msg: 'test123',
          instanceId: 'newInstanceId',
        });
      });
    });

    describe('instance ended', () => {
      it('logs end of instance, calls optional external onEnded, archives instance', async () => {
        mockNewInstance.ended();

        expect(mockEngine._log.info).toHaveBeenCalled();
        expect(onEnded).toHaveBeenCalled();
        expect(mockEngine.archiveInstance).toHaveBeenCalledWith('newInstanceId');
      });
    });

    describe('instance aborted', () => {
      it('logs failure of instance and sends abort command to other engines', async () => {
        mockNewInstance.aborted();

        expect(mockEngine._log.info).toHaveBeenCalled();
        expect(abortInstanceOnNetwork).toHaveBeenCalledWith('processFile', 'newInstanceId');
      });
    });

    describe('token ended', () => {
      it('logs the end of the specific token, calls optional external onTokenEnded callback', async () => {
        mockNewInstance.tokenEnded({
          id: 'tokenId',
        });

        expect(mockEngine._log.info).toHaveBeenCalled();
        expect(onTokenEnded).toHaveBeenCalled();
      });
    });

    describe('flowNode executed', () => {
      it('logs the execution of a flow node', async () => {
        mockEngine.machineInformation = { id: 'machineId' };

        mockNewInstance.flowNodeExecuted({
          flowElementId: 'executionId',
          tokenId: 'tokenId',
        });

        expect(mockNewInstance.updateLog).toHaveBeenCalledWith('executionId', 'tokenId', {
          machine: { id: 'machineId' },
        });
        expect(mockEngine._log.info).toHaveBeenCalled();
      });
    });
  });
});
