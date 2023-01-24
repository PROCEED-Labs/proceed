import * as R from 'ramda';
import * as d3 from 'd3';
import { eventHandler, dataInterface } from '@/frontend/backend-api/index.js';

export default function createMachineStore() {
  const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

  const initialState = {
    machines: [],
  };

  const getters = {
    machines(state) {
      return state.machines;
    },
    savedMachines(state) {
      return state.machines.filter((machine) => !!machine.saved);
    },
    discoveredMachines(state) {
      return state.machines.filter((machine) => !machine.saved);
    },
    machineById(state) {
      return (id) =>
        R.find(R.propEq('id', id), state.machines)
          ? R.find(R.propEq('id', id), state.machines)
          : R.find(R.propEq('internalId', id), state.machines);
    },
    machineByHost(state) {
      return (ip) => R.find(R.propEq('ip', ip), state.machines);
    },
    color() {
      return (id) => colorScale(id);
    },
  };

  const actions = {
    async loadMachines({ state, commit, dispatch }) {
      const machines = await dataInterface.getMachines();

      eventHandler.on('machinesChanged', ({ machines }) => {
        commit('setMachines', [...machines]);
      });

      eventHandler.on('machineAdded', ({ machine }) => {
        commit('add', machine);
      });

      eventHandler.on('machineRemoved', ({ machineId }) => {
        commit('remove', machineId);
      });

      eventHandler.on('machineUpdated', ({ oldId, updatedInfo }) => {
        commit('update', { machineId: oldId, machine: updatedInfo });
      });

      commit('setMachines', machines);
    },
    async add(_, { machine }) {
      // machines are handled in the backend and then pushed to the frontend
      await dataInterface.addMachine(machine);
    },
    async remove(_, { id }) {
      // machines are handled in the backend and then pushed to the frontend
      await dataInterface.removeMachine(id);
    },
    async update(_, { machine }) {
      // machines are handled in the backend and then pushed to the frontend
      await dataInterface.updateMachine(machine.id, machine);
    },
  };

  const mutations = {
    setMachines(state, machines) {
      state.machines = machines;
    },
    add(state, machine) {
      if (state.machines.every((m) => m.id !== machine.id)) {
        state.machines = [...state.machines, machine];
      }
    },
    remove(state, id) {
      state.machines = state.machines.filter((machine) => machine.id !== id);
    },
    update(state, { machine, machineId }) {
      const foundMachineIdx = state.machines.findIndex((machine) => machine.id === machineId);
      if (foundMachineIdx > -1) {
        state.machines = [
          ...R.take(foundMachineIdx, state.machines),
          machine,
          ...R.drop(foundMachineIdx + 1, state.machines),
        ];
      }
    },
  };

  return {
    namespaced: true,
    state: initialState,
    getters,
    actions,
    mutations,
  };
}
