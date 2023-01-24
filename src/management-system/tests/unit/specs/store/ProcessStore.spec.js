import uuid from 'uuid';
import Vue from 'vue';
import Vuex from 'vuex';
import ProcessInterface from '../../../mocks/ProcessInterface.js';
import { createProcess } from '@/frontend/../shared-frontend-backend/helpers/processHelpers.js';
import { initXml } from '@proceed/bpmn-helper';

jest.mock('@proceed/bpmn-helper/src/PROCEED-CONSTANTS.js', () => ({
  generateBpmnId: jest.fn().mockReturnValue(1),
  generateDefinitionsId: jest.fn().mockReturnValue('_1'),
  getExporterName: jest.fn().mockReturnValue('exporterName'),
  getExporterVersion: jest.fn().mockReturnValue('0.0.1'),
  generateTargetNamespace: jest
    .fn()
    .mockImplementation((id) => `https://docs.proceed-labs.org/${id}`),
  initXml: jest
    .fn()
    .mockImplementation(() =>
      jest
        .requireActual('@proceed/bpmn-helper/src/PROCEED-CONSTANTS.js')
        .initXml('Process_1', 'StartEvent_1')
    ),
}));

jest.mock('@/frontend/helpers/iam/permissions/permissions-handler.js', () => ({
  addResourcePermission: () => {
    return {
      Process: {
        conditions: {
          ['_e6e8f150-815f-4093-b405-650afe5bd4ef']: 16,
        },
      },
    };
  },
  initResourcePermissions: () => {
    return {
      Process: {
        conditions: {
          '_2c0df1f2-fa58-4918-8ab3-16defd87e932': 9007199254740991,
        },
      },
      Project: {
        conditions: {
          '_996ae147-4ac6-4420-9b48-ed63fa9ee4e5': 9007199254740991,
        },
      },
    };
  },
}));

Vue.use(Vuex);

