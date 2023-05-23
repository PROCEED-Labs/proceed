import IPC, { IPCListener } from './ipc/ipc';
import NodeIPC from './ipc/node-ipc';
import WebIPC from './ipc/web-ipc';

// Provide meaningful error messages if IPC is accessed before it was set by the
// native part.
class NoIPC extends IPC {
  emit() {
    throw new Error('IPC object not set!');
  }
  listen() {
    throw new Error('IPC object not set!');
  }
  async receive() {
    throw new Error('IPC object not set!');
  }
}

let ipcInstance: IPC = new NoIPC();

export abstract class System {
  commandRequest(id: string, [command, args]: [string, any[]]) {
    ipcInstance.emit([id, command, args]);
  }

  commandResponse(id: string, callback: IPCListener) {
    ipcInstance.listen(id, callback);
  }
}

export const setIPC = (ipc: IPC, env?: string) => {
  // Set default IPC if no custom IPC given.
  if (!ipc) {
    if (env === 'node') {
      ipc = new NodeIPC();
    } else {
      ipc = new WebIPC();
    }
  }

  // Quick guard to make sure the IPC object has the required methods.
  if (typeof ipc.emit !== 'function') {
    throw new Error("IPC object does'nt have an `emit()` method!");
  } else if (typeof ipc.listen !== 'function') {
    throw new Error("IPC object doesn't have a `listen()` method!");
  }

  // Store the IPC singleton.
  ipcInstance = ipc;
};
