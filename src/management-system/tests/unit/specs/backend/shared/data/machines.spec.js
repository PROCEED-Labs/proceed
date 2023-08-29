/* eslint-disable max-lines */
jest.mock('@proceed/distribution', () => ({
  communication: {
    upCallbacks: [],
    downCallbacks: [],
    onMachineDiscovery: function (cb) {
      this.upCallbacks.push(cb);
    },
    onMachineUnpublishing: function (cb) {
      this.downCallbacks.push(cb);
    },
  },
}));

jest.mock('@/frontend/../backend/shared-electron-server/data/store.js', () => ({
  machines: [],
  get: jest.fn().mockImplementation(function () {
    return this.machines;
  }),
  add: jest.fn(),
  remove: jest.fn(),
  update: jest.fn(),
  updateByIds: jest.fn(),
}));

jest.mock(
  '@/frontend/../backend/shared-electron-server/network/machines/machineInfoRequests.js',
  () => ({
    checkAvailability: jest.fn().mockImplementation(async (machine) => {
      if (machine.discovered) {
        return true;
      } else {
        throw new Error();
      }
    }),
  }),
);

jest.mock('@/frontend/backend-api/event-system/EventHandler.js', () => ({
  dispatch: jest.fn(),
}));

jest.mock('@/frontend/../backend/shared-electron-server/logging.js', () => ({
  debug: jest.fn(),
}));

import { communication } from '@proceed/distribution';
import eventHandler from '@/frontend/backend-api/event-system/EventHandler.js';
import * as machineMerger from '@/frontend/../backend/shared-electron-server/data/machines.js';
import store from '@/frontend/../backend/shared-electron-server/data/store.js';

let upCallback;
let downCallback;

const sortById = (a, b) => {
  if (a.id < b.id) {
    return -1;
  }
  if (a.id > b.id) {
    return 1;
  }

  return 0;
};
const toInternal = (machine) => {
  const changed = { ...machine, machine: {} };
  if (machine.hostname) {
    changed.machine.hostname = machine.hostname;
  }
  return changed;
};

