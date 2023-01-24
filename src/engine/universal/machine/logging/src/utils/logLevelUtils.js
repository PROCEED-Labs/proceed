const config = require('../../../configuration/configHandler');

/**
 * @module logLevelUtils
 * @memberof module:@proceed/machine.Logging
 */

const levels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];

/**
 * Formats hours, minutes and seconds into one time string, padding left with zeros if necessary
 * @param {number} h number representing hours
 * @param {number} m number representing minutes
 * @param {number} s number representing seconds
 * @returns {string} formatted time
 */
function formatTime(h, m, s) {
  const hours = h.toString().length === 1 ? `0${h}` : h;
  const minutes = m.toString().length === 1 ? `0${m}` : m;
  const seconds = s.toString().length === 1 ? `0${s}` : s;

  return `${hours}:${minutes}:${seconds}`;
}

/**
 * @param {string} should a log level that is expected
 * @param {string} another log level
 * @returns {boolean} whether or not current is smaller than should
 */
function isSmaller(should, current) {
  return levels.indexOf(current) < levels.indexOf(should);
}

/**
 * @param {string} should a log level (later the minLevel specified in the log-config)
 * @returns a function, returning whether or not a passed log-level is at least the level specified
 *          in the config
 */
function meetsMinLevel(should) {
  return (current) => !isSmaller(should, current);
}

/**
 * Checks if the provided value is a valid log level
 * @param {string} type any string that is to be checked
 * @returns {boolean} whether or not type is a logtype (i.e. debug, info, warn...)
 */
function validLogType(type) {
  return levels.includes(type);
}

/**
 * @param level a min-level provided in the log-config
 * @returns an approproate function/guard that accepts all logs with a level over level
 *          If the log level is not valid, a guard is returned which accepts all logs
 */
function getGuard(level) {
  if (validLogType(level)) {
    return meetsMinLevel(level);
  }

  return function acceptAll() {
    return true;
  };
}

/**
  @returns the guard (@see {@ link getGuard}) based on the console-config
*/
async function getConsoleGuard() {
  const consoleLevel = await config.readConfig('logs.consoleLevel');
  return getGuard(consoleLevel);
}

/**
  @returns the guard (@see {@ link getGuard}) based on the writer-config
*/
async function getWriterGuard() {
  const logLevel = await config.readConfig('logs.logLevel');
  return getGuard(logLevel);
}

module.exports = {
  getConsoleGuard,
  getWriterGuard,
  validLogType,
  formatTime,
};
