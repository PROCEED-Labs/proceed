import uuid from 'uuid';
import Vue from 'vue';

import Vuex from 'vuex';
import createCapabilityStore from '@/frontend/stores/capability.js';
import DataInterface from '../../../mocks/DataInterface.js';

Vue.use(Vuex);

describe('Capability store', () => {
  const createMockCapability = (name, machineId) => ({
    id: uuid.v4(),
    name,
    machineIds: machineId ? [machineId] : [],
  });

  const c1 = createMockCapability('Capability1');
  const c1b = createMockCapability('Capability1');
  const c2 = createMockCapability('Capability2');
  const dc1 = createMockCapability('Capability3', 'machine_1');
  const dc2 = createMockCapability('Capability4', 'machine_1');
  const dc3 = createMockCapability('Capability5', 'machine_2');

  let capabilityStore;
  let mockCapability;

  beforeEach(async () => {
    capabilityStore = new Vuex.Store(createCapabilityStore());
    DataInterface.prototype.get.mockReturnValue([c1, c1b, c2, dc1, dc2, dc3]);
    DataInterface.prototype.set.mockReset();
    await capabilityStore.dispatch('loadCapabilities');
    mockCapability = createMockCapability();
  });

  describe('actions', () => {
    describe('add capability when list is empty', () => {
      beforeEach(() => {
        DataInterface.prototype.get = jest.fn().mockReturnValue([]);
        capabilityStore = new Vuex.Store(createCapabilityStore());
        capabilityStore.dispatch('loadCapabilities');
      });
      test('should have added the capability', () => {
        capabilityStore.dispatch('add', { capability: mockCapability });
        expect(capabilityStore.getters.capabilities).toHaveLength(1);
        expect(capabilityStore.getters.capabilities).toContainEqual(mockCapability);
      });
    });

    describe('add capability to start of list', () => {
      test('should have added the capability', () => {
        capabilityStore.dispatch('add', { capability: mockCapability });
        expect(capabilityStore.getters.capabilities).toHaveLength(7);
        expect(capabilityStore.getters.capabilities[0]).toEqual(mockCapability);
      });
    });

    describe('remove non-existent capability', () => {
      test('should not remove anything', () => {
        capabilityStore.dispatch('remove', { id: uuid.v4() });
        expect(capabilityStore.getters.capabilities).toHaveLength(6);
      });
    });

    describe('remove capability with existing id', () => {
      test('should remove capability with existing id', () => {
        capabilityStore.dispatch('remove', { id: c2.id });
        expect(capabilityStore.getters.capabilities).toHaveLength(5);
        expect(capabilityStore.getters.capabilities).not.toContainEqual(c2);
      });
    });

    describe('update capability with incorrect uuid', () => {
      test('should not updated anything', () => {
        capabilityStore.dispatch('update', { capability: mockCapability });
        expect(capabilityStore.getters.capabilities).toHaveLength(6);
        expect(capabilityStore.getters.capabilities).not.toContainEqual(mockCapability);
      });
    });

    describe('update capability with uuid', () => {
      test('should update the capability', () => {
        mockCapability.name = 'changed-name';
        mockCapability.id = c2.id;
        mockCapability.serviceId = '';
        capabilityStore.dispatch('update', { capability: mockCapability });
        expect(capabilityStore.getters.capabilities).toHaveLength(6);
        expect(capabilityStore.getters.capabilities).not.toContainEqual(c2);
        expect(capabilityStore.getters.capabilities).toContainEqual(mockCapability);
      });
    });
  });
  describe('init state', () => {
    test('should initilize with capabilities from provided repository', () => {
      expect(capabilityStore.getters.capabilities).toHaveLength(6);
      expect(capabilityStore.getters.capabilities).toContainEqual(c1);
      expect(capabilityStore.getters.capabilities).toContainEqual(c1b);
      expect(capabilityStore.getters.capabilities).toContainEqual(c2);
      expect(capabilityStore.getters.capabilities).toContainEqual(dc1);
      expect(capabilityStore.getters.capabilities).toContainEqual(dc2);
      expect(capabilityStore.getters.capabilities).toContainEqual(dc3);
    });
  });
  describe('getters', () => {
    test('should get capability by id', () => {
      expect(capabilityStore.getters.capabilityById(c2.id)).toEqual(c2);
    });

    test('should get list of capability names without duplicates', () => {
      expect(capabilityStore.getters.uniqueCapabilityNames).toEqual([
        c1.name,
        c2.name,
        dc1.name,
        dc2.name,
        dc3.name,
      ]);
    });

    test('should get list of capabilities without an associated machine', () => {
      expect(capabilityStore.getters.machinelessCapabilities).toEqual([c1, c1b, c2]);
    });

    test('should get list of capabilities with at least one associated machine', () => {
      expect(capabilityStore.getters.capabilitiesWithMachine).toEqual([dc1, dc2, dc3]);
    });

    describe('mapping by capability or host', () => {
      test('should map discovered capabilities by capability', () => {
        const map = [{ machineId: '', capabilities: [c1, c1b, c2, dc1, dc2, dc3] }];
        expect(capabilityStore.getters.map(false)).toEqual(map);
      });

      test('should map discovered capabilities by host', () => {
        const map = [
          { machineId: 'machine_2', capabilities: [dc3] },
          { machineId: 'machine_1', capabilities: [dc1, dc2] },
          { machineId: '', capabilities: [c1, c1b, c2] },
        ];
        expect(capabilityStore.getters.map(true)).toEqual(map);
      });
    });
  });
});