describe('Tests for the module that merges our discovered and stored machines into one list', () => {
  beforeEach(async () => {
    [upCallback] = communication.upCallbacks;
    [downCallback] = communication.downCallbacks;
    store.machines = [];
    jest.clearAllMocks();
    machineMerger.clearMachines();
  });

  describe('no known machines', () => {
    it('adds a newly discovered machine to the list of known machines with a discovered flag and status connected', async () => {
      const machine = { id: 1, ip: '1.1.1.1', port: 12345, hostname: 'Test' };
      await upCallback(machine);
      const addedMachine = toInternal({
        ...machine,
        discovered: true,
        status: 'CONNECTED',
      });
      expect(machineMerger.getMachines()).toStrictEqual([addedMachine]);
      expect(eventHandler.dispatch).toHaveBeenCalledWith('machineAdded', { machine: addedMachine });
    });

    it('adds a newly saved machine to the list of known machines with a stored flag, status disconnected and user defined name', async () => {
      const machine = {
        id: 1,
        ip: '1.1.1.1',
        port: 12345,
        hostname: 'Test',
        optionalName: 'optional',
      };
      await machineMerger.addMachine(machine);
      const addedMachine = toInternal({ ...machine, saved: true, status: 'DISCONNECTED' });
      expect(machineMerger.getMachines()).toStrictEqual([addedMachine]);
      expect(eventHandler.dispatch).toHaveBeenCalledWith('machineAdded', { machine: addedMachine });
      expect(store.add).toHaveBeenCalledWith('machines', machine);
    });
  });

  describe('existing known machines', () => {
    const saved = {
      id: 1,
      ip: '1.1.1.1',
      port: 12345,
      hostname: 'Machine 1',
      optionalName: 'Test 1',
    };
    const discovered = { id: 2, ip: '2.2.2.2', port: 54321, hostname: 'Machine 2' };
    const both = { id: 3, ip: '3.3.3.3', port: 67890, hostname: 'Machine 3' };
    beforeEach(async () => {
      await machineMerger.addMachine(saved);
      await upCallback(discovered);
      await machineMerger.addMachine({ ...both, optionalName: 'Test 3' });
      await upCallback(both);
      jest.clearAllMocks();
    });

    describe('discovered callback', () => {
      it('adds machine to the list of known machines with a discovered flag and status connected', async () => {
        const machine = { id: 4, ip: '4.4.4.4', port: 12345, hostname: 'Test' };
        await upCallback(machine);
        const addedMachine = toInternal({
          ...machine,
          discovered: true,
          status: 'CONNECTED',
        });
        expect(machineMerger.getMachines()).toStrictEqual([
          toInternal({ ...saved, saved: true, status: 'DISCONNECTED' }),
          toInternal({ ...discovered, discovered: true, status: 'CONNECTED' }),
          toInternal({
            ...both,
            optionalName: 'Test 3',
            discovered: true,
            saved: true,
            status: 'CONNECTED',
          }),
          addedMachine,
        ]);
        expect(eventHandler.dispatch).toHaveBeenCalledWith('machineAdded', {
          machine: addedMachine,
        });
      });

      it('sets discovered flag on already known machine when it is discovered and sets status to connected', async () => {
        await upCallback(saved);
        const updatedMachine = toInternal({
          ...saved,
          discovered: true,
          saved: true,
          status: 'CONNECTED',
        });
        expect(machineMerger.getMachines()).toStrictEqual([
          updatedMachine,
          toInternal({ ...discovered, discovered: true, status: 'CONNECTED' }),
          toInternal({
            ...both,
            optionalName: 'Test 3',
            discovered: true,
            saved: true,
            status: 'CONNECTED',
          }),
        ]);
        expect(eventHandler.dispatch).toHaveBeenCalledWith('machineUpdated', {
          oldId: saved.id,
          updatedInfo: updatedMachine,
        });
      });
    });

    describe('addMachine', () => {
      it('adds a newly saved machine to the list of known machines with a stored flag and status disconnected', async () => {
        const machine = {
          id: 4,
          ip: '4.4.4.4',
          port: 12345,
          hostname: 'Test',
          optionalName: 'Test 4',
        };
        await machineMerger.addMachine(machine);
        const addedMachine = toInternal({ ...machine, saved: true, status: 'DISCONNECTED' });
        expect(machineMerger.getMachines()).toStrictEqual([
          toInternal({ ...saved, saved: true, status: 'DISCONNECTED' }),
          toInternal({ ...discovered, discovered: true, status: 'CONNECTED' }),
          toInternal({
            ...both,
            optionalName: 'Test 3',
            discovered: true,
            saved: true,
            status: 'CONNECTED',
          }),
          addedMachine,
        ]);
        expect(eventHandler.dispatch).toHaveBeenCalledWith('machineAdded', {
          machine: addedMachine,
        });
        expect(store.add).toHaveBeenCalledWith('machines', machine);
      });

      it('sets saved flag on already known machine that is newly added by the user and adds user defined name', async () => {
        await machineMerger.addMachine({ ...discovered, optionalName: 'Test 2' });
        const updatedMachine = toInternal({
          ...discovered,
          optionalName: 'Test 2',
          discovered: true,
          saved: true,
          status: 'CONNECTED',
        });
        expect(machineMerger.getMachines()).toStrictEqual([
          toInternal({ ...saved, saved: true, status: 'DISCONNECTED' }),
          updatedMachine,
          toInternal({
            ...both,
            optionalName: 'Test 3',
            discovered: true,
            saved: true,
            status: 'CONNECTED',
          }),
        ]);
        expect(eventHandler.dispatch).toHaveBeenCalledWith('machineUpdated', {
          oldId: discovered.id,
          updatedInfo: updatedMachine,
        });
        expect(store.add).toHaveBeenCalledWith('machines', {
          ...discovered,
          optionalName: 'Test 2',
        });
      });
    });

    describe('unpublish callback', () => {
      it("removes a discovered machine if it wasn't saved", async () => {
        await downCallback(discovered);
        expect(machineMerger.getMachines()).toStrictEqual([
          toInternal({ ...saved, saved: true, status: 'DISCONNECTED' }),
          toInternal({
            ...both,
            optionalName: 'Test 3',
            discovered: true,
            saved: true,
            status: 'CONNECTED',
          }),
        ]);
        expect(eventHandler.dispatch).toHaveBeenCalledWith('machineRemoved', {
          machineId: discovered.id,
        });
      });

      it('sets the discovered and online flag to false and status to disconnected if the unpublished machine is stored', async () => {
        await downCallback(both);
        const updatedMachine = toInternal({
          ...both,
          optionalName: 'Test 3',
          saved: true,
          discovered: false,
          online: false,
          status: 'DISCONNECTED',
        });
        expect(machineMerger.getMachines()).toStrictEqual([
          toInternal({ ...saved, saved: true, status: 'DISCONNECTED' }),
          toInternal({ ...discovered, discovered: true, status: 'CONNECTED' }),
          updatedMachine,
        ]);
        expect(eventHandler.dispatch).toHaveBeenCalledWith('machineUpdated', {
          oldId: both.id,
          updatedInfo: updatedMachine,
        });
      });
    });

    describe('removeMachine', () => {
      it("removes a stored machine if it isn't seen via discovery", async () => {
        await machineMerger.removeMachine(saved.id);
        expect(machineMerger.getMachines()).toStrictEqual([
          toInternal({ ...discovered, discovered: true, status: 'CONNECTED' }),
          toInternal({
            ...both,
            optionalName: 'Test 3',
            discovered: true,
            saved: true,
            status: 'CONNECTED',
          }),
        ]);
        expect(eventHandler.dispatch).toHaveBeenCalledWith('machineRemoved', {
          machineId: saved.id,
        });
        expect(store.remove).toHaveBeenCalledWith('machines', saved.id);
      });

      it('sets the saved flag to false if the deleted machine is still discovered, keeps user defined name, remove from store', async () => {
        await machineMerger.removeMachine(both.id);
        const updatedMachine = toInternal({
          ...both,
          optionalName: 'Test 3',
          discovered: true,
          saved: false,
          status: 'CONNECTED',
        });
        expect(machineMerger.getMachines()).toStrictEqual([
          toInternal({ ...saved, saved: true, status: 'DISCONNECTED' }),
          toInternal({ ...discovered, discovered: true, status: 'CONNECTED' }),
          updatedMachine,
        ]);
        expect(eventHandler.dispatch).toHaveBeenCalledWith('machineUpdated', {
          oldId: both.id,
          updatedInfo: updatedMachine,
        });
        expect(store.remove).toHaveBeenCalledWith('machines', both.id);
      });
    });

    describe('updateMachine', () => {
      it('updates known stored machine and pushes some info to store', async () => {
        await machineMerger.updateMachine(1, {
          ...saved,
          optionalName: 'new name',
          newInfo: 'some info',
        });
        const updatedMachine = toInternal({
          ...saved,
          optionalName: 'new name',
          newInfo: 'some info',
          saved: true,
          status: 'DISCONNECTED',
        });
        expect(machineMerger.getMachines()).toStrictEqual([
          updatedMachine,
          toInternal({ ...discovered, discovered: true, status: 'CONNECTED' }),
          toInternal({
            ...both,
            optionalName: 'Test 3',
            discovered: true,
            saved: true,
            status: 'CONNECTED',
          }),
        ]);
        expect(eventHandler.dispatch).toHaveBeenCalledWith('machineUpdated', {
          oldId: 1,
          updatedInfo: updatedMachine,
        });
        expect(store.update).toHaveBeenCalledWith('machines', 1, {
          ...saved,
          optionalName: 'new name',
        });
      });

      // we don't want to allow a user to change information about a machine that would invalidate the existing connection
      // e.g. changing the ip or port that we are connecting to doesn't make sense since this would target another machine
      // changing the id or hostname doesn't make sense either since we got these informations from the machine that should know them better
      it("doesn't allow changing unchangeable machine information of a connected machine", async () => {
        await machineMerger.updateMachine(both.id, {
          ip: 'some other ip',
          port: 1111,
          hostname: 'some other name',
          id: 123,
        });
        expect(machineMerger.getMachines()).toStrictEqual([
          toInternal({ ...saved, saved: true, status: 'DISCONNECTED' }),
          toInternal({ ...discovered, discovered: true, status: 'CONNECTED' }),
          toInternal({
            ...both,
            optionalName: 'Test 3',
            discovered: true,
            saved: true,
            status: 'CONNECTED',
          }),
        ]);
        expect(eventHandler.dispatch).toBeCalledTimes(0);
        expect(store.update).toBeCalledTimes(0);
      });
    });
  });

  describe('handling of incomplete machines', () => {
    const noHostname = { id: 'temp 1', ip: '1.1.1.1', port: 12345, optionalName: 'Test 1' };
    const noIp = { id: 'temp 2', hostname: 'Machine 2', optionalName: 'Test 2' };
    const differentId = {
      id: 'differentId',
      ip: '4.4.4.4',
      port: 67890,
      hostname: 'Machine 4',
      optionalName: 'Test 4',
    };
    const discovered = { id: '3', ip: '3.3.3.3', port: 67890, hostname: 'Machine 3' };
    beforeEach(async () => {
      await machineMerger.addMachine(noHostname);
      await machineMerger.addMachine(noIp);
      await machineMerger.addMachine(differentId);
      await upCallback(discovered);
    });

    describe('discovery callback', () => {
      it('extends a matching known machine with missing hostname and sends update to store', async () => {
        const sameIpAndPort = { id: '1', ip: '1.1.1.1', port: 12345, hostname: 'Test' };
        await upCallback(sameIpAndPort);
        const updatedMachine = toInternal({
          id: '1',
          ip: '1.1.1.1',
          port: 12345,
          hostname: 'Test',
          optionalName: 'Test 1',
          saved: true,
          discovered: true,
          status: 'CONNECTED',
        });
        expect(machineMerger.getMachines().sort(sortById)).toStrictEqual(
          [
            updatedMachine,
            toInternal({ ...noIp, saved: true, status: 'DISCONNECTED' }),
            toInternal({ ...differentId, saved: true, status: 'DISCONNECTED' }),
            toInternal({ ...discovered, discovered: true, status: 'CONNECTED' }),
          ].sort(sortById),
        );
        expect(eventHandler.dispatch).toHaveBeenCalledWith('machineUpdated', {
          oldId: noHostname.id,
          updatedInfo: updatedMachine,
        });
        expect(store.update).toHaveBeenCalledWith('machines', noHostname.id, {
          ...noHostname,
          id: '1',
          hostname: 'Test',
        });
      });

      it('extends a matching known machine with missing network information and sends update to store', async () => {
        const sameHostname = { id: '2', ip: '2.2.2.2', port: 54321, hostname: 'Machine 2' };
        await upCallback(sameHostname);
        const updatedMachine = toInternal({
          id: '2',
          ip: '2.2.2.2',
          port: 54321,
          hostname: 'Machine 2',
          optionalName: 'Test 2',
          saved: true,
          discovered: true,
          status: 'CONNECTED',
        });
        expect(machineMerger.getMachines().sort(sortById)).toStrictEqual(
          [
            toInternal({
              ...noHostname,
              saved: true,
              status: 'DISCONNECTED',
            }),
            updatedMachine,
            toInternal({ ...differentId, saved: true, status: 'DISCONNECTED' }),
            toInternal({ ...discovered, discovered: true, status: 'CONNECTED' }),
          ].sort(sortById),
        );
        expect(eventHandler.dispatch).toHaveBeenCalledWith('machineUpdated', {
          oldId: noIp.id,
          updatedInfo: updatedMachine,
        });
        expect(store.update).toHaveBeenCalledWith('machines', noIp.id, {
          ...noIp,
          id: '2',
          ip: '2.2.2.2',
          port: 54321,
        });
      });

      it('updates the id of a machine matching all other information and sends update to store', async () => {
        const sameInfoDiffId = {
          id: 'someId',
          ip: '4.4.4.4',
          port: 67890,
          hostname: 'Machine 4',
        };
        await upCallback(sameInfoDiffId);
        const updatedMachine = toInternal({
          id: 'someId',
          ip: '4.4.4.4',
          port: 67890,
          hostname: 'Machine 4',
          optionalName: 'Test 4',
          saved: true,
          discovered: true,
          status: 'CONNECTED',
        });
        expect(machineMerger.getMachines().sort(sortById)).toStrictEqual(
          [
            toInternal({
              ...noHostname,
              saved: true,
              status: 'DISCONNECTED',
            }),
            toInternal({
              ...noIp,
              saved: true,
              status: 'DISCONNECTED',
            }),
            updatedMachine,
            toInternal({ ...discovered, discovered: true, status: 'CONNECTED' }),
          ].sort(sortById),
        );
        expect(eventHandler.dispatch).toHaveBeenCalledWith('machineUpdated', {
          oldId: differentId.id,
          updatedInfo: updatedMachine,
        });
        expect(store.update).toHaveBeenCalledWith('machines', differentId.id, {
          ...differentId,
          id: 'someId',
        });
      });
    });

    describe('addMachine', () => {
      it('updates the known discovered machine when given matching machine with missing hostname (and temporary id)', async () => {
        const added = { id: 'someId', ip: '3.3.3.3', port: 67890, optionalName: 'Test 3' };
        await machineMerger.addMachine(added);
        const updatedMachine = toInternal({
          ...discovered,
          optionalName: 'Test 3',
          discovered: true,
          saved: true,
          status: 'CONNECTED',
        });
        expect(machineMerger.getMachines().sort(sortById)).toStrictEqual(
          [
            toInternal({
              ...noHostname,
              saved: true,
              status: 'DISCONNECTED',
            }),
            toInternal({
              ...noIp,
              saved: true,
              status: 'DISCONNECTED',
            }),
            toInternal({
              ...differentId,
              saved: true,
              status: 'DISCONNECTED',
            }),
            updatedMachine,
          ].sort(sortById),
        );
        expect(eventHandler.dispatch).toHaveBeenCalledWith('machineUpdated', {
          oldId: discovered.id,
          updatedInfo: updatedMachine,
        });
        expect(store.add).toHaveBeenCalledWith('machines', {
          ...added,
          id: '3',
          hostname: 'Machine 3',
        });
      });

      it('updates the known discovered machine when given a matching machine with missing network information (and temporary id)', async () => {
        const added = { id: 'someId', hostname: 'Machine 3', optionalName: 'Test 3' };
        await machineMerger.addMachine(added);
        const updatedMachine = toInternal({
          ...discovered,
          optionalName: 'Test 3',
          discovered: true,
          saved: true,
          status: 'CONNECTED',
        });
        expect(machineMerger.getMachines().sort(sortById)).toStrictEqual(
          [
            toInternal({
              ...noHostname,
              saved: true,
              status: 'DISCONNECTED',
            }),
            toInternal({
              ...noIp,
              saved: true,
              status: 'DISCONNECTED',
            }),
            toInternal({
              ...differentId,
              saved: true,
              status: 'DISCONNECTED',
            }),
            updatedMachine,
          ].sort(sortById),
        );
        expect(eventHandler.dispatch).toHaveBeenCalledWith('machineUpdated', {
          oldId: discovered.id,
          updatedInfo: updatedMachine,
        });
        expect(store.add).toHaveBeenCalledWith('machines', {
          ...added,
          id: '3',
          ip: '3.3.3.3',
          port: 67890,
        });
      });
    });
  });
});
