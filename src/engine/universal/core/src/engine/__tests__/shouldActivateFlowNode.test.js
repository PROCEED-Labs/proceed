jest.mock('@proceed/distribution');
jest.mock('@proceed/bpmn-helper');

const { db } = require('@proceed/distribution');
const {
  getRootFromElement,
  getTargetDefinitionsAndProcessIdForCallActivityByObject,
  getMilestonesFromElementById,
  getMetaData,
} = require('@proceed/bpmn-helper');

const { getShouldActivateFlowNode } = require('../shouldActivateFlowNode.js');

let mockEngine;
let mockInstance;

let hook;

beforeEach(() => {
  mockInstance = {
    id: 'mockInstance',
    getVariables: jest.fn().mockReturnValue({ mockVariable: 'mockValue' }),
    completeActivity: jest.fn(),
    getState: jest.fn().mockReturnValue({ processId: 'a#b' }),
    getInstanceInformation: jest.fn().mockReturnValue({ processVersion: 123 }),
    updateToken: jest.fn(),
  };

  mockEngine = {
    _management: { createInstance: jest.fn() },
    _bpmn: 'Bpmn Definitions',
    processID: 'mockProcessId',
    _log: {
      info: jest.fn().mockImplementation(),
    },
    userTasks: [],
    callActivityExecutors: {},
    getInstance: jest.fn().mockImplementation(() => mockInstance),
    getInstanceInformation: jest.fn().mockReturnValue({ processVersion: 123 }),
    getInstanceBpmn: jest.fn(),
    getToken: jest.fn().mockReturnValue({ currentFlowElementStartTime: 0 }),
    updateMilestones: jest.fn(),
  };

  hook = getShouldActivateFlowNode(mockEngine);
});

describe('Tests for the function that is supposed to decide if a flow node should be executed', () => {
  describe('new user task encountered', () => {
    let mockTask;
    let hookReturnValue;
    beforeEach(() => {
      getMilestonesFromElementById.mockImplementation(() => {
        return [];
      });
      getMetaData.mockImplementation(() => {
        return {};
      });

      mockTask = {
        id: 'mockTaskId',
        $type: 'bpmn:UserTask',
        name: 'mockTaskName',
        implementation: 'https://html.spec.whatwg.org/',
        $attrs: {
          mockAttr: 'mockValue',
        },
      };

      hookReturnValue = hook('mockProcess', 'mockInstance', 'mockTokenId', mockTask, {
        mockStateEntry: 'mockStateValue',
      });
    });

    it('logs that a new user task was encountered', async () => {
      expect(mockEngine._log.info).toHaveBeenCalled();
    });

    it('should add the user tasks to the engines user task list', () => {
      expect(mockEngine.userTasks).toStrictEqual([
        {
          ...mockTask,
          attrs: mockTask.$attrs,
          processInstance: mockInstance,
          definitionVersion: 123,
          activate: expect.any(Function),
          tokenId: 'mockTokenId',
          state: 'READY',
          startTime: 0,
          endTime: null,
        },
      ]);
    });
    it('should only return after the activate function in the user task is called', async () => {
      let num = 0;
      hookReturnValue.then(() => expect(num).toBe(1));
      ++num;
      mockEngine.userTasks[0].activate();
    });
  });

  describe('new call activity encountered', () => {
    let mockRoot;
    let mockTask;
    beforeEach(async () => {
      // mock the return values of the function analyzing the bpmn or returning the import bpmn
      getTargetDefinitionsAndProcessIdForCallActivityByObject.mockReturnValue({
        definitionId: 'callActivityDefinitionId',
        version: 456,
      });

      mockRoot = {
        id: 'definitions',
        $type: 'bpmn:Definitions',
        $parent: undefined,
      };

      mockTask = {
        id: 'callActivityId',
        $type: 'bpmn:CallActivity',
        $parent: mockRoot,
      };

      getRootFromElement.mockReturnValue(mockRoot);

      // call the shouldActivateFlowNode hook
      hook('mockProcess', 'mockInstance', 'mockToken', mockTask, { mockStateEntry: 'mockValue' });

      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    it('logs that a new call activity was encountered', async () => {
      expect(mockEngine._log.info).toHaveBeenCalled();
    });

    it('deploys the imported process if necessary and starts a new instance of it', async () => {
      // check if the bpmn analysis and database functions were called correctly
      expect(getTargetDefinitionsAndProcessIdForCallActivityByObject).toHaveBeenCalledWith(
        mockRoot,
        mockTask.id
      );

      // check if the creation of the instance of the imported process was triggered
      expect(mockEngine._management.createInstance).toHaveBeenCalledWith(
        'callActivityDefinitionId',
        456,
        { mockVariable: 'mockValue' },
        undefined,
        expect.any(Function)
      );
    });

    it('adds a reference to the instance that started it to the instance of the imported process', () => {
      const [_1, _2, _3, _4, onStarted] = mockEngine._management.createInstance.mock.calls[0];

      const instance = {};
      onStarted(instance);
      expect(instance).toEqual({ callingInstance: 'mockInstance' });
    });
  });
});
