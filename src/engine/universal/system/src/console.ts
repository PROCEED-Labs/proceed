/* eslint-disable class-methods-use-this */
import { System } from './system';
import { generateUniqueTaskID } from './utils';

let _logging;

class Console extends System {
  log(value: any) {
    const taskID = generateUniqueTaskID();
    // FIXME: array args
    this.commandRequest(taskID, ['console_log', [value]]);
  }

  // TODO: can we remove this when logger is an ESM module?
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

export default Console;
