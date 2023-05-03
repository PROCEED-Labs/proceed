/* eslint-disable class-methods-use-this */
const { System } = require('./system');
const utils = require('./utils.ts');

/**
 * @memberof module:@proceed/system
 * @extends module:@proceed/system.System
 * @class
 * @hideconstructor
 */
class Capability extends System {
  /**
   * Start an arbitrary task.
   *
   * Since not all types of IoT-tasks are available on all systems (e.g. a client without
   * a camera can't take a photo) this function assumes that an availability check
   * has been made prior to this call, thus this system is capable of performing
   * the task.
   *
   * @param {string} id The identifier for the native capability to be executed
   * @param {array} [args={}] The arguments to be passed to the task function as
   * `{ param: value }` pairs
   * @param {function} [callback=undefined] If a callback is provided it will be
   *  called each time the task triggers it. Use that if you expect multiple calls
   *  like e.g. the value from a temperature sensor every 5 seconds.
   *  Otherwise this function behaves like an async function and returns a Promise.
   */
  executeNativeCapability(id, args = {}, callback = undefined) {
    const taskID = utils.generateUniqueTaskID();

    // Either use the given callback or construct a new Promise
    let listenPromise;
    if (callback) {
      this.commandResponse(taskID, callback);
    } else {
      listenPromise = new Promise((resolve, reject) => {
        // Listen for the response
        this.commandResponse(taskID, (err, data) => {
          // Resolve or reject the promise
          if (err) {
            reject(err);
          } else {
            resolve(data);
          }
        });
      });
    }

    // Emit the task
    this.commandRequest(taskID, ['capability', [id, args]]);
    return listenPromise;
  }

  /**
   * Get all capabilities available in the native side
   * @returns {Promise}
   */
  async getAllCapabilities() {
    const taskID = utils.generateUniqueTaskID();

    // Prepare the promise
    const listenPromise = new Promise((resolve, reject) => {
      // Listen for the response
      this.commandResponse(taskID, (err, data) => {
        // Resolve or reject the promise
        if (err) {
          reject(err);
        } else {
          const list = data.map((elem) => ({
            semanticDescription: JSON.parse(elem.semanticDescription),
            identifier: elem.identifier,
          }));
          resolve(list);
        }
      });
    });

    // Emit the task
    this.commandRequest(taskID, ['allCapabilities', []]);
    return listenPromise;
  }
}

module.exports = Capability;
