/* eslint-disable class-methods-use-this */
const { data, console } = require('@proceed/system');
const config = require('../configuration/configHandler');
const loggerLoader = require('./src/loggerHelpers/logger');
const rotationUtils = require('./src/utils/logRotationUtils');
const startRotation = require('./src/rotation/rotation');
const routes = require('./src/routes/logRoutes');

let singletonInstance;

/**
 * @memberof module:@proceed/machine
 * @class
 *
 * Class for initializing and getting a logger
 */
class Logging {
  /**
   * @hideconstructor
   */
  constructor() {
    this.doneInitializing = undefined;
    // See @proceed/system.console
    console.constructor._setLoggingModule(this);
  }

  /**
   * Initializes all things necessary for the Logging
   *   - Provides the data module to the rotation utils
   *   - Creates the config data file if it doesn't exist
   *   - starts the log rotation
   */
  init() {
    // Don't initialize twice
    if (this.doneInitializing) {
      return this.doneInitializing;
    }
    const donePromise = new Promise((resolve) => {
      config.readConfigData('processLogs').then((processLogs) => {
        if (processLogs === null) {
          // logging_meta_data doesn't exist. create one and fill it with default values
          config
            .createConfigData()
            .then(() => {
              this.rotationUtils = rotationUtils.init(data);
              startRotation(this);
              resolve();
            })
            .catch(() => {});
        } else {
          this.rotationUtils = rotationUtils.init(data);
          startRotation(this);
          resolve();
        }
      });
    });

    // storing the promise, so components further down the line can wait until
    // the logging is initialized
    this.doneInitializing = donePromise;
    return donePromise;
  }

  start() {
    routes(this);
  }

  /**
   * Factory method creating a logger
   * @param {object} confObject An object containing all configuration parameters for the logger
   * @returns a logger
   */
  getLogger(confObject) {
    const logger = loggerLoader(confObject, this.init.bind(this));
    return logger;
  }

  /**
   *  Returns the last [limit] standard logs
   *  @returns {object} standard logs
   *  @param {number} limit - how many logs we want to get
   */
  async getStandardLogTables(limit = 100) {
    const logData = await data.read('monitoring.json');
    const oldLogData = await data.read('monitoring_old.json');
    const res1 = Object.entries(logData || {}).map(([key, value]) => ({
      [key]: JSON.parse(value),
    }));
    const res2 = Object.entries(oldLogData || {}).map(([key, value]) => ({
      [key]: JSON.parse(value),
    }));
    return res2.concat(res1).slice(Math.max(res1.length + res2.length - limit, 0));
  }

  /**
   *  Returns all process logs across all tables
   *  @param {string} definitionID The definition ID of the process for which the logs are to be returned
   *  @param {number} limit - how many logs we want to get
   */
  async getProcessLogTables(definitionID, limit) {
    const configDataEntry = await config.readConfigData('processLogs');
    // == to convert into strings if id is number
    // eslint-disable-next-line eqeqeq
    const processInfo = configDataEntry.find((c) => c.definitionId == definitionID);
    if (!processInfo) {
      return [];
    }
    const numOfLogTables = processInfo.tables;
    const { currentTableID } = processInfo;
    const range = [];
    for (let i = currentTableID; i > currentTableID - numOfLogTables; i -= 1) {
      range.push(i);
    }
    let logTables = [];
    let tableID;
    for (tableID in range) {
      const logTable = await data.read(
        `${definitionID}/${tableID}_monitoring_${definitionID}.json`,
      );
      const arr = Object.entries(logTable || {}).map(([key, value]) => ({
        [key]: JSON.parse(value),
      }));
      logTables = logTables.concat(arr);
    }

    if (limit) {
      logTables = logTables.slice(Math.max(logTables.length - limit, 0));
    }
    return logTables;
  }

  /**
   *
   * @param {string} definitionID The definition ID of the process
   * @param {string} instanceId the ID of the specific instance of the process for which the logs are to be returned
   * @param {number} limit - how many logs we want to get
   */
  async getInstanceLogs(definitionID, instanceId, limit) {
    const processTables = await this.getProcessLogTables(definitionID);

    let instanceLogs = processTables.filter((pt) => {
      const [[key, info]] = Object.entries(pt);
      return info.instanceId === instanceId;
    });

    if (limit) {
      instanceLogs = instanceLogs.slice(Math.max(instanceLogs.length - limit, 0));
    }

    return instanceLogs;
  }

  async getAllLogTables(limit = 100) {
    const configDataEntry = await config.readConfigData('processLogs');
    const res = { standard: await this.getStandardLogTables(limit) };
    const processesTables = await Promise.all(
      configDataEntry.map(async (process) => [
        process.definitionId,
        await this.getProcessLogTables(process.definitionId, limit),
      ]),
    );
    processesTables.forEach((processTables) => {
      [, res[processTables[0]]] = processTables;
    });
    return res;
  }

