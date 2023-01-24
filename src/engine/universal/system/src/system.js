/* eslint-disable class-methods-use-this */
const NodeIPC = require('./ipc/node-ipc');
const WebIPC = require('./ipc/web-ipc');

// Provide meaningful error messages if IPC is accessed before it was set by the
// native part.
let IPC = {
  emit() {
    throw new Error('IPC object not set!');
  },
  listen() {
    throw new Error('IPC object not set!');
  },
  receive() {
    throw new Error('IPC object not set!');
  },
};

/**
 * @abstract
 * @memberof module:@proceed/system
 * @class
 */
class System {
  // no JSDoc docu because it would be inserted into every Class
  // that extends this one (all Dispatcher libs)
  async commandRequest(id, command) {
    IPC.emit([id, ...command]);
  }

  // no JSDoc docu because it would be inserted into every Class
  // that extends this one (all Dispatcher libs)
  async commandResponse(id, callback) {
    IPC.listen(id, callback);
  }
}

const setIPC = (_ipc, env) => {
  let ipc = _ipc;

  // Set default IPC if no custom IPC given
  if (!ipc) {
    if (env === 'node') {
      ipc = new NodeIPC();
    } else {
      ipc = new WebIPC();
    }
  }

  if (typeof ipc.emit !== 'function') {
    throw new Error("IPC object does'nt have an `emit()` method!");
  } else if (typeof ipc.listen !== 'function') {
    throw new Error("IPC object doesn't have a `listen()` method!");
  }

  // Store the IPC
  IPC = ipc;
};

module.exports = { System, setIPC };
