const NativeModule = require('@proceed/native-module');
const fs = require('fs');
const path = require('path');

/**
 * **Capabilities**
 *
 * All available (IoT-related) capabilities are registered here. You can easily
 * add functionality by implementing a custom module and adding it to the
 * `capabilities` directory. This module automatically registers all the modules
 * in that directory.
 *
 * @class
 */
class Capabilities extends NativeModule {
  constructor(options) {
    super();

    this.commands = ['capability', 'allCapabilities'];
    // Store for all the functions
    this._functions = new Map();
    this._names = [];

    // Create the capabilities folder if it doesn't exist yet
    this._path = (options && options.dir) || __dirname;
    try {
      fs.statSync(`${this._path}/capabilities/`);
    } catch (err) {
      if (err.code === 'ENOENT') {
        return fs.mkdirSync(`${this._path}/capabilities/`);
      }
      throw err;
    }

    this._setFunctions();
  }

  /**
   *
   * @param {*} command
   * @param {*} args
   * @param {*} send
   */
  executeCommand(command, args, send) {
    if (command === 'capability') {
      return this.handleCapabilityTask(args, send);
    }
    if (command === 'allCapabilities') {
      return this.allCapabilities();
    }
    return undefined;
  }

  /**
   * Set the available functions
   * @memberof Capabilities
   */
  _setFunctions() {
    const capPath = path.join(this._path, './capabilities/'); // FIXME: require.main.filename ?
    const files = fs.readdirSync(capPath, { withFileTypes: true });
    files
      .filter((file) => file.isDirectory())
      .forEach((dir) => {
        // eslint-disable-next-line global-require, import/no-dynamic-require
        const jsonld = fs.readFileSync(`${capPath + dir.name}/semantic.jsonld`, 'utf-8');
        this._functions.set(capPath + dir.name, jsonld);
      });
  }

  /**
   * Receives the iot-task message from the dpe and calls
   * the corresponding function if it was registered.
   * @memberof Capabilities
   * @param {array} task The taskID and args for the iot-task
   */
  handleCapabilityTask(args, send) {
    // The semantic task description and args for the function
    const [description, taskArgs] = args;
    // Execute the function if it's available
    /* eslint-disable global-require, import/no-dynamic-require */
    const func = eval('require(description)');
    if (typeof func === 'function') {
      func(taskArgs, this.respond.bind(this, send));
    } else {
      this.respond(send, ['Not implemented!']);
    }
  }

  /**
   * @returns {list} all capabilities
   */
  async allCapabilities() {
    const entries = Array.from(this._functions.entries());
    const allCapabilities = entries.map(([id, jsonld]) => ({
      identifier: id,
      semanticDescription: jsonld,
    }));
    return [allCapabilities];
  }

  /**
   * Send the response back to the native part of the PROCEED dispatcher.
   * @memberof Capabilities
   * @param {string} taskID The taskID for the task
   * @param {array} res The response array [err, ...args]
   */
  respond(send, res) {
    send(...res);
  }
}

module.exports = Capabilities;
