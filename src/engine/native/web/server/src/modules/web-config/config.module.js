const defaultConfig = require('./config_default.json');

/**
 * @class
 */
export class Config {
  constructor() {
    this.commands = ['read_config', 'write_config'];
    this.customConfig = {};

    let resConfig;
    this.config = new Promise((resolve) => {
      resConfig = resolve;
    });
    this._getConfig().then((config) => {
      resConfig(config);
    });
  }

  executeCommand(command, args) {
    if (command === 'read_config') {
      return this.getConfig();
    }
    if (command === 'write_config') {
      return this.writeConfig(args);
    }
    return undefined;
  }

  /**
   * Changes a key of the configuration
   * @param args A list containing [key, value]. Key being the key that is to be read.
   * Value the new value for that key
   */
  async writeConfig(args) {
    let succeed;
    let fail;
    const promisedResponse = new Promise((resolve, reject) => {
      succeed = resolve;
      fail = reject;
    });

    const [configObj, overwrite] = args;

    // Write the changes to the custom object
    if (overwrite) {
      this.customConfig = configObj;
    } else {
      this._writeConfigValue(configObj, this.customConfig);
    }

    // Rebuild the config as a merge
    const defaultConf = defaultConfig;
    this.config = Promise.resolve(this.buildConfig(this.customConfig, defaultConf));

    try {
      localStorage.setItem('config.json', JSON.stringify(this.customConfig));
      succeed([await this.config]);
    } catch (e) {
      fail(e);
    }

    return promisedResponse.finally(() => {
      console.log('done finally');
    });
  }

  /**
   * Reads the entire configuration
   * @private
   */
  async getConfig() {
    return [await this.config];
  }

  /**
   * Initiates the config's creation
   * @private
   */
  async _getConfig() {
    const defaultConf = defaultConfig;
    // Read and store the custom config.json values so we can write any changes back
    const config = this.loadConfigIfExists();
    this.customConfig = config;
    const finalConfig = this.buildConfig(config, defaultConf);
    console.log({ finalConfig });
    return finalConfig;
  }

  /**
   * Reads the config.json if it exists
   */
  loadConfigIfExists() {
    if (localStorage.getItem('config.json')) {
      return JSON.parse(localStorage.getItem('config.json'));
    }
    return {};
  }

  /**
   * Creates the final configuration
   * @private
   * @param {object} cli An object containing all configuration values specified through CLI
   * @param {object} config An object containing all configuration values specified
   * through the config.json
   * @param {object} defaultConf An object containing all configuration values specified
   * through the config_default.json
   * @returns {object} Returns the final configuration
   */
  buildConfig(config, defaultConf) {
    // Make a copy
    const _updatedConfig = { ...defaultConf };
    const configObject = config ? JSON.parse(JSON.stringify(config)) : {};
    this._writeConfigValue(configObject, _updatedConfig);
    return _updatedConfig;
  }

  // Only works with always nested values (no string|object)
  _writeConfigValue(configObj, updatedConfig) {
    Object.keys(configObj).forEach((key) => {
      if (
        typeof configObj[key] === 'object' &&
        typeof updatedConfig[key] === 'object' &&
        !Array.isArray(configObj[key]) &&
        !Array.isArray(updatedConfig[key])
      ) {
        this._writeConfigValue(configObj[key], updatedConfig[key]);
        return;
      }
      updatedConfig[key] = configObj[key];
    });
  }
}
