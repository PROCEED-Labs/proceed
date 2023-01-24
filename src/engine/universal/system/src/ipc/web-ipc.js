/* eslint-disable no-undef */
const IPC = require('./ipc');

// This will be our singleton instance
let instance = null;

/**
 * @memberof module:@proceed/system.System
 * @extends module:@proceed/system.System.IPC
 */
class WebIPC extends IPC {
  /**
   * Create a new instance of an IPC using a Browser.
   * On receiving a message this will call `IPC.receive()`.
   */
  constructor() {
    super();
    window.IPC.on('message', this._processReceive.bind(this));
  }

  static singleton() {
    if (!instance) {
      instance = new WebIPC();
    }
    return instance;
  }

  /**
   * Emit a message to the native part of the PROCEED dispatcher in use.
   * @param {string} taskID
   * @param {string} taskName
   * @param {array} args
   */
  emit(taskID, taskName, args) {
    window.IPC.emit([taskID, taskName, args]);
  }

  _processReceive(message) {
    const [taskID, args] = message;
    this.receive(taskID, args);
  }
}

module.exports = WebIPC;
