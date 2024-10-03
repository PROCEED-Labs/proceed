const childProcess = require('child_process');
const path = require('path');

/*
 * The list of commands that are absolutely necessary in order for the engine to
 * be able to execute. If one of the commands listed here is not present at the
 * start up of the engine, an error is thrown. There might be additional
 * commands (optional and custom) that are implemented but the absence of those
 * will not cause an error on start up.
 */
const requiredCommands = [
  /* Communication */
  // 'serve',
  // 'respond',
  'discover',

  /* Data */
  'read',
  'write',
];

class Native {
  constructor() {
    this._engine = null;
    /**
     * Contains the available commands and the corresponding module which should
     * be invoked once an appropriate message arrives.
     */
    this._modules = new Map();

    this._onAfterEngineLoaded = new Set();
  }

  registerModule(module) {
    // Set the module for each of its commands individually instead of storing
    // the commands as an array because for performance reasons we don't want to
    // go through every command list to find the correct module once a message
    // comes in.
    module.commands.forEach((command) => this._modules.set(command, module));

    if (module.onAfterEngineLoaded) {
      if (!module.id) {
        console.error(
          `WARNING: A module was registered with an 'onAfterEngineLoaded' hook but without a necessary id.
          The module was ignored
          `,
        );
      } else {
        this._onAfterEngineLoaded.add(module);
      }
    }
  }

  async startEngine(options) {
    // Verify that all required modules are present
    if (!requiredCommands.every((command) => this._modules.has(command))) {
      throw new Error('Missing required module(s)');
    }

    // We detect if this is the built version of the PROCEED engine, meaning
    // that the native part and the universal are separately bundled and are
    // available as `proceed-engine.js` and `universal.js`.
    // eslint-disable-next-line no-undef
    const isElectronOrServer =
      (typeof navigator !== 'undefined' &&
        navigator.userAgent &&
        navigator.userAgent.toLowerCase().indexOf(' electron/') > -1) ||
      process.env.SERVER;

    // If webpack is used (bundled) and we are not in electron, then we have the
    // universal part separately bundled.
    // eslint-disable-next-line camelcase
    const bundledExternalUniversal =
      typeof __webpack_require__ === 'function' && !isElectronOrServer;

    if (options.childProcess) {
      // If called with an inspect flag, change the debug port for the engine
      // childprocess so we don't get an `address in use` error
      const execArgv = [...process.execArgv];
      const inspectIndex = execArgv.findIndex((arg) => arg.startsWith('--inspect'));
      if (inspectIndex !== -1) {
        const inspectFlag = execArgv[inspectIndex];
        execArgv[inspectIndex] = `${inspectFlag.substring(0, inspectFlag.indexOf('='))}=59130`;
      }

      const pathToUniversal = bundledExternalUniversal
        ? path.join(__dirname, 'injector.js')
        : require.resolve('./injector.js');

      const args =
        this._onAfterEngineLoaded.size > 0
          ? Array.from(this._onAfterEngineLoaded.values()).map((module) => module.id)
          : [];

      // Fork universal engine process
      this._engine = childProcess.fork(pathToUniversal, args, { execArgv });

      // Listen for IPC calls
      this._engine.on('message', (m) => {
        this._onMessage(m);
      });

      // make sure that the universal part is always closed before the native part to prevent errors
      process.on('SIGTERM', () => {
        this._engine.kill();
        process.exit();
      });

      this.send = function (m) {
        this._engine.send(m);
      };
    } else {
      // Require directly if not in a separate process

      // To avoid having to bundle the core module in the built case, it gets
      // excluded from the build by the webpack config file. This means, in the
      // built native part we cannot use the regular require for the core module
      // since it is excluded (it is `Function`).
      this._engine = bundledExternalUniversal
        ? __non_webpack_require__('./injector.js')
        : require('./injector.js');

      // Execute custom code on the universal engine
      for (const module of this._onAfterEngineLoaded.values()) {
        module.onAfterEngineLoaded(this._engine);
      }

      // Create the "IPC"
      const that = this;
      class NoIPC extends this._engine.IPC {
        emit(message) {
          that._onMessage(message);
        }
      }

      // Instantiate the "IPC" and connect for sending and receiving messages from the engine
      const noIPC = new NoIPC();

      this.send = (message) => {
        const [taskID, args] = message;
        noIPC.receive(taskID, args);
      };

      this._engine.init(options, noIPC);
      await this._engine.setupSubProcessScriptExecution();
    }
    return undefined;
  }

  send() {
    throw new Error('Node native #send() was not overwritten!');
  }

  _onMessage(message) {
    const [taskID, command, args] = message;
    const module = this._modules.get(command);
    if (!module) {
      // TODO: give warning but consider optional modules which are not
      // necessary
      return;
    }

    // Make a respond function that the module's execution method can use to
    // send multiple messages associated with this taskID back to the engine.
    const send = (err, data) => {
      this.send([taskID, [err, ...(data || [])]]);
    };

    // Call the corresponding module execution method for this command
    const res = module.executeCommand(command, args, send);

    // In case there is only one response to make, the execution method doesn't
    // need to use the send argument, send it back here
    if (typeof res === 'object' && res instanceof Promise) {
      res.then((data) => send(null, data)).catch((err) => send(err));
    }
  }

  activateSilentMode() {
    return this._engine.activateSilentMode();
  }

  async deactivateSilentMode() {
    return this._engine.deactivateSilentMode();
  }
}

module.exports = new Native();
