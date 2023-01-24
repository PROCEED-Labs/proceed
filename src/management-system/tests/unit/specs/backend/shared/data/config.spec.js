jest.mock('@/frontend/../backend/shared-electron-server/config_backend_default.js', () => ({
  confValA: 'a',
  confValB: 'b',
  confValC: 'c',
}));

jest.mock('@/frontend/../backend/shared-electron-server/data/store.js', () => ({
  config: {},
  get: jest.fn().mockImplementation(function () {
    return this.config;
  }),
  set: jest.fn().mockImplementation(function (_, key, val) {
    this.config[key] = val;
  }),
}));

jest.mock('@/frontend/backend-api/event-system/EventHandler.js', () => ({
  dispatch: jest.fn(),
}));

import eventHandler from '@/frontend/backend-api/event-system/EventHandler.js';
import * as configController from '@/frontend/../backend/shared-electron-server/data/config.js';
import store from '@/frontend/../backend/shared-electron-server/data/store.js';
import defaultConfig from '@/frontend/../backend/shared-electron-server/config_backend_default.js';

describe('Tests for the backend configuration controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    store.config = {};
    configController.init();
  });

  describe('init', () => {
    it('initializes the config with the default config', () => {
      expect(configController.getBackendConfig()).toStrictEqual(defaultConfig);
    });
    it('overwrites default values with user provided ones if they exist', () => {
      store.config = { confValA: 'z', confValC: 'y' };
      configController.init();
      expect(configController.getBackendConfig()).toStrictEqual({
        ...defaultConfig,
        ...store.config,
      });
    });
    it('ignores keys that are not existant in the default config', () => {
      store.config = { invalidKey: 'someValue' };
      configController.init();
      expect(configController.getBackendConfig()).toStrictEqual(defaultConfig);
    });
  });

  describe('changeBackendConfig', () => {
    it('overwrites the current config with user provided config values', () => {
      configController.changeBackendConfig({ confValA: 'y', confValB: 'z' });
      expect(configController.getBackendConfig()).toStrictEqual({
        confValA: 'y',
        confValB: 'z',
        confValC: 'c',
      });
    });
    it('ignores keys that are not existant in the default config', () => {
      configController.changeBackendConfig({ invalidKey: 'someValue' });
      expect(configController.getBackendConfig()).toStrictEqual(defaultConfig);
    });
    it('writes changed config values to store', () => {
      configController.changeBackendConfig({ confValA: 'x', confValB: 'y' });
      expect(store.config).toStrictEqual({ confValA: 'x', confValB: 'y' });
    });
    it("doesn't write invalid values to the store", () => {
      configController.changeBackendConfig({ invalidKey: 'someValue' });
      expect(store.set).toHaveBeenCalledTimes(0);
    });
    // it will be stored as undefined in the store but not appear in the related config file anymore
    it('"deletes" values that are set to the default value from the user config', () => {
      store.config = { confValA: 'z', confValC: 'y' };
      configController.init();
      configController.changeBackendConfig({ confValA: 'a' });
      expect(store.config).toStrictEqual({ confValA: undefined, confValC: 'y' });
    });
    it('dispatches an event containing the valid changes via the eventHandler to signal the configchange to other modules', () => {
      configController.changeBackendConfig({ confValA: 'a', confValC: 'g', invalidKey: 'someVal' });
      expect(eventHandler.dispatch).toHaveBeenCalledWith('backendConfigChanged', {
        confValA: 'a',
        confValC: 'g',
      });
    });
    it("doesn't dispatch the event if nothing was changed", () => {
      configController.changeBackendConfig({ invalidKey: 'someVal' });
      expect(eventHandler.dispatch).toHaveBeenCalledTimes(0);
    });
  });
});
