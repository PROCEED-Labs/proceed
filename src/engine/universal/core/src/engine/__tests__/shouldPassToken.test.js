jest.mock('@proceed/distribution');
jest.mock('../processForwarding.js');
jest.mock('@proceed/constraint-parser-xml-json/parser.js', () => {
  return function () {
    return { getConstraints: () => ({ processConstraints: null }) };
  };
});

jest.mock('@proceed/machine', () => ({
  logging: {
    getLogger: jest.fn().mockReturnValue({
      info: jest.fn(),
      debug: jest.fn,
      error: jest.fn(),
      warn: jest.fn(),
      trace: jest.fn(),
    }),
  },
  config: {
    readConfig: jest.fn(),
  },
}));

jest.mock('@proceed/decider');
jest.mock('@proceed/bpmn-helper');

const { getShouldPassToken } = require('../shouldPassToken.js');
const distribution = require('@proceed/distribution');
const { config } = require('@proceed/machine');
const Parser = require('@proceed/constraint-parser-xml-json/parser.js');
const decider = require('@proceed/decider');
const { getAllBpmnFlowElements, getElementsByTagName } = require('@proceed/bpmn-helper');
const { forwardProcess, forwardInstance, getMachineInfo } = require('../processForwarding.js');

let flowElements;
let processAttrs = {};
let mockInstance;
const mockToken = { tokenId: 'token1', currentFlowElementId: 'sequenceFlow' };
let engine;
let shouldPassToken;
let nextMachine;
describe('Tests for the function that is supposed to decide if a token can continue locally or has to be passed to the next machine', () => {
  // reset mocked information about the process to execute and the current instance of this process
  beforeEach(() => {
    jest.resetAllMocks();
    flowElements = [
      {
        id: 'from',
        machineId: 'thisMachineId',
      },
      {
        id: 'to',
      },
    ];
    mockInstance = {
      getState: () => ({
        globalStartTime: 100,
        log: [],
        instanceState: ['READY'],
      }),
      endToken: jest.fn(),
      updateLog: jest.fn(),
    };

    engine = {
      _log: {
        info: () => {},
      },
      machineInformation: {
        ip: '123.456.78.9',
        port: 12345,
        id: 'thisMachineId',
        name: 'machine1',
        hostname: 'thisMachine',
      },
      getToken: () => mockToken,
      updateToken: jest.fn(),
      getInstanceInformation: () => ({
        ...mockInstance.getState(),
        processId: 'a',
        processVersion: 123,
      }),
      stopUnfulfilledInstance: jest.fn(),
      getInstance: jest.fn().mockReturnValue(mockInstance),
      getInstanceBpmn: jest.fn().mockReturnValue(flowElements),
    };

    shouldPassToken = getShouldPassToken(engine);

    nextMachine = {
      id: 'anotherMachineId',
      ip: '456.123.78.9',
      port: 54321,
      name: 'machine2',
      hostname: 'otherMachine',
    };
    distribution.communication.getAvailableMachines.mockReturnValue([nextMachine]);
    distribution.db.getAllUserTasks.mockReturnValue([]);
    config.readConfig.mockResolvedValue({
      router: {
        reEvaluateTimer: 10,
      },
      processes: {
        deactivateProcessExecution: false,
      },
    });
    processAttrs['proceed:deploymentMethod'] = '';
    getElementsByTagName.mockReturnValue([
      {
        $attrs: processAttrs,
        flowElements,
      },
    ]);
  });

  describe('tests for static deployment', () => {
    beforeEach(() => {
      processAttrs['proceed:deploymentMethod'] = 'static';
    });
    describe('next activity is mapped to id of current machine', () => {
      it('returns true to proceed execution on current machine', async () => {
        flowElements[1].machineId = 'thisMachineId';
        getAllBpmnFlowElements.mockResolvedValue(flowElements);
        const decision = await shouldPassToken(
          'process1',
          'process1-instance1',
          'from',
          'to',
          'token1',
          undefined,
        );
        expect(decision).toStrictEqual(true);
      });
    });

    describe('next activity is mapped to id of another machine', () => {
      describe('machine exists', () => {
        beforeEach(() => {
          flowElements[1].machineId = 'anotherMachineId';
          getAllBpmnFlowElements.mockResolvedValue(flowElements);
        });
        it('returns false, add information about the next machine to the token and log execution', async () => {
          const decision = await shouldPassToken(
            'process1',
            'process1-instance1',
            'from',
            'to',
            'token1',
            undefined,
          );

          expect(mockInstance.endToken).toHaveBeenCalledWith('token1', {
            endTime: expect.any(Number),
            state: 'FORWARDED',
            nextMachine: {
              id: 'anotherMachineId',
              ip: '456.123.78.9',
              port: 54321,
              name: 'machine2',
            },
          });

          expect(mockInstance.updateLog).toHaveBeenCalledWith('sequenceFlow', 'token1', {
            machine: {
              id: 'thisMachineId',
              ip: '123.456.78.9',
              port: 12345,
              hostname: 'thisMachine',
              name: 'machine1',
            },
            nextMachine: {
              id: 'anotherMachineId',
              ip: '456.123.78.9',
              port: 54321,
              name: 'machine2',
            },
          });
          expect(decision).toStrictEqual(false);
        });
        it('sets hostname as name if there is no name for the next machine', async () => {
          delete nextMachine.name;
          const decision = await shouldPassToken(
            'process1',
            'process1-instance1',
            'from',
            'to',
            'token1',
            undefined,
          );
          expect(mockInstance.endToken).toHaveBeenCalledWith('token1', {
            endTime: expect.any(Number),
            state: 'FORWARDED',
            nextMachine: {
              id: 'anotherMachineId',
              ip: '456.123.78.9',
              port: 54321,
              name: 'otherMachine',
            },
          });

          expect(mockInstance.updateLog).toHaveBeenCalledWith('sequenceFlow', 'token1', {
            machine: {
              id: 'thisMachineId',
              ip: '123.456.78.9',
              port: 12345,
              hostname: 'thisMachine',
              name: 'machine1',
            },
            nextMachine: {
              id: 'anotherMachineId',
              ip: '456.123.78.9',
              port: 54321,
              name: 'otherMachine',
            },
          });
          expect(decision).toStrictEqual(false);
        });
      });
      describe("machine doesn't exist", () => {
        it("returns false, update token with information that next activity can't be executed and log execution", async () => {
          flowElements[1].machineId = 'nonExistentMachine';
          getAllBpmnFlowElements.mockResolvedValue(flowElements);
          const decision = await shouldPassToken(
            'process1',
            'process1-instance1',
            'from',
            'to',
            'token1',
            undefined,
          );

          expect(mockInstance.endToken).toHaveBeenCalledWith('token1', {
            endTime: expect.any(Number),
            state: 'ERROR-CONSTRAINT-UNFULFILLED',
            errorMessage: 'Token stopped execution',
          });
          expect(mockInstance.updateLog).toHaveBeenCalledWith('sequenceFlow', 'token1', {
            machine: {
              id: 'thisMachineId',
              ip: '123.456.78.9',
              port: 12345,
              hostname: 'thisMachine',
              name: 'machine1',
            },
          });
          expect(decision).toStrictEqual(false);
        });
      });
    });

    describe('next activity is mapped to address of the current machine', () => {
      it('signals for execution to continue on the current engine', async () => {
        flowElements[1].machineAddress = '123.456.78.9:12345';
        getAllBpmnFlowElements.mockResolvedValue(flowElements);
        const decision = await shouldPassToken(
          'process1',
          'process1-instance1',
          'from',
          'to',
          'token1',
          undefined,
        );

        expect(decision).toStrictEqual(true);
      });
    });

    describe('next activity is mapped to address of another machine', () => {
      it(
        'checks if next machine is reachable and requests additional information;' +
          'returns false, updates token with machine information and log execution',
        async () => {
          flowElements[1].machineAddress = '456.123.78.9:54321';
          getAllBpmnFlowElements.mockResolvedValue(flowElements);
          getMachineInfo.mockResolvedValueOnce({
            id: 'otherMachineId',
            name: 'machine2',
            hostname: 'otherMachine',
          });

          const decision = await shouldPassToken(
            'process1',
            'process1-instance1',
            'from',
            'to',
            'token1',
            undefined,
          );

          expect(mockInstance.endToken).toHaveBeenCalledWith('token1', {
            endTime: expect.any(Number),
            state: 'FORWARDED',
            nextMachine: {
              ip: '456.123.78.9',
              port: 54321,
              id: 'otherMachineId',
              name: 'machine2',
            },
          });

          expect(mockInstance.updateLog).toHaveBeenCalledWith('sequenceFlow', 'token1', {
            machine: {
              id: 'thisMachineId',
              ip: '123.456.78.9',
              port: 12345,
              hostname: 'thisMachine',
              name: 'machine1',
            },
            nextMachine: {
              ip: '456.123.78.9',
              port: 54321,
              id: 'otherMachineId',
              name: 'machine2',
            },
          });
          expect(decision).toStrictEqual(false);
        },
      );
      it('signals error if the next machnine is not reachable', async () => {
        flowElements[1].machineAddress = '456.123.78.9:54321';
        getAllBpmnFlowElements.mockResolvedValue(flowElements);
        getMachineInfo.mockRejectedValueOnce('Fail');

        const decision = await shouldPassToken(
          'process1',
          'process1-instance1',
          'from',
          'to',
          'token1',
          undefined,
        );

        expect(mockInstance.endToken).toHaveBeenCalledWith('token1', {
          endTime: expect.any(Number),
          state: 'ERROR-CONSTRAINT-UNFULFILLED',
          errorMessage: 'Token stopped execution',
        });

        expect(mockInstance.updateLog).toHaveBeenCalledWith('sequenceFlow', 'token1', {
          machine: {
            id: 'thisMachineId',
            ip: '123.456.78.9',
            port: 12345,
            hostname: 'thisMachine',
            name: 'machine1',
          },
        });
        expect(decision).toStrictEqual(false);
      });
      it('signals error if address for next machine has wrong format', async () => {
        flowElements[1].machineAddress = '456.123.78.9:abcde';
        getAllBpmnFlowElements.mockResolvedValue(flowElements);
        const decision = await shouldPassToken(
          'process1',
          'process1-instance1',
          'from',
          'to',
          'token1',
          undefined,
        );

        expect(mockInstance.endToken).toHaveBeenCalledWith('token1', {
          endTime: expect.any(Number),
          state: 'ERROR-CONSTRAINT-UNFULFILLED',
          errorMessage: 'Token stopped execution',
        });

        expect(mockInstance.updateLog).toHaveBeenCalledWith('sequenceFlow', 'token1', {
          machine: {
            id: 'thisMachineId',
            ip: '123.456.78.9',
            port: 12345,
            hostname: 'thisMachine',
            name: 'machine1',
          },
        });
        expect(decision).toStrictEqual(false);
      });
    });

    it('signals error if there is neither a machine id nor a machine address assigned to the next activity', async () => {
      getAllBpmnFlowElements.mockResolvedValue(flowElements);
      const decision = await shouldPassToken(
        'process1',
        'process1-instance1',
        'from',
        'to',
        'token1',
        undefined,
      );

      expect(mockInstance.endToken).toHaveBeenCalledWith('token1', {
        endTime: expect.any(Number),
        errorMessage: 'Token stopped execution',
        state: 'ERROR-CONSTRAINT-UNFULFILLED',
      });

      expect(mockInstance.updateLog).toHaveBeenCalledWith('sequenceFlow', 'token1', {
        machine: {
          id: 'thisMachineId',
          ip: '123.456.78.9',
          port: 12345,
          hostname: 'thisMachine',
          name: 'machine1',
        },
      });
      expect(decision).toStrictEqual(false);
    });
  });

  describe('tests for dynamic deployment', () => {
    beforeEach(() => {
      processAttrs['proceed:deploymentMethod'] = 'dynamic';
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('signals to continue to execute locally if the current machine fulfills all constraints', async () => {
      getAllBpmnFlowElements.mockResolvedValue(flowElements);
      decider.preCheckAbort.mockResolvedValueOnce({
        stopProcess: null,
        unfulfilledConstraints: [],
      });

      decider.findOptimalNextMachine.mockResolvedValueOnce({
        engineList: [{ id: 'local-engine' }],
        abortCheck: {
          stopProcess: null,
          unfulfilledConstraints: [],
        },
      });

      const decision = await shouldPassToken(
        'process1',
        'process1-instance1',
        'from',
        'to',
        'token1',
        undefined,
      );

      expect(decision).toStrictEqual(true);
    });
    it('signals that execution for token is supposed to be moved to another machine, update token containing nextMachine and log execution', async () => {
      getAllBpmnFlowElements.mockResolvedValue(flowElements);
      decider.findOptimalNextMachine.mockResolvedValueOnce({
        engineList: [
          {
            id: 'anotherMachineId',
            ip: '456.123.78.9',
            port: 54321,
            hostname: 'otherMachine',
            name: 'machine2',
          },
          { id: 'local-engine' },
        ],
        prioritized: false,
        abortCheck: {
          stopProcess: null,
          unfulfilledConstraints: [],
        },
      });
      decider.preCheckAbort.mockResolvedValueOnce({
        stopProcess: null,
        unfulfilledConstraints: [],
      });
      const decision = await shouldPassToken(
        'process1',
        'process1-instance1',
        'from',
        'to',
        'token1',
        undefined,
      );

      expect(mockInstance.endToken).toHaveBeenCalledWith('token1', {
        endTime: expect.any(Number),
        state: 'FORWARDED',
        nextMachine: {
          id: 'anotherMachineId',
          ip: '456.123.78.9',
          port: 54321,
          hostname: 'otherMachine',
          name: 'machine2',
        },
      });

      expect(mockInstance.updateLog).toHaveBeenCalledWith('sequenceFlow', 'token1', {
        machine: {
          id: 'thisMachineId',
          ip: '123.456.78.9',
          port: 12345,
          hostname: 'thisMachine',
          name: 'machine1',
        },
        nextMachine: {
          id: 'anotherMachineId',
          ip: '456.123.78.9',
          port: 54321,
          hostname: 'otherMachine',
          name: 'machine2',
        },
      });
      expect(decision).toStrictEqual(false);
    });

    it('signals that time constraints are not fulfilled for previous execution and stop instance', async () => {
      getAllBpmnFlowElements.mockResolvedValue(flowElements);
      decider.preCheckAbort.mockResolvedValueOnce({
        stopProcess: 'instance',
        unfulfilledConstraints: ['example-constraint'],
      });
      const decision = await shouldPassToken(
        'process1',
        'process1-instance1',
        'from',
        'to',
        'token1',
        undefined,
      );

      expect(engine.stopUnfulfilledInstance).toHaveBeenCalled();
      expect(decision).toStrictEqual(false);
    });

    it('signals that time constraints are not fulfilled for previous execution and stop token', async () => {
      getAllBpmnFlowElements.mockResolvedValue(flowElements);
      decider.preCheckAbort.mockResolvedValueOnce({
        stopProcess: 'token',
        unfulfilledConstraints: ['example-constraint'],
      });
      const decision = await shouldPassToken(
        'process1',
        'process1-instance1',
        'from',
        'to',
        'token1',
        undefined,
      );

      expect(mockInstance.endToken).toHaveBeenCalledWith('token1', {
        state: 'ERROR-CONSTRAINT-UNFULFILLED',
        endTime: expect.any(Number),
        errorMessage: 'Token stopped execution because of: example-constraint',
      });
      expect(decision).toStrictEqual(false);
    });

    it('signals that no engine was found for further execution and stop instance', async () => {
      getAllBpmnFlowElements.mockResolvedValue(flowElements);
      decider.preCheckAbort.mockResolvedValueOnce({
        stopProcess: null,
        unfulfilledConstraints: [],
      });

      decider.findOptimalNextMachine.mockResolvedValueOnce({
        engineList: [],
        prioritized: false,
        abortCheck: {
          stopProcess: 'instance',
          unfulfilledConstraints: ['example-constraint'],
        },
      });

      const decision = await shouldPassToken(
        'process1',
        'process1-instance1',
        'from',
        'to',
        'token1',
        undefined,
      );

      expect(engine.stopUnfulfilledInstance).toHaveBeenCalled();
      expect(decision).toStrictEqual(false);
    });

    it('signals that no engine was found for further execution and stop token', async () => {
      getAllBpmnFlowElements.mockResolvedValue(flowElements);
      decider.preCheckAbort.mockResolvedValueOnce({
        stopProcess: null,
        unfulfilledConstraints: [],
      });

      decider.findOptimalNextMachine.mockResolvedValueOnce({
        engineList: [],
        prioritized: false,
        abortCheck: {
          stopProcess: 'token',
          unfulfilledConstraints: ['example-constraint'],
        },
      });

      const decision = await shouldPassToken(
        'process1',
        'process1-instance1',
        'from',
        'to',
        'token1',
        undefined,
      );

      expect(mockInstance.endToken).toHaveBeenCalledWith('token1', {
        state: 'ERROR-CONSTRAINT-UNFULFILLED',
        endTime: expect.any(Number),
        errorMessage: 'Token stopped execution because of: example-constraint',
      });
      expect(decision).toStrictEqual(false);
    });
  });

  it('always signals local execution if no deploymentMethod was set', async () => {
    getAllBpmnFlowElements.mockResolvedValue(flowElements);
    const decision = await shouldPassToken(
      'process1',
      'process1-instance1',
      'from',
      'to',
      'token1',
      undefined,
    );

    expect(decision).toStrictEqual(true);
  });

  describe('test for the forwarding of the process', () => {
    beforeEach(() => {
      processAttrs['proceed:deploymentMethod'] = 'dynamic';
      decider.findOptimalNextMachine.mockResolvedValueOnce({
        engineList: ['anotherMachineId'],
        prioritized: false,
        abortCheck: {
          stopProcess: null,
          unfulfilledConstraints: [],
        },
      });
      decider.preCheckAbort.mockResolvedValueOnce({
        stopProcess: null,
        unfulfilledConstraints: [],
      });
    });

    it('sends the complete process information and instance to the next machine', async () => {
      getAllBpmnFlowElements.mockResolvedValue(flowElements);
      await shouldPassToken('process1', 'process1-instance1', 'from', 'to', 'token1', undefined);

      expect(forwardProcess).toHaveBeenCalled();
      expect(forwardInstance).toHaveBeenCalled();
    });
  });
});
