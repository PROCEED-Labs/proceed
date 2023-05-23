/* eslint-disable class-methods-use-this */
const { System } = require('./system.ts');
const { generateUniqueTaskID } = require('./utils.ts');

/**
 * @memberof module:@proceed/system
 * @extends module:@proceed/system.System
 * @class
 * @hideconstructor
 */
class Discovery extends System {
  /**
   *
   * @param {*} hostname
   * @param {*} port
   */
  async publish(hostname, port, txt) {
    const taskID = generateUniqueTaskID();

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
    this.commandRequest(taskID, ['publish', [hostname, port, txt]]);

    return listenPromise;
  }

  unpublish() {
    const taskID = generateUniqueTaskID();

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
    this.commandRequest(taskID, ['unpublish', []]);

    return listenPromise;
  }

  /**
   * Discover other devices in the network
   * @returns {Promise}
   */
  async discover() {
    const taskID = generateUniqueTaskID();

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
    this.commandRequest(taskID, ['discover', []]);

    return listenPromise;
  }

  /**
   * Remove a (unreachable) service from the list of discovered services
   *
   * @param {String} ip
   * @param {Number} port
   */
  removeDiscoveredService(ip, port) {
    const taskID = generateUniqueTaskID();

    // Emit the task
    this.commandRequest(taskID, ['remove_discovered_service', [ip, port]]);
  }

  /**
   * Restarts the discovery of services on the network and republishes if currently publishing
   * (might be used after a disconnect)
   */
  resetDiscovery() {
    const taskID = generateUniqueTaskID();

    const listenPromise = new Promise((resolve, reject) => {
      // Listen for the response
      this.commandResponse(taskID, (err) => {
        // Resolve or reject the promise
        if (err) {
          reject(err);
        } else {
          resolve();
        }

        return true;
      });
    });

    // Emit the task
    this.commandRequest(taskID, ['reset_discovery', []]);

    return listenPromise;
  }

  /**
   * Set callback that gets called when the native part discovers a new engine
   *
   * @param {Function} cb
   */
  onDiscoveredMachine(cb) {
    const upMessageTaskId = generateUniqueTaskID();
    this.commandResponse(upMessageTaskId, cb);
    this.commandRequest(upMessageTaskId, ['on_discovered', []]);
  }

  /**
   * Sets callback that gets called when a machine that was discovered sends unpublish message
   *
   * @param {Function} cb
   */
  onUndiscoveredMachine(cb) {
    const downMessageTaskId = generateUniqueTaskID();
    this.commandResponse(downMessageTaskId, cb);
    this.commandRequest(downMessageTaskId, ['on_undiscovered', []]);
  }
}

module.exports = Discovery;
