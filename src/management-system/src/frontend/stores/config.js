import { dataInterface, engineInterface, eventHandler } from '@/frontend/backend-api/index.js';

/**
 * A function creating a module for a vuex store
 * state contains two fields: config for ms config values
 *                            engineConfig for config values of the internal engine
 *
 * @param {object} dbConfigStore electron store containing data from persistently stored ms config file
 * @param {object} dbEngineConfigStore electron store containing data from persistently store ms engine config file
 */
export default async function createConfigStore() {
  const initialState = {
    config: {},
    engineConfig: {},
  };

  const getters = {
    // return an object containing all ms config values
    config(state) {
      return state.config;
    },
    // like config(state) but for the engine config
    engineConfig(state) {
      return state.engineConfig;
    },
  };

  const mutations = {
    /**
     * Takes an object and updates the ms config if the keys correspond to keys in the config
     *
     * @param {*} state the current state of the config store
     * @param {object} keyValuePairs one or more key value pairs
     */
    setConfigValue(state, { key, value }) {
      state.config[key] = value;
    },
    /**
     * Saves the new values for the engine config in our vuex store
     * DON'T call this function directly but use the associated action instead
     *
     * @param {*} state current state of the config store
     * @param {object} keyValuePairs values we want to change and their supposed new value
     */
    setEngineConfigValues(state, keyValuePairs) {
      Object.entries(keyValuePairs).forEach(([key, value]) => {
        if ({}.propertyIsEnumerable.call(state.engineConfig, key)) {
          state.engineConfig[key] = value;
        }
      });
    },
    initEngineConfig(state, initialConfig) {
      state.engineConfig = initialConfig;
    },
  };

  const actions = {
    async loadConfig({ commit, dispatch, state }) {
      const configValues = await dataInterface.get('config');
      state.config = configValues;

      eventHandler.on('backendConfigChanged', (changedConfig) => {
        Object.keys(changedConfig).forEach((key) => {
          commit('setConfigValue', { key, value: changedConfig[key] });
        });
      });

      const engineConfigValues = await engineInterface.getConfig();
      commit('initEngineConfig', engineConfigValues, true);
    },
    /**
     * Commits change to store and updates config of currently running engine
     *
     * @param {*} commit function to call a mutation in the same store
     * @param {*} keyValuePairs values we want to change and their supposed new value
     */
    async changeEngineConfigValues({ commit, state }, configObj) {
      // commit changed values for local storage
      commit('setEngineConfigValues', configObj);

      // update config in the engine with newly calculated config
      await engineInterface.setConfig(state.engineConfig);
    },
    async changeConfigValues(_, keyValuePairs) {
      await dataInterface.updateConfig(keyValuePairs);
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
