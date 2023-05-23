/* eslint-disable class-methods-use-this */
const { System } = require('./system.ts');
const { generateUniqueTaskID } = require('./utils.ts');

/**
 * @memberof module:@proceed/system
 * @extends module:@proceed/system.System
 * @class
 * @hideconstructor
 */
class Data extends System {
  /**
   * Read the value for the given key.
   * @async
   * @param {string} key The key (of form table/id e.g. "execution/1").
   *                     To read all values in the table simply set key
   *                     to the table name e.g. "table" without a slash or id.
   * @param {object|null} options The options for the read operation
   */
  async read(key, options) {
    const taskID = generateUniqueTaskID();

    // Prepare the promise
    const listenPromise = new Promise((resolve, reject) => {
      // Listen for the response
      this.commandResponse(taskID, (err, data) => {
        // Resolve or reject the promise
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }

        return true;
      });
    });

    // Emit the task
    this.commandRequest(taskID, ['read', [key, options]]);
    return listenPromise;
  }

  /**
   * Write the value for the given key.
   * @async
   * @param {string} key The key (of form table/id e.g. "execution/1")
   * @param {object} value The value to store
   * @param {object|null} options The options for the write operation
   */
  async write(key, value, options) {
    const taskID = generateUniqueTaskID();

    // Prepare the promise
    const listenPromise = new Promise((resolve, reject) => {
      // Listen for the response
      this.commandResponse(taskID, (err, data) => {
        // Resolve or reject the promise
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }

        return true;
      });
    });

    // Emit the task
    this.commandRequest(taskID, ['write', [key, value, options]]);
    return listenPromise;
  }

  /**
   * Get the process version bpmn from the native part
   *
   * @async
   * @param {string} definitionId The definitionId of the process to read from
   * @param {string|number} version the bpmn version that should be returned
   * @param {object|null} options The options for the read operation
   */
  async readProcessVersionBpmn(definitionId, version, options) {
    return this.read(`${definitionId}/${definitionId}-${version}.bpmn`, options);
  }

  /**
   * Store the bpmn for the given process version
   *
   * @async
   * @param {string} definitionId The definitionId of the process to write in
   * @param {string|number} version the bpmn version that is stored
   * @param {object} bpmn
   * @param {object|null} options The options for the write operation
   */
  async writeProcessVersionBpmn(definitionId, version, bpmn, options) {
    return this.write(`${definitionId}/${definitionId}-${version}.bpmn`, bpmn, options);
  }

  /**
   * Return all user-tasks for given process
   * @async
   * @param {string} definitionId The definitionId of the process to read all user-tasks from
   * @param {object|null} options The options for the read operation
   */
  async getAllUserTasks(definitionId, options) {
    return this.read(`${definitionId}/user-tasks/`, options);
  }

  /**
   * Read the html for the given usertask in given process
   * @async
   * @param {string} definitionId The definitionId of the process to read from
   * @param {string} fileName the fileName of the usertask
   * @param {object|null} options The options for the read operation
   */
  async readUserTaskHTML(definitionId, fileName, options) {
    return this.read(`${definitionId}/user-tasks/${fileName}.html`, options);
  }

  /**
   * Write the html for the given fileName in the given process
   * @async
   * @param {string} definitionId The definitionId of the process to write in
   * @param {string} fileName The fileName to store the html in
   * @param {string} html The html to store
   * @param {object|null} options The options for the write operation
   */
  async writeUserTaskHTML(definitionId, fileName, html, options) {
    return this.write(`${definitionId}/user-tasks/${fileName}.html`, html, options);
  }

  /**
   * Store image at given path
   * @async
   * @param {string} definitionId The definitionId of the process to write in
   * @param {string} fileName The fileName to store the image in
   * @param {string} image The image to store
   * @param {object|null} options The options for the write operation
   */
  async writeImage(definitionId, fileName, image, options) {
    return this.write(`${definitionId}/images/${fileName}`, image, options);
  }

  /**
   * Returns all image fileNames in given process
   * @async
   * @param {string} definitionId The definitionId of the process to read from
   * @param {object|null} options The options for the read operation
   */
  async readImages(definitionId, options) {
    return this.read(`${definitionId}/images/`, options);
  }

  /**
   * Read image in given process
   * @async
   * @param {string} definitionId The definitionId of the process to read from
   * @param {string} fileName the fileName
   * @param {object|null} options The options for the read operation
   */
  async readImage(definitionId, fileName, options) {
    return this.read(`${definitionId}/images/${fileName}`, options);
  }

  /**
   * Delete the value for the given key.
   * @async
   * @param {string} key The key (of form table/id e.g. "execution/1")
   * @param {object|null} options The options for the delete operation
   */
  async delete(key, options) {
    return this.write(key, null, options);
  }
}

module.exports = Data;
