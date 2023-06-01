import IPC from './ipc';

declare global {
  interface Window {
    // TODO: clarify what type window.IPC is (Socket.io client?)
    IPC: any;
  }
}

// This will be our singleton instance
let instance = null;

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
   */
  emit([taskID, taskName, args]: [string, string, any[]]) {
    window.IPC.emit([taskID, taskName, args]);
  }

  _processReceive([taskID, [err, ...args]]: [string, [Error | undefined, any[]]]) {
    this.receive(taskID, [err, ...args]);
  }
}

export default WebIPC;
