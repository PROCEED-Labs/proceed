import api from './ms-api-interface/process.js';

/**
 * @class
 *
 * Exposes an interface for interaction with the processes in the backend
 *
 * Which implementation (server/electron) is selected is based on the webpack config
 */
class ProcessInterface {
  /**
   * @hideconstructor
   */
  constructor() {}

  /**
   * Function that gets all available processes
   *
   * @returns {Array} - contains all available processes
   */
  async getProcesses() {
    const processes = await api.getProcesses();
    return processes;
  }

  /**
   * Gets object containing process information including its bpmn
   *
   * @param {String} id
   * @param {Boolean} preferPullFromBackend will ensure that the newest data stored in the backend will be returned if it exists (otherwise the api will return data from the local storage if it exists)
   * @returns {Object} process information
   */
  async getProcess(id, preferPullFromBackend) {
    const process = await api.getProcess(id, preferPullFromBackend);
    return process;
  }

  /**
   * Server: Returns a process from the backend writing it to the browser storage in the process
   * Electron: Same a getProcess
   *
   * @param {String} id the definitions id of the process
   */
  async pullProcess(id) {
    return await api.pullProcess(id);
  }

  /**
   * Takes a process from the local storage and pushes its data to the backend to allow sharing with other users
   *
   * @param {String} processDefinitionsId
   */
  async pushToBackend(processDefinitionsId) {
    await api.pushToBackend(processDefinitionsId);
  }

  /**
   * Permanently stores the given process in the backend if possible
   *
   * @param {Object} bpmn object containing the initial process information including the bpmn
   */
  async addProcess(processInfo) {
    await api.addProcess(processInfo);
  }

  /**
   * Replaces the old bpmn of a process with a new one
   *
   * @param {String} id the id of the process
   * @param {String} bpmn the process definition
   */
  async updateProcess(id, bpmn) {
    await api.updateProcess(id, bpmn);
  }

  /**
   * Forces xml overwrite in other clients in server version and just updates the stored process definition in electron version
   *
   * @param {String} processDefinitionsId
   * @param {String} bpmn
   */
  async updateWholeXml(processDefinitionsId, bpmn) {
    await api.updateWholeXml(processDefinitionsId, bpmn);
  }

  /**
   * Updates meta data of a process (should be used for data not in bpmn like departments of variables)
   *
   * @param {String} processDefinitionsId
   * @param {Object} metaDataChanges
   */
  async updateProcessMetaData(processDefinitionsId, metaDataChanges) {
    await api.updateProcessMetaData(processDefinitionsId, metaDataChanges);
  }

  /**
   * Updates the name associated with a process in the backend
   *
   * @param {String} processDefinitionsId
   * @param {String} newName
   */
  async updateProcessName(processDefinitionsId, newName) {
    await api.updateProcessName(processDefinitionsId, newName);
  }

  /**
   * Updates the version that the currently editable version of a process in the backend is based on
   *
   * @param {String} processDefinitionsId
   * @param {String} basedOnVersion
   */
  async updateProcessVersionBasedOn(processDefinitionsId, basedOnVersion) {
    await api.updateProcessVersionBasedOn(processDefinitionsId, basedOnVersion);
  }

  /**
   * Updates the description of the process contained in the process definition
   *
   * @param {String} processDefinitionsId
   * @param {String} processId the id of the specific process we want to update the description of
   * @param {String} description
   */
  async updateProcessDescription(processDefinitionsId, processId, description) {
    await api.updateProcessDescription(processDefinitionsId, processId, description);
  }

  /**
   * Removes the process from the permanent storage in the backend if it exists
   *
   * @param {String} processDefinitionsId
   * @param {String} isAuthenticated if the current user is logged in
   */
  async removeProcess(processDefinitionsId, isAuthenticated) {
    await api.removeProcess(processDefinitionsId, isAuthenticated);
  }

  /**
   * Adds a new process version for an existing process
   *
   * @param {String} processDefinitionsId
   * @param {String} bpmn
   */
  async addProcessVersion(processDefinitionsId, bpmn) {
    await api.addProcessVersion(processDefinitionsId, bpmn);
  }

  /**
   * Returns the bpmn of a specific version of a process
   *
   * @param {String} processDefinitionsId
   * @param {String} version
   * @returns {String} the bpmn of the process version
   */
  async getProcessVersionBpmn(processDefinitionsId, version) {
    return await api.getProcessVersionBpmn(processDefinitionsId, version);
  }

  /**
   * Server version: Registers client for modeling updates for the process with the given id
   * Electron version: does nothing
   *
   * @param {String} processDefinitionsId
   */
  async observeProcessEditing(processDefinitionsId) {
    await api.observeProcessEditing(processDefinitionsId);
  }

