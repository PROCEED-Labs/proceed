import * as R from 'ramda';
import { dataInterface, eventHandler } from '@/frontend/backend-api/index.js';

export default function createCapabilityStore() {
  const initialState = {
    capabilities: [],
  };

  const getters = {
    capabilities(state) {
      return state.capabilities;
    },
    capabilityById(state) {
      return (id) => R.find(R.propEq('id', id), state.capabilities);
    },
    uniqueCapabilityNames(state) {
      const names = [];
      state.capabilities.forEach((capability) => {
        names.push(capability.name);
      });
      return R.uniq(names);
    },
    machinelessCapabilities(state) {
      return state.capabilities.filter((capability) => !capability.machineIds.length);
    },
    capabilitiesWithMachine(state) {
      return state.capabilities.filter((capability) => !!capability.machineIds.length);
    },
    /**
     * returns a function that groups all capabilities in the current state depending on a given boolean
     * @param {*} state
     */
    map(state) {
      /**
       * returns an array containing all capabilities either just grouped
       * into one object or grouped into different objects depending on their machineIds
       * mapByHost == false: returns [{machineId: '', capabilities: [state.capabilities]}]
       * mapByHost == true: returns [{machineId: 'id of a machine associated with a capability',
       * capabilities: [all capabilities associated with that machine],...}]
       * @param {boolean} mapByHost - decides if the capabilities are grouped by their machineIds
       */
      return (mapByHost) => {
        const map = [];
        const discoveredCapabilities = [];
        const capabilities = state.capabilities.slice(0);

        const unMapped = { machineId: '', capabilities: [] };
        map.push(unMapped);

        if (!mapByHost) {
          unMapped.capabilities = capabilities;
          return map;
        }

        capabilities.forEach((capability) => {
          if (capability.machineIds.length) {
            discoveredCapabilities.push(capability);
          } else {
            unMapped.capabilities.push(capability);
          }
        });

        discoveredCapabilities.forEach((capability) => {
          capability.machineIds.forEach((id) => {
            const group = map.find((el) => el.machineId === id);
            if (group) {
              group.capabilities.push(capability);
            } else {
              map.unshift({ machineId: id, capabilities: [capability] });
            }
          });
        });

        return map;
      };
    },
  };

  const actions = {
    async loadCapabilities({ commit }) {
      const capabilities = await dataInterface.get('capabilities');
      commit('setCapabilities', capabilities);

      eventHandler.on('capabilitiesChanged', ({ capabilities }) => {
        commit('setCapabilities', capabilities);
      });
    },
    add({ commit, state }, capability) {
      if (!R.find(R.propEq('id', capability.id), state.capabilities)) {
        commit('add', capability);
        dataInterface.set('capabilities', 'capabilities', state.capabilities);
      }
    },
    remove({ commit, state }, { id }) {
      const newCapabilities = R.reject(R.propEq('id', id), state.capabilities);
      if (newCapabilities.length !== state.capabilities.length) {
        commit('setCapabilities', newCapabilities);
        dataInterface.set('capabilities', 'capabilities', newCapabilities);
      }
    },
    update({ commit, state }, capability) {
      commit('update', capability);
      dataInterface.set('capabilities', 'capabilities', state.capabilities);
    },
  };

  const mutations = {
    setCapabilities(state, capabilities) {
      state.capabilities = capabilities;
    },
    add(state, { capability }) {
      state.capabilities = [capability, ...state.capabilities];
    },
    update(state, { capability }) {
      const foundCapabilityIdx = R.findIndex(R.propEq('id', capability.id), state.capabilities);
      if (foundCapabilityIdx >= 0) {
        state.capabilities = [
          ...R.take(foundCapabilityIdx, state.capabilities),
          capability,
          ...R.drop(foundCapabilityIdx + 1, state.capabilities),
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
