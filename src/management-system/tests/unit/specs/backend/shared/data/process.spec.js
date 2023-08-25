jest.mock('@/frontend/../backend/shared-electron-server/data/store.js', () => ({
  processes: [],
  get: jest.fn().mockImplementation(function () {
    return this.processes;
  }),
  add: jest.fn(),
  remove: jest.fn(),
  update: jest.fn(),
  updateByIds: jest.fn(),
  set: jest.fn(),
}));

jest.mock('@/frontend/../backend/shared-electron-server/data/fileHandling.js', () => ({
  getBPMN: jest.fn(),
  saveProcess: jest.fn(),
  updateProcess: jest.fn(),
  deleteProcess: jest.fn(),
  getUpdatedProcessesJSON: (processes) => {
    return processes;
  },
}));

jest.mock('@/frontend/backend-api/event-system/EventHandler.js', () => ({
  dispatch: jest.fn(),
  on: jest.fn(),
}));

jest.mock('@/frontend/../backend/shared-electron-server/logging.js', () => ({
  log: jest.fn(),
  debug: jest.fn(),
}));

import * as processController from '@/frontend/../backend/shared-electron-server/data/process.js';
import { getBpmn as mockBpmn } from '../../../../../helpers/processHelpers.js';
import * as store from '@/frontend/../backend/shared-electron-server/data/store.js';
import * as fileHelper from '@/frontend/../backend/shared-electron-server/data/fileHandling.js';
import eventHandler from '@/frontend/backend-api/event-system/EventHandler.js';

const dateMock = jest.spyOn(Date.prototype, 'toUTCString');
dateMock.mockReturnValue('some date');

const existingProcessMeta = {
  id: 'existingId',
  name: 'existingName',
  description: 'existingDescription',
  departments: ['departmentA'],
  variables: ['variableA'],
  createdOn: 'some date',
  lastEdited: 'some date',
  processIds: ['existingProcess'],
};

