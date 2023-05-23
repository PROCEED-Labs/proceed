import { System } from './system';
import { generateUniqueTaskID } from './utils';

let _config;

class Config extends System {
  getConfig() {
    const taskID = generateUniqueTaskID();
    const configPromise = new Promise((resolve) => {
      this.commandResponse(taskID, (err, data) => {
        resolve(data);

        return true;
      });
    });

    this.commandRequest(taskID, ['read_config', []]);

    return configPromise;
  }

  writeConfig(configObj, overwrite) {
    const taskID = generateUniqueTaskID();
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

export default Config;
