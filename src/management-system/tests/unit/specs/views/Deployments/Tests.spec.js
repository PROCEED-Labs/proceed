import { shallowMount, createLocalVue } from '@vue/test-utils';
import Vuex from 'vuex';
import fs from 'fs';
import path from 'path';
import createMachineStore from '@/frontend/stores/machine.js';
import createDeploymentStore from '@/frontend/stores/deployment.js';
import DataInterface from '../../../mocks/DataInterface.js';

const baseBPMN = fs.readFileSync(
  path.resolve(__dirname, '../../../../data/bpmn/baseBPMN.xml'),
  'utf8',
);

jest.mock('@/frontend/main.js', () => ({
  store: {},
}));

jest.mock('@proceed/machine', () => ({
  logging: {
    getLogger: () => ({}),
  },
}));

jest.mock('@/backend/server/iam/middleware/authorization', () => ({
  isAllowed: () => true,
}));

jest.mock('@/backend/server/iam/middleware/requestValidation.js', () => ({
  validate: () => true,
  validateRequest: () => true,
}));

const localVue = createLocalVue();
localVue.use(Vuex);

const mockMachine = {
  id: 'abc123',
  ip: '192.168.1.1',
  port: 33029,
  status: 'CONNECTED',
};

const mockDeployments = {
  xyz789: {
    definitionId: 'xyz789',
    machines: [mockMachine.id],
    instances: {
      'xyz789-1': {
        processInstanceId: 'xyz789-1',
        processVersion: 10,
        globalStartTime: 0,
        machines: [mockMachine.id],
      },
    },
    runningInstances: {},
  },
};

describe('Deployments', () => {
  let Deployments;
  let store;
  let wrapper;
  let mockProcesses = [];
  const mockUpdateBpmn = jest.fn();

  beforeEach(async (done) => {
    Deployments = (await import('@/frontend/views/Deployments.vue')).default;
    mockUpdateBpmn.mockClear();
    mockProcesses = [{ id: 'xyz789', name: 'Test', type: 'process' }];

    store = new Vuex.Store({
      modules: {
        processStore: {
          getters: {
            processes: () => mockProcesses,
          },
          actions: {
            updateWholeXml: mockUpdateBpmn,
          },
          namespaced: true,
        },
        deploymentStore: createDeploymentStore(),
        machineStore: createMachineStore(),
      },
    });
    DataInterface.prototype.get.mockReturnValue([]);
    DataInterface.prototype.set.mockReset();

    await store.commit('machineStore/add', mockMachine);
    await store.commit('deploymentStore/setDeployments', mockDeployments);

    wrapper = shallowMount(Deployments, { store, localVue });

    done();
  });

  describe('computed', () => {
    it('returns processes in vuex store', () => {
      expect(wrapper.vm.processes).toEqual(mockProcesses);
    });
    it('returns object with information about to be deployed process', () => {
      wrapper.vm.deployDefinitionId = 'xyz789';
      const deployProcess = wrapper.vm.processes.find(
        (process) => process.id === wrapper.vm.deployDefinitionId,
      );
      expect(deployProcess).toEqual(mockProcesses[0]);
    });
    describe('computed deployedProcesses', () => {
      let newMachine;
      let changedDeployment;
      let newDeployment;
      beforeEach(async () => {
        newMachine = {
          id: 'def456',
          ip: '192.168.1.2',
          port: 33029,
          status: 'CONNECTED',
        };

        changedDeployment = {
          definitionId: 'xyz789',
          machines: [mockMachine.id, newMachine.id],
          instances: {
            'xyz789-1': {
              processInstanceId: 'xyz789-1',
              globalStartTime: 0,
              processVersion: 10,
              machines: [mockMachine.id, newMachine.id],
            },
          },
          runningInstances: { 'xyz789-1': [newMachine.id] },
        };

        newDeployment = {
          definitionId: 'fgh345',
          machines: [newMachine.id],
          instances: {
            'fgh345-1': {
              processInstanceId: 'fgh345-1',
              processVersion: 5,
              globalStartTime: 10,
              machines: [newMachine.id],
            },
          },
          runningInstances: {},
        };

        await store.commit('machineStore/add', newMachine);
        await store.commit('deploymentStore/updateDeployment', {
          processDefinitionsId: 'xyz789',
          info: changedDeployment,
        });
        await store.commit('deploymentStore/updateDeployment', {
          processDefinitionsId: 'fgh345',
          info: newDeployment,
        });
      });

      it('returns an object containing sorted deployments of local and external processes', async (done) => {
        await wrapper.vm.$nextTick();

        expect(wrapper.vm.sortedDeployments).toStrictEqual({
          local: [
            {
              definitionId: 'xyz789',
              instances: changedDeployment.instances,
              runningInstances: ['xyz789-1'],
              endedInstances: [],
              type: 'process',
              machines: [mockMachine.id, newMachine.id],
            },
          ],
          external: [
            {
              definitionId: 'fgh345',
              instances: newDeployment.instances,
              runningInstances: [],
              endedInstances: ['fgh345-1'],
              machines: [newMachine.id],
            },
          ],
        });

        done();
      });
      it('returns an object containing information about all process deployments on all machines', async (done) => {
        wrapper.vm.$nextTick(() => {
          expect(wrapper.vm.deployedProcesses).toStrictEqual([
            {
              definitionId: 'xyz789',
              instances: changedDeployment.instances,
              runningInstances: ['xyz789-1'],
              endedInstances: [],
              machines: [mockMachine.id, newMachine.id],
            },
            {
              definitionId: 'fgh345',
              instances: newDeployment.instances,
              endedInstances: ['fgh345-1'],
              runningInstances: [],
              machines: [newMachine.id],
            },
          ]);
          done();
        });
      });
    });
  });
  describe('methods', () => {
    describe('saveMachineMapping', () => {
      it('write the given machineMapping into the process bpmn', async () => {
        wrapper.vm.deployProcessXml = baseBPMN;
        wrapper.vm.deployDefinitionId = mockProcesses[0].id;
        await wrapper.vm.saveMachineMapping({ StartEvent_1: { machineId: 'abc123' } });

        expect(mockUpdateBpmn).toHaveBeenCalledTimes(1);
        expect(mockUpdateBpmn.mock.calls[0][1].bpmn.includes('machineId="abc123"')).toBe(true);
      });
    });
  });
});
