/**
 * @abstract
 * @memberof module:@proceed/system.System
 */
class IPC {
  constructor() {
    if (new.target === IPC) {
      throw new Error('The class IPC cannot be instantiated directly.');
    }

    this._callbacks = new Map();
  }

  emit() {
    throw new Error(`The subclass ${this.constructor.name} doesn't implement emit().`);
  }

  listen(taskID, callback) {
    // Store the callback
    this._callbacks.set(taskID, callback);
  }

  async receive(taskID, args) {
    if (!this._callbacks.has(taskID)) {
      // TODO: consider logging unhadled events
      return;
    }
    // Call stored callback with arguments
    const shouldRemove = await this._callbacks.get(taskID)(...args);

    //const used = process.memoryUsage().heapUsed / 1024 / 1024;
    //console.log(`${Math.round(used * 100) / 100} MB heap used`);

    if (shouldRemove) {
      this._callbacks.delete(taskID);
    }
  }
}

module.exports = IPC;