let createProcessStore;
describe('Process store', () => {
  beforeAll(async () => {
    createProcessStore = (await import('@/frontend/stores/process.js')).default;
  });

  const createMockProcess = () => ({
    id: uuid.v4(),
    originalId: undefined,
    owner: null,
    name: 'this-is-a-random-name',
    createdOn: new Date().toUTCString(),
    lastEdited: expect.any(String),
    variables: [],
    description: '',
    processIds: ['Process_1'],
    type: 'process',
    departments: [],
    inEditingBy: [],
    shared: false,
    versions: [],
  });

  const p1 = createMockProcess();
  const p2 = createMockProcess();
  const p3 = createMockProcess();

  let store;
  let mockProcess;
  beforeEach(async () => {
    jest.clearAllMocks();
    ProcessInterface.prototype.getProcesses.mockReturnValue([p1, p2, p3]);

    store = new Vuex.Store({
      modules: {
        processStore: createProcessStore(),
        authStore: {
          namespaced: true,
          mutations: {
            SET_PERMISSIONS: () => {},
          },
          getters: {
            isAuthenticated: () => true,
            getPermissions: () => ({ Process: {} }),
          },
        },
      },
    });

    mockProcess = createMockProcess();
    await store.dispatch('processStore/loadProcesses');
  });

  describe('init state', () => {
    test('should initilize with processes from provided repository', () => {
      expect(store.getters['processStore/processes']).toHaveLength(3);
      expect(store.getters['processStore/processes']).toContainEqual(p1);
      expect(store.getters['processStore/processes']).toContainEqual(p2);
      expect(store.getters['processStore/processes']).toContainEqual(p3);
    });
  });

  describe('getters', () => {
    test('it should get process by id when exists', () => {
      expect(store.getters['processStore/processById'](p1.id)).toEqual(p1);
    });

    test('it should return null when process by id does not exist', () => {
      expect(store.getters['processStore/processById'](uuid.v4())).toBeUndefined();
    });
  });

  describe('actions', () => {
    describe('add process when list is empty', () => {
      beforeEach(async () => {
        ProcessInterface.prototype.getProcesses.mockReturnValueOnce([]);
        await store.dispatch('processStore/loadProcesses');
      });
      test('should have added the process', async () => {
        await store.dispatch('processStore/add', { process: mockProcess, bpmn: initXml() });
        expect(store.getters['processStore/processes']).toHaveLength(1);
        expect(store.getters['processStore/processes']).toContainEqual(mockProcess);
      });

      test('should have called the process controller with new process list', async () => {
        await store.dispatch('processStore/add', { process: mockProcess, bpmn: initXml() });
        const { metaInfo, bpmn } = await createProcess({ ...mockProcess, bpmn: initXml() });
        expect(ProcessInterface.prototype.addProcess).toHaveBeenCalledWith({ ...metaInfo, bpmn });
      });
    });

    describe('add process with id conflict', () => {
      test('should not have added the process', async () => {
        await store.dispatch('processStore/add', { process: p1, bpmn: initXml() });
        expect(store.getters['processStore/processes']).toHaveLength(3);
      });

      test('should not have called db store', async () => {
        await store.dispatch('processStore/add', { process: p1, bpmn: initXml() });
        expect(ProcessInterface.prototype.addProcess).not.toHaveBeenCalled();
      });
    });

    describe('add process to end of list', () => {
      test('should have added the process', async () => {
        await store.dispatch('processStore/add', { process: mockProcess, bpmn: initXml() });
        expect(store.getters['processStore/processes']).toHaveLength(4);
        expect(store.getters['processStore/processes'][3]).toEqual(mockProcess);
      });

      test('should have called the process controller with new process', async () => {
        await store.dispatch('processStore/add', { process: mockProcess, bpmn: initXml() });
        const { metaInfo, bpmn } = await createProcess({ ...mockProcess, bpmn: initXml() });
        expect(ProcessInterface.prototype.addProcess).toHaveBeenCalledWith({ ...metaInfo, bpmn });
      });
    });

    describe('remove non-existent process', () => {
      test('should not have removed anything', async () => {
        await store.dispatch('processStore/remove', { id: uuid.v4() });
        expect(store.getters['processStore/processes']).toHaveLength(3);
      });

      test('should not have called db store', async () => {
        await store.dispatch('processStore/remove', { id: uuid.v4() });
        expect(store.getters['processStore/processes']).toHaveLength(3);
        expect(ProcessInterface.prototype.removeProcess).not.toHaveBeenCalled();
      });
    });

    describe('remove process with existing id', () => {
      test('should have removed the process', async () => {
        await store.dispatch('processStore/remove', { id: p2.id });
        expect(store.getters['processStore/processes']).toHaveLength(2);
        expect(store.getters['processStore/processes']).not.toContainEqual(p2);
      });

      test('should have called db to remove process with given id', async () => {
        await store.dispatch('processStore/remove', { id: p2.id });
        expect(ProcessInterface.prototype.removeProcess).toHaveBeenCalledWith(p2.id);
      });
    });

    describe('update process when not exists', () => {
      test('should not have removed anything', async () => {
        await store.dispatch('processStore/update', { id: mockProcess.id, changes: mockProcess });
        expect(store.getters['processStore/processes']).toHaveLength(3);
        expect(store.getters['processStore/processes']).not.toContainEqual(mockProcess);
      });

      test('should not have called db store', async () => {
        await store.dispatch('processStore/update', { id: mockProcess.id, changes: mockProcess });
        expect(ProcessInterface.prototype.updateProcessMetaData).not.toHaveBeenCalled();
      });
    });

    describe('update process if exists', () => {
      test('should have updated the process', async () => {
        mockProcess.name = 'changed-name';
        mockProcess.bpmn =
          '<?xml version="1.0" encoding="UTF-8"?><bpmn2:definitions></bpmn2:definitions>`,';
        mockProcess.variables.push({ name: 'amount', type: 'number' });
        const p2Temp = Object.assign({}, p2); // clone object, because `mergeIntoObject` in process store alters p2 as well
        await store.dispatch('processStore/update', { id: p2Temp.id, changes: mockProcess });
        expect(store.getters['processStore/processes']).toHaveLength(3);
        expect(store.getters['processStore/processes']).not.toContainEqual(p2Temp);
        const merge = { ...p2Temp, ...mockProcess };
        delete merge.bpmn;
        expect(store.getters['processStore/processes']).toContainEqual(merge);
      });

      test('should have called the db store with process update', async () => {
        mockProcess.name = 'changed-name';
        mockProcess.bpmn =
          '<?xml version="1.0" encoding="UTF-8"?><bpmn2:definitions></bpmn2:definitions>`,';
        mockProcess.variables.push({ name: 'amount', type: 'number' });
        const p2Temp = Object.assign({}, p2); // clone object, because `mergeIntoObject` in process store alters p2 as well
        await store.dispatch('processStore/update', { id: p2Temp.id, changes: mockProcess });
        const merge = { ...p2Temp, ...mockProcess };
        expect(ProcessInterface.prototype.updateProcessMetaData).toHaveBeenCalledWith(
          p2Temp.id,
          merge
        );
      });
    });

    describe('update process bpmn with uuid when not exists', () => {
      test('should not have updated anything', async () => {
        await store.dispatch('processStore/updateBpmn', {
          id: uuid.v4(),
          bpmn: '<custom-xml></custom-xml>',
        });
        expect(store.getters['processStore/processes']).toHaveLength(3);
        expect(store.getters['processStore/processes']).toContainEqual(p1);
        expect(store.getters['processStore/processes']).toContainEqual(p2);
        expect(store.getters['processStore/processes']).toContainEqual(p3);
      });

      test('should not have called the db store', async () => {
        await store.dispatch('processStore/updateBpmn', {
          id: uuid.v4(),
          bpmn: '<custom-xml></custom-xml>',
        });
        expect(ProcessInterface.prototype.updateProcess).not.toHaveBeenCalled();
      });
    });

    describe('update process bpmn with uuid', () => {
      test('should have updated the process', async () => {
        // set to true to test functionality for local processes and electron
        p2.local = true;
        const newBPMN = (await createProcess({ name: 'testName', bpmn: initXml() })).bpmn;
        const p2Temp = Object.assign({}, p2); // clone object, because `mergeIntoObject` in process store alters p2 as well
        await store.dispatch('processStore/updateBpmn', {
          id: p2Temp.id,
          name: 'this-is-a-random-name',
          bpmn: newBPMN,
        });
        expect(store.getters['processStore/processes']).toHaveLength(3);
        expect(ProcessInterface.prototype.updateProcess).toHaveBeenCalledWith(p2Temp.id, {
          bpmn: expect.any(String),
        });
      });
    });
  });
});
