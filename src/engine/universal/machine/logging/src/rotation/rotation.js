const config = require('../../../configuration/configHandler');
const { data, timer } = require('@proceed/system');

/**
 * @module rotation
 * @memberof module:@proceed/machine.Logging
 */

/**
 * Deletes the entry in which the standard logs are stored and resets the counter in
 * the logging_meta_data
 * @param {module:@proceed/machine.logging} logging the instance of the Logging class,
 * so the logging utils can be easily used
 */
async function clearStandardLogs(logging) {
  await logging.clearStandardLogs();
}

/**
 * Removes all excess log tables for a specific process
 * the logging_meta_data
 * @param {module:@proceed/machine.logging} logging the instance of the Logging class,
 * so the logging utils can be easily used
 * @param {object} processLogData all necessary information about the process to delete the tables
 * @param {number} maxTables the maximum number of log tables allowed for any process
 */
async function removePrecedingLogTables(logging, processLogData, maxTables) {
  const definitionID = processLogData.definitionId;
  const currentID = processLogData.currentTableID;
  const numOfTables = processLogData.tables;
  const removeStartID = Math.max(currentID + 1 - numOfTables, 0);
  const removeEndID = currentID - maxTables;

  for (let i = removeStartID; i !== removeEndID + 1; i += 1) {
    logging.deleteLoggingTable(`${definitionID}/${i}_monitoring_${definitionID}`);
  }

  logging.decreaseProcessTables(definitionID, removeEndID - removeStartID + 1);
}

/**
 * Called as often as is specified in the configuration. Checks if log tables have to be deleted
 * and calls the appropriate functions if yes
 * @param {module:@proceed/machine.logging} logging the instance of the Logging class,
 * so the logging utils can be easily used
 */
async function rotate(logging) {
  const size = await config.readConfig('logs.maxStandardLogEntries');
  const maxTables = await config.readConfig('logs.maxProcessLogTables');

  const standardLogs = await config.readConfigData('standardLogs');
  const processLogs = await config.readConfigData('processLogs');

  if (standardLogs > size) {
    await clearStandardLogs(logging);
  }

  processLogs.forEach((pl) => {
    if (pl.tables > maxTables) {
      removePrecedingLogTables(logging, pl, maxTables);
    }
  });
}

/**
 *  Sets the interval at which the rotation is to be performed
 * @param {module:@proceed/machine.logging} logging the instance of the Logging class,
 * so the logging utils can be easily used
 */
async function startRotation(logging) {
  const intervalInSeconds = await config.readConfig('logs.rotationInterval');
  const intervalInMilliSeconds = intervalInSeconds * 1000;
  const loggingData = JSON.parse(await data.read('logging_meta_data.json/config'));
  loggingData.rotationStartTime = new Date().getTime();
  await data.write('logging_meta_data.json/config', JSON.stringify(loggingData));
  timer.setInterval(rotate, intervalInMilliSeconds, logging);
}

module.exports = startRotation;
