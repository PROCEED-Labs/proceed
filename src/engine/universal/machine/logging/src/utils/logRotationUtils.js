let utilsSingleton;

/**
 * @memberof module:@proceed/machine.Logging
 * @class
 *
 * Class containing all functions to write to the logging_meta_data table
 */
class RotationUtils {
  /**
   * @hideconstructor
   * @param {module:@proceed/system.Data} data the global data object
   */
  constructor(data) {
    this.data = data;
    this.configData = null;
    this.done = this.data.read('logging_meta_data.json/config').then((configData) => {
      this.configData = JSON.parse(configData);
    });
  }

  /**
    Increases the counter for standardLogs in the logging_meta_data by one
  */
  async incrementStandardLog() {
    await this.done;
    this.configData.standardLogs += 1;
    this.data.write('logging_meta_data.json/config', JSON.stringify(this.configData));
  }

  /**
    Increases the currentTableID counter in the logging_meta_data by one for a given process
    @param {string} the ID of the process that the operation is being performed for
  */
  async incrementCurrentTableID(definitionID) {
    await this.done;
    const dataObject = this.configData.processLogs.find((p) => p.definitionId === definitionID);
    dataObject.currentTableID += 1;
    this.data.write('logging_meta_data.json/config', JSON.stringify(this.configData));
  }

  /**
    Creates an initial meta-data object for a given process
    @param {string} the ID of the process that the operation is being performed for
  */
  async createProcessDataObject(definitionId) {
    const processDataObject = {
      definitionId,
      tables: 1,
      currentLogs: 0,
      currentTableID: 0,
    };

    await this.done;
    this.configData.processLogs.push(processDataObject);
    this.data.write('logging_meta_data.json/config', JSON.stringify(this.configData));
  }

  /**
    Increases the currentLogs counter in the logging_meta_data by one for a given process
    @param {string} the ID of the process that the operation is being performed for
  */
  async addProcessLog(definitionID) {
    await this.done;
    const dataObject = this.configData.processLogs.find((p) => p.definitionId === definitionID);
    dataObject.currentLogs += 1;
    this.data.write('logging_meta_data.json/config', JSON.stringify(this.configData));
  }

  /**
    Increases the tables counter in the logging_meta_data by one for a given process
    @param {string} the ID of the process that the operation is being performed for
  */
  async addProcessTable(definitionID) {
    await this.done;
    const dataObject = this.configData.processLogs.find((p) => p.definitionId === definitionID);
    dataObject.tables += 1;
    this.data.write('logging_meta_data.json/config', JSON.stringify(this.configData));
  }

  /**
    Sets the tables counter in the logging_meta_data to 0 for a given process
    @param {string} the ID of the process that the operation is being performed for
  */
  async clearProcessTables(definitionID) {
    await this.done;
    const dataObject = this.configData.processLogs.find((p) => p.definitionId === definitionID);
    dataObject.tables = 0;
    this.data.write('logging_meta_data.json/config', JSON.stringify(this.configData));
  }

  /**
    Decreases the tables counter in the logging_meta_data by a given number for a given process
    @param {string} the ID of the process that the operation is being performed for
    @param {number} the number that the tables counter will be decreased by
  */
  async decreaseProcessTables(definitionID, number) {
    await this.done;
    const dataObject = this.configData.processLogs.find((p) => p.definitionId === definitionID);
    dataObject.tables -= number;
    this.data.write('logging_meta_data.json/config', JSON.stringify(this.configData));
  }

  /**
    Sets the standardLogs counter in the logging_meta_data to 0
  */
  async clearStandardLogs() {
    await this.done;
    this.configData.standardLogs = 0;
    this.data.write('logging_meta_data.json/config', JSON.stringify(this.configData));
  }

  /**
    Sets the currentLogs counter in the logging_meta_data for a given process to 0
    @param {string} the ID of the process that the operation is being performed for
  */
  async clearProcessLogs(definitionId) {
    await this.done;
    const dataObject = this.configData.processLogs.find((p) => p.definitionId === definitionId);
    dataObject.currentLogs = 0;
    this.data.write('logging_meta_data.json/config', JSON.stringify(this.configData));
  }
}

/*
  Initializes the singleton by passing it a data object
  param {module:@proceed/system.Data} data the global data instance
  returns the singleton instance of this class
*/
function init(data) {
  utilsSingleton = new RotationUtils(data);
  return utilsSingleton;
}

/*
  Returns the singleton instance of this class
  returns the singleton instance of this class
*/
function getInstance() {
  return utilsSingleton;
}

module.exports = {
  init,
  getInstance,
};
