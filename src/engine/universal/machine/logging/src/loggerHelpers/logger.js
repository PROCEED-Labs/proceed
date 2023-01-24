/* eslint-disable class-methods-use-this */
const { console } = require('@proceed/system');
const config = require('../../../configuration/configHandler');
const logUtils = require('../utils/logLevelUtils.js');
// maybe just use logutils. instead of saving every function to a variable. seems unnecessary
const { validLogType } = logUtils;
const { formatTime } = logUtils;
const { getConsoleGuard } = logUtils;
const writerLoader = require('./writers.js');

/**
 * @memberof module:@proceed/machine.Logging
 * @class
 *
 *
 * Class for logger instances
 * Instantiates a new logger
 * @param {object} confObject The configuration for the logger
 * @param {promise} loggingInitializedPromise a promise indicating that the logger has
 *   finished being asynchronously initialized
 */
class Logger {
  constructor(confObject, loggingInitializer) {
    this.instanceInitialized = false;
    this.confObject = confObject;
    this.loggingInitializer = loggingInitializer;
    this.functionsForWriter = [];
    this.moduleName = confObject.moduleName;
  }

  /**
   * Adds writer functions to the logger
   * @param {object} The configuration for the logger
   */
  async _init(confObject) {
    if (!Logger.initialized) {
      Logger.initialized = true;
      await this.loggingInitializer();
      Logger.intializationResolver();
    } else {
      await Logger.initialization;
    }

    const { definitionId, moduleName, consoleOnly } = confObject;
    this.moduleName = moduleName;
    const forwardToConsole = await config.readConfig('logs.forwardToConsole');

    if (consoleOnly || forwardToConsole) {
      const logGuard = await getConsoleGuard();
      const consoleLogger = (msg, level) => {
        if (logGuard(level)) {
          const printDefinitionId = definitionId ? `${definitionId}: ` : '';
          const printModuleName = msg.moduleName ? `${msg.moduleName} ` : '';
          const time = new Date();
          const printTime = formatTime(time.getHours(), time.getMinutes(), time.getSeconds());
          const toPrint = `${printTime} [${level.toUpperCase()}] ${printModuleName}${printDefinitionId}${
            msg.msg
          }`;
          console.log(toPrint);
        }
      };

      this.functionsForWriter.push(consoleLogger);
    }

    if (!consoleOnly) {
      const writer = await writerLoader(definitionId);
      this.functionsForWriter.push(writer);
    }
  }

  async initialize() {
    if (!this.instanceInitialized) {
      this.instanceInitialized = this._init(this.confObject);
    }
    return this.instanceInitialized;
  }

  /**
   * The logger's trace method
   * @param {(string|object)} msg the message to be logged
   */
  async trace(msg) {
    await this.initialize();
    const doneMsg = this.handleLog(msg, 'trace');
    this.functionsForWriter.forEach((f) => f(doneMsg, 'trace'));
  }

  /**
   * The logger's debug method
   * @param {(string|object)} msg the message to be logged
   */
  async debug(msg) {
    await this.initialize();
    const doneMsg = this.handleLog(msg, 'debug');
    this.functionsForWriter.forEach((f) => f(doneMsg, 'debug'));
  }

  /**
   * The logger's info method
   * @param {(string|object)} msg the message to be logged
   */
  async info(msg) {
    await this.initialize();
    const doneMsg = this.handleLog(msg, 'info');
    this.functionsForWriter.forEach((f) => f(doneMsg, 'info'));
  }

  /**
   * The logger's warn method
   * @param {(string|object)} msg the message to be logged
   */
  async warn(msg) {
    await this.initialize();
    const doneMsg = this.handleLog(msg, 'warn');
    this.functionsForWriter.forEach((f) => f(doneMsg, 'warn'));
  }

  /**
   * The logger's error method
   * @param {(string|object)} msg the message to be logged
   */
  async error(msg) {
    await this.initialize();
    const doneMsg = this.handleLog(msg, 'error');
    this.functionsForWriter.forEach((f) => f(doneMsg, 'error'));
  }

  /**
   * The logger's fatal method
   * @param {(string|object)} msg the message to be logged
   */
  async fatal(msg) {
    await this.initialize();
    const doneMsg = this.handleLog(msg, 'fatal');
    this.functionsForWriter.forEach((f) => f(doneMsg, 'fatal'));
  }

  /**
   * The logger's general logging method. Calls one of the logging methods
   * @param {object} obj An object containing at least a level and a message.
   */
  async log(obj) {
    await this.initialize();
    const { level } = obj;
    if (validLogType(level)) {
      delete obj.level;
      this[level](obj);
    }
  }

  /**
   * Turns a string log message into an object, and adds additional information. If the
   * log is already an
   * object, some additional information is added
   * @param {(string|object)} log the log that will be prepared for saving or printing
   * @param {string} level The log level function from which this function has been called
   * @returns {object} a standardized logging object containinf at least the time of logging,
   * a message and the level
   */
  handleLog(log, level) {
    const time = new Date().getTime();
    if (typeof log === 'object') {
      log.time = time;
      log.level = level;
      if (!log.moduleName && this.moduleName) {
        log.moduleName = this.moduleName;
      }
      return log;
    }
    const logObject = { msg: log, level, time };
    if (this.moduleName !== undefined) {
      logObject.moduleName = this.moduleName;
    }
    return logObject;
  }
}

Logger.initialized = false;
Logger.initialization = new Promise((resolve) => {
  Logger.intializationResolver = resolve;
});

/**
 * @param {object} confObject The configuration for the logger
 * @param {promise} loggingInitializedPromise a promise indicating that the logger has
 *   finished being asynchronously initialized
 * @returns a configured instance of the Logger class
 */
module.exports = (confObject, loggingInitializer) => new Logger(confObject, loggingInitializer);
