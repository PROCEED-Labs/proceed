/* eslint-disable class-methods-use-this */
const { System } = require('./system');
const Console = require('./console');

/**
 * @memberof module:@proceed/system
 * @extends module:@proceed/system.System
 * @class
 * @hideconstructor
 */
class Timer extends System {
  _getLogger() {
    if (!this.logger) {
      this.logger = Console._getLoggingModule().getLogger({ module: 'SYSTEM' });
    }
    return this.logger;
  }

  setTimeout(...args) {
    if (typeof setTimeout !== 'undefined') {
      // eslint-disable-next-line no-undef
      return setTimeout(...args);
    }
    this._getLogger().error('No `setTimeout()` method available.');
    return null;
  }

  setInterval(...args) {
    if (typeof setInterval !== 'undefined') {
      // eslint-disable-next-line no-undef
      return setInterval(...args);
    }
    this._getLogger().error('No `setInterval()` method available.');
    return null;
  }

  clearTimeout(...args) {
    if (typeof clearTimeout !== 'undefined') {
      // eslint-disable-next-line no-undef
      return clearTimeout(...args);
    }
    this._getLogger().error('No `clearTimeout()` method available.');
    return null;
  }

  clearInterval(...args) {
    if (typeof clearInterval !== 'undefined') {
      // eslint-disable-next-line no-undef
      return clearInterval(...args);
    }
    this._getLogger().error('No `clearInterval()` method available.');
    return null;
  }
}

module.exports = Timer;
