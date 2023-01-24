/**
 * Class that allows creation of a queue system for async functions that should not operate at the same time (might change the same ressource)
 *
 * Based on what is already done in some modules in the engine
 */
class ExecutionQueue {
  constructor() {
    this.lastInQueue = Promise.resolve();
  }

  /**
   * Allows to enter a new function into the queue
   *
   * @param {Function} operation the function that is supposed to be executed
   * @returns {Promise} - a promise that resolves as soon as the operation was executed
   */
  enqueue(operation) {
    const last = this.lastInQueue;
    this.lastInQueue = new Promise(async (resolve, reject) => {
      try {
        await last;
        // wait until previous operation ended (doesn't matter if it succeeded or failed)
      } catch (err) {}

      // execute operation (allow reaction to errors)
      try {
        const data = await operation();
        resolve(data);
      } catch (err) {
        reject(err);
      }
    });

    return this.lastInQueue;
  }
}

module.exports = ExecutionQueue;
