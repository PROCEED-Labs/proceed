import io from 'socket.io-client';
import { Data } from './modules/web-data/data.module';
import { Console } from './modules/web-console/console.module';
import { Config } from './modules/web-config/config.module';
import { Machine } from './modules/web-machine/machine.module';

// PROCEED Engine needs to be builded before
const PROCEED = require('../../../../../../build/engine/universal');

const socket = io();

window.document.addEventListener('DOMContentLoaded', () => {
  class CustomIPC extends PROCEED.IPC {
    constructor() {
      super();
      this.clientNativeModules = new Map();
      const registerModule = (module) => {
        module.commands.forEach((command) => this.clientNativeModules.set(command, module));
      };

      registerModule(new Data());
      registerModule(new Console());
      registerModule(new Config());
      registerModule(new Machine());
    }

    emit(message) {
      // console.log('%c MESSAGE FROM UNIVERSAL: ', 'color: green', message);
      const [taskID, command, args] = message;
      const module = this.clientNativeModules.get(command);
      if (!module) {
        // If module is not available on client, send it to the server
        socket.emit('message', message);
      } else {
        // Machine Module | all properties are not possible to compute in the browser, so send it to server
        if (module instanceof Machine) {
          const [taskID, command, args] = message;
          const [properties] = args;
          if (
            !(
              properties.includes('id') ||
              properties.includes('os') ||
              properties.includes('cpu') ||
              properties.includes('mem') ||
              properties.includes('disk') ||
              properties.includes('battery') ||
              properties.includes('display') ||
              properties.includes('inputs') ||
              properties.includes('outputs')
            )
          ) {
            socket.emit('message', message);
            return;
          }
        }

        const send = (err, data) => {
          // console.log('%c RESPONSE FROM NATIVE_CLIENT', 'color: #c6e2ff', command, data);
          this._processReceive([taskID, [err, ...(data || [])]]);
        };

        const result = module.executeCommand(command, args);
        if (typeof result === 'object' && result instanceof Promise) {
          result.then((data) => send(null, data)).catch((err) => send(err));
        }
      }
    }

    _processReceive(message) {
      const [taskID, args] = message;
      this.receive(taskID, args);
    }
  }

  // Initialize the Universal Part
  const customIPC = new CustomIPC();
  PROCEED.init({}, customIPC);

  socket.on('response', (data) => {
    // console.log('%c RESPONSE FROM NATIVE_SERVER:', 'color: orange', data);
    customIPC._processReceive(data);
  });
});
