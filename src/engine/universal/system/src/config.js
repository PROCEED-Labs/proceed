/* eslint-disable class-methods-use-this */
const { System } = require('./system');
const utils = require('./utils');

let _config;

/**
 * @memberof module:@proceed/system
 * @extends module:@proceed/system.System
 * @class
 * @hideconstructor
 */
class Config extends System {
  /**
   * @returns {Promise}
   */
  getConfig() {
    const taskID = utils.generateUniqueTaskID();
    const configPromise = new Promise((resolve) => {
      this.commandResponse(taskID, (err, data) => {
        resolve(data);

        return true;
      });
    });

    this.commandRequest(taskID, ['read_config', []]);

    return configPromise;
  }

  /**
   *
   * @param {*} configObj
   * @param {*} overwrite
   */
  writeConfig(configObj, overwrite) {
    const taskID = utils.generateUniqueTaskID();
    const dataPromise = new Promise((resolve, reject) => {
      this.commandResponse(taskID, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }

        return true;
      });
    });

    this.commandRequest(taskID, ['write_config', [configObj, overwrite]]);
    return dataPromise;
  }

  /**
   * To avoid circular dependencies use dependency injection. This is a
   * workaround, to allow other system modules to use the config module which
   * they can't require.
   * @private
   */
  static _setConfigModule(config) {
    _config = config;
  }

  static _getConfigModule() {
    return _config;
  }
}

module.exports = Config;
