/* eslint-disable no-param-reassign */
/* eslint-disable class-methods-use-this */
const NativeModule = require('@proceed/native-module');
const fs = require('fs');
const path = require('path');
const si = require('systeminformation');
const defaultConfig = require('./config_default');

/**
 * @class
 */
class Config extends NativeModule {
  constructor(options) {
    super();
    this.commands = ['read_config', 'write_config'];
    this.clargs = process.argv.slice(2);
    this.customConfig = {};
    this._mutex = false;
    this._lastInQueue = undefined;
    this.path = (options && options.dir) || __dirname;

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

    // delete values from custom config that are equal to the default config
    this.customConfig = this._removeDefaults(this.customConfig, defaultConfig);

    // Rebuild the config as a merge
    const cliObject = this.getCliObject();
    // old version from Kai R. before buildConfig was an async function
    // this.config = Promise.resolve(this.buildConfig(cliObject, this.customConfig, defaultConfig));
    this.config = await this.buildConfig(cliObject, this.customConfig, defaultConfig);

    // Check mutex
    if (this._mutex) {
      // Wait till previous operations on this key finished.
      await this._freeQueue(promisedResponse);
    }

    // Block resource
    if (!this._lastInQueue) {
      this._lastInQueue = promisedResponse;
    }
    this._mutex = true;

    const jsonPath = path.join(this.path, 'config.json');

    fs.writeFile(jsonPath, JSON.stringify(this.customConfig, null, 2), async (err) => {
      if (err) {
        fail(err);
      } else {
        succeed([await this.config]);
      }
    });

    return promisedResponse.finally(() => {
      this._mutex = false;
    });
  }

  /**
   * Strips a config object of all values that are the same as in the default config
   *
   * @param {Object} configObj the config object we want to remove default values from
   * @param {Object} defaultConfig the default config we are comparing against
   */
  _removeDefaults(customConfig, defaultConfig) {
    const minimalConfig = {};

    // check for every entry of the custom config object if it contains values differing from the default ones
    Object.keys(customConfig).forEach((key) => {
      // nested objects/arrays can't be compared directly
      if (typeof customConfig[key] === 'object') {
        // check if array contains values differing from default ones
        if (Array.isArray(customConfig[key])) {
          // no need to compare if arrays have differing length
          if (customConfig[key].length !== defaultConfig[key].length) {
            minimalConfig[key] = customConfig[key];
          } else {
            // check if some element in the custom config array entry differs from the ones in the default config array entry
            if (
              customConfig[key].some((el, index) => {
                return el !== defaultConfig[key][index];
              })
            ) {
              minimalConfig[key] = customConfig[key];
            }
          }
        } else {
          // use function recursivly to remove all default values from nested object
          const minimalObj = this._removeDefaults(customConfig[key], defaultConfig[key]);

          // only keep nested object if it had non default values
          if (Object.keys(minimalObj).length) {
            minimalConfig[key] = minimalObj;
          }
        }
      } else if (customConfig[key] !== defaultConfig[key]) {
        minimalConfig[key] = customConfig[key];
      }
    });

    return minimalConfig;
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

    const cliObject = this.getCliObject();
    const finalConfig = await this.buildConfig(cliObject, config, defaultConf);

    return finalConfig;
  }

  /**
   * Reads the config.json if it exists
   */
  loadConfigIfExists() {
    const configPath = path.join(this.path, 'config.json');
    let config;
    try {
      config = fs.readFileSync(configPath, 'utf8');
    } catch (e) {
      return {};
    }

    return JSON.parse(config);
  }

  /**
   * Creates the final configuration
   * @private
   * @param {object} cli An object containing all configuration values specified through CLI
   * @param {object} conf An object containing all configuration values specified
   * through the config.json
   * @param {object} defaultConf An object containing all configuration values specified
   * through the config_default.json
   * @returns {object} Returns the final configuration
   */
  async buildConfig(cli, conf, defaultConf) {
    // Make a deep copy
    // https://stackoverflow.com/a/122704
    const config = JSON.parse(JSON.stringify(defaultConf));
    const cliObject = cli;
    const configObject = conf ? JSON.parse(JSON.stringify(conf)) : {};
    const defKeys = Object.keys(defaultConf);
    const cliKeys = Object.keys(cliObject);

    // check if Screen is attached and set 'processes.acceptUserTasks' to true
    // can't be set in the universal part, because there we can't determine if 'false' was set in the config.json or if it is the default from config_default.json
    const graphics = await si.graphics();
    if (graphics.displays.some((display) => display.currentResX + display.currentResY > 1)) {
      // Screen is available
      config.processes.acceptUserTasks = true;
    }

    cliKeys.forEach((k) => {
      if (defKeys.includes(k)) {
        configObject[k] = this.fixType(cliObject[k]);
      }
    });

    this._writeConfigValue(configObject, config);

    return config;
  }

  /**
   * For every config key in 'configObj', it overrides the same key in 'config'.
   * Only works with always nested values (no string|object)
   *
   * @param {object} configObj
   * @param {object} config
   */
  _writeConfigValue(configObj, config) {
    Object.keys(configObj).forEach((key) => {
      if (
        typeof configObj[key] === 'object' &&
        typeof config[key] === 'object' &&
        !Array.isArray(configObj[key]) &&
        !Array.isArray(config[key])
      ) {
        this._writeConfigValue(configObj[key], config[key]);
        return;
      }
      // Write value directly also if nested object doesn't exist yet (no need to traverse)
      config[key] = configObj[key];
    });
  }

  /**
   * Converts integers to strings if necessary
   * @param {string} stringValue A string that may be converted
   * @param {(string|number)} The fixed value
   */
  fixType(stringValue) {
    const intExp = new RegExp(/^\d+$/g);
    if (intExp.test(stringValue)) {
      return parseInt(stringValue);
    }
    // return a boolean or the unparsed value
    return stringValue === 'true' ? true : stringValue === 'false' ? false : stringValue;
  }

  /**
   * Interprets CLI arguments as key value pairs for the configuration e.g. yarn dev logLevel info
   * @returns {object} An object containing all configuration values specified through the CLI
   */
  getCliObject() {
    const cliObject = {};
    for (let i = 0; i < this.clargs.length; i++) {
      if (i % 2 === 1) {
        continue;
      }
      const key = this.clargs[i];
      const value = this.clargs[i + 1];
      cliObject[key] = value;
    }

    return cliObject;
  }

  async _freeQueue(operation) {
    const last = this._lastInQueue;
    this._lastInQueue = operation;

    const wait = new Promise((resolve) => {
      last.then(() => {
        if (this._lastInQueue === operation) {
          this._lastInQueue = undefined;
        }
        resolve();
      });
    });
    return wait;
  }
}

module.exports = Config;