describe('Test for the module that controlls changes to processes', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    // make the store have one example process to init with
    store.processes.length = 0;
    store.processes.push(existingProcessMeta);
    processController.init();
  });

  describe('init', () => {
    it('initializes process info with information from store', () => {
      expect(processController.getProcesses()).toStrictEqual([
        { ...existingProcessMeta, inEditingBy: [] },
      ]);
    });
  });

  describe('addProcess', () => {
    let testBpmn;
    let result;
    let metadata;

    beforeEach(async () => {
      testBpmn = await mockBpmn({
        id: 'testId',
        name: 'testName',
        processId: 'testProcess',
        processDescription: 'testDescription',
      });
      result = await processController.addProcess({ bpmn: testBpmn, isProject: false });
      metadata = {
        id: 'testId',
        originalId: undefined,
        type: 'process',
        name: 'testName',
        inEditingBy: [],
        description: 'testDescription',
        departments: [],
        variables: [],
        createdOn: 'some date',
        lastEdited: 'some date',
        processIds: ['testProcess'],
        isProject: false,
        shared: false,
        owner: null,
        versions: [],
      };
    });

    it('throws if not given a bpmn', async () => {
      await expect(processController.addProcess({})).rejects.toThrow(
        "Can't create a process without a bpmn!",
      );
    });

    it('returns a processes id if given a process with id of an already known process', async () => {
      expect(
        processController.addProcess({
          bpmn: await mockBpmn({ id: 'existingId', name: 'existingName' }),
        }),
      ).resolves.toBe('existingId');
    });

    it('parses bpmn and returns a process meta object', async () => {
      expect(result).toStrictEqual(metadata);
    });

    it('stores meta data for future requests', () => {
      expect(processController.getProcesses()).toStrictEqual([
        {
          ...existingProcessMeta,
          inEditingBy: [],
        },
        metadata,
      ]);
    });

    it('writes meta data to store, (excluding temporary inEditingBy)', () => {
      delete metadata.inEditingBy;
      expect(store.add).toHaveBeenCalledWith('processes', metadata);
    });

    it('stores the given bpmn', () => {
      expect(fileHelper.saveProcess).toHaveBeenCalledWith('testId', testBpmn);
    });

    it('dispatches event informing about new process', () => {
      expect(eventHandler.dispatch).toHaveBeenCalledWith('processAdded', { process: metadata });
    });
  });

  describe('updateProcess', () => {
    let testBpmn;
    let result;
    let newMetadata;
    beforeEach(async () => {
      dateMock.mockReturnValueOnce('new date');
      testBpmn = await mockBpmn({
        id: 'existingId',
        name: 'newName',
        processId: 'newProcess',
        processDescription: 'newDescription',
      });
      result = await processController.updateProcess('existingId', { bpmn: testBpmn });
      newMetadata = {
        id: 'existingId',
        name: 'newName',
        inEditingBy: [],
        description: 'newDescription',
        departments: ['departmentA'],
        variables: ['variableA'],
        createdOn: 'some date',
        lastEdited: 'new date',
        processIds: ['newProcess'],
      };
    });

    it("throws if the referenced process doesn't exist", async () => {
      await expect(processController.updateProcess('nonExistantId')).rejects.toThrow(
        'Process with id nonExistantId does not exist!',
      );
    });

    it('throws if the new bpmn has an id differing from the current one', async () => {
      await expect(
        processController.updateProcess('existingId', {
          bpmn: await mockBpmn({ id: 'nonexistantId', name: 'someName' }),
        }),
      ).rejects.toThrow();
    });

    it('parses new meta info from bpmn and returns updated process meta object', () => {
      expect(result).toStrictEqual(newMetadata);
    });

    it('overwrites the stored meta data for future requests', () => {
      expect(processController.getProcesses()).toStrictEqual([newMetadata]);
    });

    it('writes update to store', () => {
      delete newMetadata.inEditingBy;
      expect(store.update).toHaveBeenCalledWith('processes', 'existingId', newMetadata);
    });

    it('overwrites the stored bpmn', () => {
      expect(fileHelper.updateProcess).toHaveBeenCalledWith('existingId', testBpmn);
    });

    it('dispatches event informing about the change of the processes information', () => {
      expect(eventHandler.dispatch).toHaveBeenCalledWith('processUpdated', {
        oldId: 'existingId',
        updatedInfo: newMetadata,
      });
    });
  });

  describe('removeProcess', () => {
    beforeEach(async () => {
      await processController.removeProcess('existingId');
    });

    it('removes process for future request', () => {
      expect(processController.getProcesses()).toStrictEqual([]);
    });

    it('removes process from store', () => {
      expect(store.remove).toHaveBeenCalledWith('processes', 'existingId');
    });

    it('removes stored bpmn', () => {
      expect(fileHelper.deleteProcess).toHaveBeenCalledWith('existingId');
    });

    it('dispatches event informing about the processes removal', () => {
      expect(eventHandler.dispatch).toHaveBeenCalledWith('processRemoved', {
        processDefinitionsId: 'existingId',
      });
    });
  });

  describe('getProcessBpmn', () => {
    it("throws if the process doesn't exist", async () => {
      await expect(processController.getProcessBpmn('nonExistantId')).rejects.toThrow(
        'Process with id nonExistantId does not exist!',
      );
    });

    it('does not throw platform information if reading the bpmn fails', async () => {
      fileHelper.getBPMN.mockImplementationOnce(() => {
        throw new Error('/complete/path/on/system does not exist');
      });
      await expect(processController.getProcessBpmn('existingId')).rejects.toThrow(
        'Unable to find process bpmn!',
      );
    });
  });

  describe('getProcessBpmn', () => {
    it("throws if the process doesn't exist", async () => {
      await expect(processController.getProcessBpmn('nonExistantId')).rejects.toThrow(
        'Process with id nonExistantId does not exist!',
      );
    });

    it('does not throw platform information if reading the bpmn fails', async () => {
      fileHelper.getBPMN.mockImplementationOnce(() => {
        throw new Error('/complete/path/on/system does not exist');
      });
      await expect(processController.getProcessBpmn('existingId')).rejects.toThrow(
        'Unable to find process bpmn!',
      );
    });
  });
});
