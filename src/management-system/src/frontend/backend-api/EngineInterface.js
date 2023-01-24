import api from './ms-api-interface/engine.js';

class EngineInterface {
  constructor() {
    this.engineStarted = api.engineStarted;
  }

  /**
   * Signals to the engine running in the backend that it is supposed to stop publishing its service on the local network
   */
  async activateSilentMode() {
    await api.activateSilentMode();
  }

  /**
   * Signals to the engine running in the backend that it is supposed to start publishing its service on the local network
   */
  async deactivateSilentMode() {
    await api.deactivateSilentMode();
  }

  /**
   * Requests the configuration data from the engine running in the backend
   */
  async getConfig() {
    const config = await api.getConfig();
    return config;
  }

  /**
   * Sends a new configuration for the engine in the backend to use
   *
   * @param {Object} newConfig the config the engine is supposed to use from now
   */
  async setConfig(newConfig) {
    await api.setConfig(newConfig);
  }

  async isEnginePublished() {
    const published = await api.isEnginePublished();
    return published;
  }
}

export default EngineInterface;
