/* eslint-disable class-methods-use-this */
const { System } = require('./system');
const utils = require('././utils.ts');

let _logging;

/**
 * @memberof module:@proceed/system
 * @extends module:@proceed/system.System
 * @class
 * @hideconstructor
 */
class Console extends System {
  /**
   *
   * @param {*} value
   */
  log(value) {
    const taskID = utils.generateUniqueTaskID();
    // FIXME: array args
    this.commandRequest(taskID, ['console_log', [value]]);
  }

  /**
   * To avoid circular dependencies use dependency injection. This is a
   * workaround, to allow other system modules to use the logging module which
   * they can't require.
   * @private
   */
  static _setLoggingModule(logging) {
    _logging = logging;
  }

  static _getLoggingModule() {
    return _logging;
  }
}

module.exports = Console;
