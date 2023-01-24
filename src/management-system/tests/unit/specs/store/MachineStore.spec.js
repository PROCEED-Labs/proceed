import * as R from 'ramda';
import uuid from 'uuid';
import Vue from 'vue';
import Vuex from 'vuex';
import DataInterface from '../../../mocks/DataInterface.js';
import createMachineStore from '@/frontend/stores/machine.js';

Vue.use(Vuex);

describe('Machine store', () => {
  const createMockMachine = () => ({
    id: uuid.v4(),
    name: 'this-is-a-random-name',
    ip: '125.152.616',
    ports: [3000, 5000],
    protocol: 'http',
    status: 'DISCONNECTED',
    saved: true,
  });

  const d1 = createMockMachine();
  const d2 = createMockMachine();
  const d3 = createMockMachine();

  let machineStore;
  let mockMachine;

  beforeEach(async () => {
    machineStore = new Vuex.Store(createMachineStore());
    DataInterface.prototype.getMachines.mockReturnValue([d1, d2, d3]);
    DataInterface.prototype.set.mockReset();
    await machineStore.dispatch('loadMachines');
    mockMachine = createMockMachine();
  });

  describe('init state', () => {
    test('should initilize with machines from provided repository', () => {
      expect(machineStore.getters.machines).toHaveLength(3);
      expect(machineStore.getters.machines).toContainEqual(d1);
      expect(machineStore.getters.machines).toContainEqual(d2);
      expect(machineStore.getters.machines).toContainEqual(d3);
    });
  });

  describe('getters', () => {
    test('should give a unique color for each machine', () => {
      const uniqueColors = R.compose(
        R.uniq,
        R.map(({ id }) => machineStore.getters.color(id))
      )(machineStore.getters.machines);
      expect(uniqueColors).toHaveLength(machineStore.getters.machines.length);
    });

    test('should get machine by id', () => {
      expect(machineStore.getters.machineById(d2.id)).toEqual(d2);
    });
  });

  describe('mutations', () => {
    describe('add machine when list is empty', () => {
      beforeEach(() => {
        machineStore = new Vuex.Store(createMachineStore());
        DataInterface.prototype.getMachines = jest.fn().mockReturnValue([]);
        machineStore.dispatch('loadMachines');
      });
      test('should have added the machine', () => {
        machineStore.commit('add', mockMachine);
        expect(machineStore.getters.machines).toHaveLength(1);
        expect(machineStore.getters.machines).toContainEqual(mockMachine);
      });
    });

    describe('add machine with id conflict', () => {
      test('should not add the machine', () => {
        machineStore.commit('add', d1);
        expect(machineStore.getters.machines).toHaveLength(3);
      });
    });

    describe('add machine to end of list', () => {
      test('should have added the machine', () => {
        machineStore.commit('add', mockMachine);
        expect(machineStore.getters.machines).toHaveLength(4);
        expect(machineStore.getters.machines[3]).toEqual(mockMachine);
      });
    });

    describe('remove non-existent machine', () => {
      test('should not remove anything', () => {
        machineStore.commit('remove', 'non-existant-id');
        expect(machineStore.getters.machines).toHaveLength(3);
      });
    });

    describe('remove machine with existing id', () => {
      test('remove machine with existing id', () => {
        machineStore.commit('remove', d2.id);
        expect(machineStore.getters.machines).toHaveLength(2);
        expect(machineStore.getters.machines).not.toContainEqual(d2);
      });
    });

    describe('update machine with incorrect uuid', () => {
      test('should not updated anything', () => {
        machineStore.commit('update', { machineId: 'non-existant-id', machine: mockMachine });
        expect(machineStore.getters.machines).toHaveLength(3);
        expect(machineStore.getters.machines).not.toContainEqual(mockMachine);
      });
    });

    describe('update machine with uuid', () => {
      test('should update the machine', () => {
        mockMachine.name = 'changed-name';
        mockMachine.ip = 'changed-host';
        mockMachine.ports = [5000, 6000];
        mockMachine.id = 'some-id';
        machineStore.commit('update', { machineId: d2.id, machine: mockMachine });
        expect(machineStore.getters.machines).toHaveLength(3);
        expect(machineStore.getters.machines).not.toContainEqual(d2);
        expect(machineStore.getters.machines).toContainEqual(mockMachine);
      });
    });
  });
});