  /**
   * Deletes a logging table with a specific name
   * @param {string} name The name of the table that is to be deleted.
   * @requires {module:@proceed/system.Data}
   */
  deleteLoggingTable(name) {
    data.delete(name);
  }

  /**
   *  Sets the standardLogs variable in the logging_meta_data to 0 and move monitoring
   *  to monitoring_old
   */
  async clearStandardLogs() {
    const old = await data.read('monitoring.json');
    await data.delete('monitoring_old');
    // TODO: do this with a bulk write instead of this once supported
    Object.keys(old).forEach((key) => {
      data.write(`monitoring_old.json/${key}`, old[key]);
    });
    await data.delete('monitoring');
    this.rotationUtils.clearStandardLogs();
  }

  /**
   * Sets the currentLogs variable in the logging_meta_data for a given process to 0
   * @param {string} definitionID the definition Id of the process for which the operation is to be performed
   */
  clearProcessLogs(definitionID) {
    this.rotationUtils.clearProcessLogs(definitionID);
  }

  /**
   * Sets the tables variable in the logging_meta_data for a given process to 0
   * @param {string} definitionID the definition Id of the process for which the operation is to be performed
   */
  clearProcessTables(definitionID) {
    this.rotationUtils.clearProcessTables(definitionID);
  }

  /**
   * Descreases the tables counter in the logging_meta_data by a given number
   * @param {string} definitionID the definition Id of the process for which the operation is to be performed
   * @param {number} number the number by which the tables counter is to be decreased
   */
  decreaseProcessTables(definitionID, number) {
    this.rotationUtils.decreaseProcessTables(definitionID, number);
  }

  async deleteStandardLogs() {
    await data.delete('monitoring');
    await data.delete('monitoring_old');
    this.rotationUtils.clearStandardLogs();
  }

  async deleteProcessesLogs() {
    const configDataEntry = await config.readConfigData('processLogs');
    configDataEntry.forEach((processLogData) => {
      const definitionID = processLogData.definitionId;
      const currentID = processLogData.currentTableID;
      const numOfTables = processLogData.tables;
      const removeStartID = Math.max(currentID + 1 - numOfTables, 0);

      for (let i = removeStartID; i !== currentID + 1; i += 1) {
        this.deleteLoggingTable(`${definitionID}/${i}_monitoring_${definitionID}`);
      }
    });
    const loggingData = JSON.parse(await data.read('logging_meta_data.json/config'));
    loggingData.processLogs = [];
    await data.write('logging_meta_data.json/config', JSON.stringify(loggingData));
  }

  async deleteProcessLogs(definitionID) {
    const configDataEntry = await config.readConfigData('processLogs');
    // == to convert into strings if id is number
    // eslint-disable-next-line eqeqeq
    const processInfo = configDataEntry.find((c) => c.definitionId == definitionID);
    if (!processInfo) {
      return;
    }
    const currentID = processInfo.currentTableID;
    const numOfTables = processInfo.tables;
    const removeStartID = Math.max(currentID + 1 - numOfTables, 0);

    for (let i = removeStartID; i !== currentID + 1; i += 1) {
      this.deleteLoggingTable(`${definitionID}/${i}_monitoring_${definitionID}`);
    }

    const loggingData = JSON.parse(await data.read('logging_meta_data.json/config'));
    loggingData.processLogs.splice(loggingData.processLogs.indexOf(processInfo), 1);
    await data.write('logging_meta_data.json/config', JSON.stringify(loggingData));
  }

  async deleteInstanceLogs(definitionID, instanceId) {
    const configDataEntry = await config.readConfigData('processLogs');

    const processInfo = configDataEntry.find((c) => c.definitionId == definitionID);
    if (!processInfo) {
      return;
    }

    const currentID = processInfo.currentTableID;
    const numOfTables = processInfo.tables;
    const removeStartID = Math.max(currentID + 1 - numOfTables, 0);

    for (let i = removeStartID; i !== currentID + 1; i += 1) {
      const logTable = await data.read(`${definitionID}/${i}_monitoring_${definitionID}.json`);
      const instanceEntries = Object.entries(logTable || {})
        .filter(([key, value]) => {
          const entry = JSON.parse(value);
          return entry.instanceId === instanceId;
        })
        .map(([key]) => key);

      const deletePromises = instanceEntries.map(async (entry) => {
        await data.delete(`${definitionID}/${i}_monitoring_${definitionID}.json/${entry}`);
      });

      await Promise.all(deletePromises);
    }
  }

  async deleteAllLogs() {
    this.deleteStandardLogs();

    this.deleteProcessesLogs();
  }
}

/*
 * Retruns the singleton instance and creates it if necessary
 * returns the logging module's instance
 */
function getInstance() {
  if (!singletonInstance) {
    singletonInstance = new Logging();
  }
  return singletonInstance;
}

module.exports = getInstance();
