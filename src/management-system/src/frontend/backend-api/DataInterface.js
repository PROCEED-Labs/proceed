import api from './ms-api-interface/data.js';

class DataInterface {
  constructor() {}

  /**
   * Gets data known to the backend for machines, processes, capabilities ...
   *
   * @param {String} store name of the store the data is stored in
   * @returns {Array|Object} - array or object containing all the data from the respective store
   *                           + additional information gathered from the network (machines, capabilities)
   */
  async get(store) {
    const data = await api.get(store);
    return data;
  }

  /**
   * Stores data in the backend in one of the stores: machines, processes, capabilities ...
   * Currently completly overwrites the current store
   *
   * @param {String} store name of the store we want to store data in
   * @param {*} key key the new data is supposed to be stored under
   * @param {*} data the data to be stored
   * @param {*} userId the id of a user
   */
  async set(store, key, data, userId) {
    await api.set(store, key, data, userId);
  }

  /**
   * Sends command to backend to add an element to the store
   *
   * @param {String} storeName name of the store we want to add to
   * @param {Object} newElement element we want to add
   */
  async addToStore(storeName, newElement) {
    await api.addToStore(storeName, newElement);
  }

  /**
   * Sends command to backend to remove an element from the store
   *
   * @param {String} storeName store we want to remove from
   * @param {Object} elementId id of the element we want removed
   */
  async removeFromStore(storeName, elementId) {
    await api.removeFromStore(storeName, elementId);
  }

  /**
   * Sends command to backend to update an element in the store
   *
   * @param {String} storeName name of the store we want to update an element in
   * @param {String} elementId id of the element we want to update
   * @param {Object} updatedInfo object containing the new information state of the element
   */
  async updateInStore(storeName, elementId, updatedInfo) {
    await api.updateInStore(storeName, elementId, updatedInfo);
  }

  async getMachines() {
    const machines = await api.getMachines();
    return machines;
  }

  async addMachine(machineInfo) {
    await api.addMachine(machineInfo);
  }

  async removeMachine(machineId) {
    await api.removeMachine(machineId);
  }

  async updateMachine(machineId, machineUpdates) {
    await api.updateMachine(machineId, machineUpdates);
  }

  /**
   * Sends config value changes to the backend
   *
   * @param {Object} newValues the new config values
   */
  async updateConfig(newValues) {
    await api.updateConfig(newValues);
  }

  async getEnvProfileJSON(id, type) {
    const json = await api.getEnvProfileJSON(id, type);
    return json;
  }

  async saveEnvProfile(id, type, environmentProfile) {
    await api.saveEnvProfile(id, type, environmentProfile);
  }

  async deleteEnvProfile(id, type) {
    await api.deleteEnvProfile(id, type);
  }
}

export default DataInterface;
