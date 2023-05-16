import IPC from './ipc';

class NodeIPC extends IPC {
  /**
   * Create a new instance of an IPC using NodeJS.
   * On receiving a message this will call `IPC.receive()`.
   */
  constructor() {
    super();
    process.on('message', this.processReceive.bind(this));
  }

  /**
   * Emit a message to the native part of the PROCEED dispatcher in use.
   * @param message The message that should be sent [id, name, args]
   */
  emit([taskID, taskName, args]: [string, string, any[]]) {
    process.send([taskID, taskName, args]);
  }

  private processReceive([taskID, [err, ...args]]: [string, [Error | undefined, any[]]]) {
    this.receive(taskID, [err, ...args]);
  }
}

export default NodeIPC;
