import Vue from 'vue';
import Vuex from 'vuex';
import DataInterface from '../../../mocks/DataInterface.js';
import EngineInterface from '../../../mocks/EngineInterface.js';

const defaultEngineConfig = {
  setA: false,
  setB: true,
  setC: 'test',
  setD: [],
};

const config = {
  setA: true,
  setB: true,
};

const createConfigStore = require('@/frontend/stores/config.js').default;

Vue.use(Vuex);

describe('Config Store', () => {
  // the vuex store that contains both ms and engine config values and provides them to our application
  let configsVuexStore;
  beforeEach(async () => {
    jest.clearAllMocks();
    DataInterface.prototype.get.mockReturnValue({ ...config });
    DataInterface.prototype.set.mockReset();
    EngineInterface.prototype.getConfig.mockResolvedValue(defaultEngineConfig);
    const configsStore = await createConfigStore();
    configsVuexStore = new Vuex.Store(configsStore);
    await configsVuexStore.dispatch('loadConfig');
  });

  describe('test initialization of correct initial state', () => {
    test('initialization', async () => {
      const state = {
        config: config,
        engineConfig: defaultEngineConfig,
      };

      expect(configsVuexStore.state).toStrictEqual(state);
      expect(DataInterface.prototype.get).toHaveBeenCalledWith('config');
    });
  });

  describe('getters', () => {
    test('config getter', () => {
      const msConfig = configsVuexStore.getters.config;

      expect(msConfig).toStrictEqual(config);
    });
    test('engine config getter', () => {
      const eConfig = configsVuexStore.getters.engineConfig;

      expect(eConfig).toStrictEqual(defaultEngineConfig);
    });
  });

  describe('mutations', () => {
    test('change value of one existing config entry', () => {
      configsVuexStore.dispatch('changeConfigValues', { setB: false });

      expect(DataInterface.prototype.updateConfig).toHaveBeenCalledWith({ setB: false });
    });

    test('change value of multiple existing engine config entries', () => {
      configsVuexStore.dispatch('changeEngineConfigValues', { setA: true, setC: 'hello' });

      expect(DataInterface.prototype.set).toHaveBeenCalledTimes(0);
      expect(configsVuexStore.getters.engineConfig.setA).toBe(true);
      expect(configsVuexStore.getters.engineConfig.setC).toBe('hello');
    });
  });

  describe('actions', () => {
    test('if changeEngineConfigValues commits the changes to the store and calls engine configHandler', async () => {
      const newValues = { setA: true, setC: 'hello' };

      const oldEngineConfig = configsVuexStore.state.engineConfig;

      const newConfig = { ...oldEngineConfig, ...newValues };

      await configsVuexStore.dispatch('changeEngineConfigValues', newValues);

      expect(EngineInterface.prototype.setConfig).toHaveBeenCalledTimes(1);
      expect(EngineInterface.prototype.setConfig).toHaveBeenCalledWith(newConfig);

      expect(configsVuexStore.getters.engineConfig.setA).toBe(true);
      expect(configsVuexStore.getters.engineConfig.setC).toBe('hello');
    });
  });
});
