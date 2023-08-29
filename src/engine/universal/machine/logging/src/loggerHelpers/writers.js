const { data } = require('@proceed/system');
const logUtils = require('../utils/logLevelUtils.js');
const rotationUtils = require('../utils/logRotationUtils.js');
const config = require('../../../configuration/configHandler');

// Incrementing unique id
let id = 0;

/**
 * @module writer
 * @memberof module:@proceed/machine.Logging
 */

/**
 * @function
 * Initializes and returns a writer function for a logger
 *
 * @param {string} definitionId name of the file the process the logger is being made for is stored in
 * @param {promise} loggerInitializedPromise a promise indicating that the logger has
 *   finished being asynchronously initialized
 * @returns a writer function
 */
module.exports = async (definitionId, loggerInitializedPromise) => {
  /**
    Saves a log if the minimum log level is met
    @param {object} msg log to be saved
    @param {string} level the log-level of the message. compared to the minimum log level specified
    * in the config file. If it is equal or greater to the one in the config, the log is saved
  */
  async function standardWriter(msg, level) {
    // quick fix like this, as this was already fixed and then changed
    await loggerInitializedPromise;
    const rotationFunctions = rotationUtils.getInstance();

    const logGuard = await logUtils.getWriterGuard();

    if (logGuard(level)) {
      const time = new Date().getTime();
      data.write(`monitoring.json/${time}_${id}`, JSON.stringify(msg));
      // Id does not need to be unique across executions. only to prevent logging in the same
      // ms and overwriting.
      id += 1;
      rotationFunctions.incrementStandardLog();
    }
  }

  let currentTableID = 0;
  let logNumber = 0;

  if (definitionId) {
    const processLogs = await config.readConfigData('processLogs');
    try {
      currentTableID = processLogs.find((p) => p.definitionId === definitionId).currentTableID;
      logNumber = processLogs.find((p) => p.definitionId === definitionId).currentLogs;
    } catch (e) {
      currentTableID = 0;
      logNumber = 0;
      await loggerInitializedPromise;
      const rotationFunctions = rotationUtils.getInstance();
      rotationFunctions.createProcessDataObject(definitionId);
    }
  }

  const maxLogs = await config.readConfig('logs.maxProcessLogEntries');

  /**
    Saves a log in a process specific table.
    @param {object} msg the log to be saved
    @param {string} level the log-level of the message. compared to the minimum log level specified
    * in the config file. If it is equal or greater to the one in the config, the log is saved
  */
  async function splitWriter(msg, level) {
    // quick fix like this, as this was already fixed and then changed
    await loggerInitializedPromise;
    const rotationFunctions = rotationUtils.getInstance();

    const logGuard = await logUtils.getWriterGuard();

    if (logNumber >= maxLogs) {
      currentTableID += 1;
      rotationFunctions.addProcessTable(definitionId);
      rotationFunctions.incrementCurrentTableID(definitionId);

      logNumber = 0;
      rotationFunctions.clearProcessLogs(definitionId);
    }

    if (logGuard(level)) {
      const time = new Date().getTime();
      data.write(
        `${definitionId}/${currentTableID}_monitoring_${definitionId}.json/${time}_${logNumber}`,
        JSON.stringify(msg),
      );
      logNumber += 1;
      rotationFunctions.addProcessLog(definitionId);
    }
  }

  if (definitionId) {
    return splitWriter;
  }

  return standardWriter;
};
