/* eslint-disable class-methods-use-this */
const { System } = require('./system');
const utils = require('./utils.ts');

/**
 * @memberof module:@proceed/system
 * @extends module:@proceed/system.System
 * @class
 * @hideconstructor
 */
class Machine extends System {
  /**
   * @returns {Promise}
   */
  getMachineInfo(properties) {
    const taskID = utils.generateUniqueTaskID();
    const dataPromise = new Promise((resolve) => {
      this.commandResponse(taskID, (err, data) => {
        resolve(data);

        return true;
      });
    });

    this.commandRequest(taskID, ['read_device_info', [properties]]);

    return dataPromise;
  }
}

module.exports = Machine;