  /**
   * Server version: Unregisters client from modeling updates for process with given id
   * Electron version: does nothing
   *
   * @param {string} processDefinitionsId
   */
  async stopObservingProcessEditing(processDefinitionsId) {
    await api.stopObservingProcessEditing(processDefinitionsId);
  }

  /**
   * Server Version: Sets the process into a state where it cant be deleted by another client
   * Electron Version: does nothing
   *
   * @param {String} processDefinitionsId
   */
  async blockProcess(processDefinitionsId) {
    api.blockProcess(processDefinitionsId);
  }

  /**
   * Server Version: Sets the process into a state where its deletion isn't blocked by this client anymore
   * Electron Version: does nothing
   *
   * @param {String} processDefinitionsId
   */
  async unblockProcess(processDefinitionsId) {
    api.unblockProcess(processDefinitionsId);
  }

  /**
   * Server Version: Sets task inside a process into a state where it can't be deleted
   * Electron Version: does nothing
   *
   * @param {String} processDefinitionsId
   * @param {String} taskId
   */
  async blockTask(processDefinitionsId, taskId) {
    api.blockTask(processDefinitionsId, taskId);
  }

  /**
   * Sets task in process back into state where it can be deleted again
   *
   * @param {String} processDefinitionsId
   * @param {String} taskId
   */
  async unblockTask(processDefinitionsId, taskId) {
    api.unblockTask(processDefinitionsId, taskId);
  }

  /**
   * Server version: sends an event that occured in the process modeler to the backend to be distributed to other clients
   * Electron version: does nothing
   *
   * @param {String} processDefinitionsId
   * @param {String} type
   * @param {Object} context
   */
  async broadcastBPMNEvents(processDefinitionsId, type, context) {
    api.broadcastBPMNEvents(processDefinitionsId, type, context);
  }

  /**
   * Server version: sends an event to allow collaborative script editing to the server
   * Electron version: does nothing
   *
   * @param {String} processDefinitionsId
   * @param {String} elId
   * @param {String} elType
   * @param {String} script
   * @param {Object} change
   */
  async broadcastScriptChangeEvent(processDefinitionsId, elId, elType, script, change) {
    api.broadcastScriptChangeEvent(processDefinitionsId, elId, elType, script, change);
  }

  /**
   * Makes other editing clients update the constraints of an element
   *
   * @param {String} processDefinitionsId
   * @param {String} elementId
   * @param {Object} constraints
   */
  async updateConstraints(processDefinitionsId, elementId, constraints) {
    await api.updateConstraints(processDefinitionsId, elementId, constraints);
  }

  /**
   * Returns the html for all user tasks in a process
   *
   * @param {String} processDefinitionsId the id of the process
   * @returns {Object} - an object with the user task ids as the keys and the related html as values
   */
  async getUserTasksHTML(processDefinitionsId) {
    const takskHTMLMapping = await api.getUserTasksHTML(processDefinitionsId);
    return takskHTMLMapping;
  }

  /**
   * Saves the Html used in a user task in a process in the backend
   *
   * @param {String} processDefinitionsId the id of the process
   * @param {String} taskId the id of the user task
   * @param {String} html the html used in the user task
   */
  async saveUserTaskHTML(processDefinitionsId, taskId, html) {
    await api.saveUserTaskHTML(processDefinitionsId, taskId, html);
  }

  /**
   * Removes the stored html for a user task in the backend
   *
   * @param {String} processDefinitionsId the id of the process
   * @param {String} taskId the id of the user task
   */
  async deleteUserTaskHTML(processDefinitionsId, taskId) {
    await api.deleteUserTaskHTML(processDefinitionsId, taskId);
  }

  /**
   * Returns all images in a process
   *
   * @param {String} processDefinitionsId the id of the process
   * @returns {Object} - an object with the fileName as the keys and the related image as values
   */
  async getImage(processDefinitionsId, imageFileName) {
    const image = await api.getImage(processDefinitionsId, imageFileName);
    return image;
  }

  /**
   * Saves an image used in a process in the backend
   *
   * @param {String} processDefinitionsId the id of the process
   * @param {String} imageFilename the fileName of the image
   * @param {String} image the image used in the process
   */
  async saveImage(processDefinitionsId, imageFilename, image) {
    await api.saveImage(processDefinitionsId, imageFilename, image);
  }

  /**
   * Stores the script used in a script task in the backend
   *
   * @param {String} processDefinitionsId the id of the process that contains the script task
   * @param {String} taskId the id of the script task
   * @param {String} js the script that is supposed to be stored
   */
  async saveScriptTaskJS(processDefinitionsId, taskId, js) {
    await api.saveScriptTaskJS(processDefinitionsId, taskId, js);
  }
}

export default ProcessInterface;
