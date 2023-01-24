const { config } = require('@proceed/system');
const { data } = require('@proceed/system'); // only used for logging_meta_data. not for the config itself
const routes = require('./routes/configRoutes');
const defaultProfile = require('./defaultProfile.json');

let configHandlerSingleton;

/**
 * @memberof module:@proceed/machine
 * @class
 *
 * Reads and writes to config and logging_meta_data
 * Also keeps track of callbacks set for config changes
 */
class ConfigHandler {
  /**
   * @hideconstructor
   */
  constructor() {
    this.callbacks = new Map();
    config.constructor._setConfigModule(this);
  }

  /**
   * Configures the HTTP routes
   */
  init() {
    this.config = config.getConfig();
  }

  start() {
    routes(this);
  }

  /**
   * Stores callbacks to be executed when a certain config-key changes
   * @param {string} key the config key
   * @param {function} callback executed once the value for the key changes
   */
  registerForConfigChange(key, callback) {
    if (!this.callbacks.has(key)) {
      this.callbacks.set(key, [callback]);
    } else {
      const values = this.callbacks.get(key);
      values.push(callback);
      this.callbacks.set(key, values);
    }
  }

  /**
   * Checks if the obj is a valid key path (checks recursively in case of nested
   * objects)
   * @param {string} obj The obj that is to be checked
   * @returns {boolean} If the key path(s) are part of the configuration
   * @private
   */
  _isExistingKeyPath(obj, _config) {
    const configKeys = Object.keys(_config);
    if (!Object.keys(obj).every((key) => configKeys.includes(key))) {
      return false;
    }

    return Object.keys(obj)
      .map((key) => {
        if (typeof obj[key] === 'object' && Array.isArray(obj[key]) === false) {
          return this._isExistingKeyPath(obj[key], _config[key]);
        }
        return true;
      })
      .every((ret) => ret === true);
  }

  /**
   * returns the value for a given key stored in the config
   * @param {string} key
   * @returns {object}
   */
  async readConfig(key) {
    const defaultProfileConfig = defaultProfile;
    const nativeConfig = await this.config;
    let configuration = { ...defaultProfileConfig, ...nativeConfig };
    if (key) {
      // Translate object keyPath to value
      configuration = key.split('.').reduce((o, i) => o[i], configuration);
    }
    return configuration;
  }

  // private
  /**
   * Calls all callbacks stored for a given key
   * @param {string} key A configuration key
   * @private
   */
  _executeCallbacks(key, value) {
    const keyCallbacks = this.callbacks.get(key);
    if (keyCallbacks) {
      keyCallbacks.forEach((c) => c(value));
    }
  }

  /**
   * Changes a value in the config, stores it and calls all callbacks associated with the given key
   * @param key A config key
   * @param value The new config value
   * @returns {object} The new values in the config table
   */
  async writeConfigValue(key, value) {
    const configuration = await this.config;
    const keyExists = this._isExistingKeyPath({ [key]: value }, configuration);
    if (!keyExists) {
      throw new Error('Key does not exist on config object!');
    }
    const changed = await config.writeConfig({ [key]: value });
    this.config = Promise.resolve(changed);

    this._executeCallbacks(key, value);

    return changed;
  }

  async writeConfig(configObj) {
    // remove all profile entries to avoid errors
    Object.keys(defaultProfile).forEach((key) => {
      delete configObj[key];
    });

    const configuration = await this.config;
    const keyExists = this._isExistingKeyPath(configObj, configuration);
    if (!keyExists) {
      throw new Error('Key does not exist on config object!');
    }

    const changed = await config.writeConfig(configObj, true);
    this.config = Promise.resolve(changed);

    await Object.entries(configObj).forEach(async ([key, value]) => {
      this._executeCallbacks(key, value);
    });

    const mergedConfig = await this.readConfig();
    return mergedConfig;
  }

  /**
   * Returns the value for a given key that is stored in the logging_meta_data
   * @param key A logging_meta_data key
   * @returns {object} Returns a logging_meta_data value
   */
  // eslint-disable-next-line class-methods-use-this
  async readConfigData(key) {
    const configData = await data.read('logging_meta_data.json');
    if (configData) {
      return JSON.parse(configData.config)[key];
    }

    return null;
  }

  /**
   * Creates a new logging_meta_data table
   * @returns {object} Returns a new logging_meta_data table
   */
  // eslint-disable-next-line class-methods-use-this
  async createConfigData() {
    const initData = {};
    initData.rotationStartTime = new Date().getTime();
    initData.standardLogs = 0;
    initData.processLogs = [];

    return data.write('logging_meta_data.json/config', JSON.stringify(initData));
  }
}

/*
 * Returns the singleton instance of the config handler and creates it if necessary
 * returns Returns an instance of the ConfigHandler class.
 */
function getInstance() {
  if (!configHandlerSingleton) {
    configHandlerSingleton = new ConfigHandler();
  }
  return configHandlerSingleton;
}

module.exports = getInstance();
