/* eslint-disable no-undef */
/* eslint-disable class-methods-use-this */
const IPC = require('./ipc');

/**
 * @memberof module:@proceed/system.System
 * @extends module:@proceed/system.System.IPC
 */
class NodeIPC extends IPC {
  /**
   * Create a new instance of an IPC using NodeJS.
   * On receiving a message this will call `IPC.receive()`.
   */
  constructor() {
    super();
    process.on('message', this._processReceive.bind(this));
  }

  /**
   * Emit a message to the native part of the PROCEED dispatcher in use.
   * @param {array} message The message that should be sent [id, name, args]
   */
  emit(message) {
    process.send(message);
  }

  _processReceive(message) {
    const [taskID, args] = message;
    this.receive(taskID, args);
  }
}

module.exports = NodeIPC;
