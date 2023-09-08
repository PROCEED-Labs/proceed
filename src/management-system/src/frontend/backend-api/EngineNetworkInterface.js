import api from './ms-api-interface/network.js';

class EngineNetworkInterface {
  constructor() {}

  /**
   * Will try to import a process with all its versions and additional data (e.g. user tasks, images etc.)
   *
   * @param {string} processDefinitionsId
   */
  async importProcess(processDefinitionsId) {
    await api.importProcess(processDefinitionsId);
  }

  /**
   * Sends request to all machines the process was deployed to to remove the deployment
   *
   * @param {String} processDefinitionsId the id of the process
   */
  async removeDeployment(processDefinitionsId) {
    await api.removeDeployment(processDefinitionsId);
  }

  /**
   * Starts a new instance of a deployed process
   *
   * @param {String} processDefinitionsId the id of the process
   * @param {Number} version the version of the process to start
   */
  async startInstance(processDefinitionsId, version) {
    return await api.startInstance(processDefinitionsId, version);
  }

  /**
   * Stops a running instance of a deployed process
   *
   * @param {String} processDefinitionsId the id of the process
   * @param {String} instanceId the id of the running instance
   */
  async stopInstance(processDefinitionsId, instanceId) {
    await api.stopInstance(processDefinitionsId, instanceId);
  }

  /**
   * Pauses a running instance of a deployed process
   *
   * @param {String} processDefinitionsId the id of the process
   * @param {String} instanceId the id of the running instance
   */
  async pauseInstance(processDefinitionsId, instanceId) {
    await api.pauseInstance(processDefinitionsId, instanceId);
  }

  /**
   * Resumes a paused instance of a deployed process
   *
   * @param {String} processDefinitionsId the id of the process
   * @param {String} instanceId the id of the running instance
   */
  async resumeInstance(processDefinitionsId, instanceId) {
    await api.resumeInstance(processDefinitionsId, instanceId);
  }

  /**
   * Changes the state of the tokens inside a process instance
   *
   * @param {String} processDefinitionsId the id of the process we want to change an instance of
   * @param {String} instanceId the id of the instance we want to change
   * @param {Object} tokenChanges
   * @param {Object} tokenChanges.addedTokens the tokens the user wants to add to the instance
   * @param {Object} tokenChanges.movedTokens the tokens the user wants to move to another point in the instance
   * @param {Object} tokenChanges.removedTokens the tokens the user marked for removal
   */
  async updateInstanceTokenState(processDefinitionsId, instanceId, tokenChanges) {
    await api.updateInstanceTokenState(processDefinitionsId, instanceId, tokenChanges);
  }

  /**
   * Will try to migrate the requested instances from their current version to the target version
   *
   * @param {String} definitionId the id of the process the instances are running in
   * @param {Number} currentVersion the version of the process the instances are running in
   * @param {Number} targetVersion the version the instances are supposed to be migrated to
   * @param {String[]} instanceIds the instances to migrate
   * @param {{ tokenMapping, flowElementMapping }} migrationArgs mappings that define how the tokens inside the instance should be adapted on migration
   */
  async migrateInstances(definitionId, currentVersion, targetVersion, instanceIds, migrationArgs) {
    await api.migrateInstances(
      definitionId,
      currentVersion,
      targetVersion,
      instanceIds,
      migrationArgs,
    );
  }

  /**
   * Updates a token inside an instance with given attributes
   *
   * @param {String} processDefinitionsId
   * @param {String} instanceId
   * @param {String} tokenId
   * @param {String} attributes
   */
  async updateToken(processDefinitionsId, instanceId, tokenId, attributes) {
    await api.updateToken(processDefinitionsId, instanceId, tokenId, attributes);
  }

  /**
   * Signals to the backend that it shall deploy the process dynamically or based on information in the process definition
   *
   * @param {String} processDefinitionsId the id of the process
   * @param {Number} version the version of the process to deploy
   * @param {Boolean} dynamic indicator if deployment is supposed to be dynamic or not
   */
  async deployProcessVersion(processDefinitionsId, version, dynamic) {
    await api.deployProcessVersion(processDefinitionsId, version, dynamic);
  }

  /**
   * Gets the status of an engine on a machine (Running and reachable or not)
   *
   * @param {String} machineId the id of the machine
   * @returns {Boolean} - if the machine is running an engine that is reachable
   */
  async getStatus(machineId) {
    const running = await api.getStatus(machineId);

    return running;
  }

  async getFullProcessVersionData(processDefinitionsId, version) {
    return await api.getFullProcessVersionData(processDefinitionsId, version);
  }

  async completeUserTask(instanceId, userTaskId) {
    await api.completeUserTask(instanceId, userTaskId);
  }

  async updateUserTaskMilestone(instanceId, userTaskId, milestone) {
    await api.updateUserTaskMilestone(instanceId, userTaskId, milestone);
  }

  async updateUserTaskIntermediateVariablesState(instanceId, userTaskId, variable) {
    await api.updateUserTaskIntermediateVariablesState(instanceId, userTaskId, variable);
  }

  /**
   * Gets all properties of the given machine or the ones specified
   *
   * @param {String} machineId the id of the machine
   * @param {Array} properties optional: the specific properties that are wanted
   * @returns {Object} - contains values for all requested properties
   */
  async getMachineProperties(machineId, properties) {
    const machineProperties = await api.getMachineProperties(machineId, properties);

    return machineProperties;
  }

  /**
   * Send configuration for the machines engine to use
   *
   * @param {String} machineId the id of the machine
   * @param {Object} configuration the new configuration
   */
  async sendConfiguration(machineId, configuration) {
    await api.sendConfiguration(machineId, configuration);
  }

  /**
   * Requests the configuration used by the engine running on the machine
   *
   * @param {String} machineId the id of the machine
   * @returns {Object} the configuration used by the engine running on the machine
   */
  async getConfiguration(machineId) {
    const configuration = await api.getConfiguration(machineId);

    return configuration;
  }

  /**
   * Request the logs of an engine running on a machine
   *
   * @param {String} machineId the id of the machine
   * @returns {Object} . contains general logging and optional logging specific to different processes
   */
  async getLogs(machineId) {
    const logs = await api.getLogs(machineId);

    return logs;
  }

  /**
   * Signals to backend that it should continuously check machines
   */
  async startMachinePolling() {
    await api.startMachinePolling();
  }

  /**
   * Signals to backend that checking machines is not necessary anymore
   */
  async stopMachinePolling() {
    await api.stopMachinePolling();
  }

  /**
   * Allows subscription to continouosly renewed information about a machine
   *
   * @param {String} machineId the id of the machine
   */
  async subscribeToMachine(machineId) {
    api.subscribeToMachine(machineId);
  }

  /**
   * Allows unsubscribing from the information stream about a machine
   *
   * @param {String} machineId the id of the machine
   */
  async unsubscribeFromMachine(machineId) {
    api.unsubscribeFromMachine(machineId);
  }

  /**
   * Allows subscription to continuous renewed logs for a machine
   *
   * @param {String} machineId
   */
  async subscribeToMachineLogs(machineId) {
    await api.subscribeToMachineLogs(machineId);
  }

  /**
   * Allows unsubscribing from the log stream of a machine
   *
   * @param {String} machineId
   */
  async unsubscribeFromMachineLogs(machineId) {
    await api.unsubscribeFromMachineLogs(machineId);
  }
}

export default EngineNetworkInterface;
