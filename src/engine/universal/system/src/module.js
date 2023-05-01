const Network = require('./network');
const HTTP = require('./http');
const Data = require('./data');
const Capability = require('./capability');
const Console = require('./console');
const Config = require('./config');
const Machine = require('./machine');
const Discovery = require('./discovery');
const Timer = require('./timer');
const Messaging = require('./messaging');
const { setIPC } = require('./system');

/**
 * Detects the environemnt and sets the `environment` property accordingly.
 * Private for now, since it should only be called once, but could be reused.
 * @private
 */
function detectEnvironment() {
  // Detect in which environment we are so we can set the IPC accordingly.
  let env = 'browser'; // assume browser if nothing else fits

  // NodeJS
  try {
    // Only Node.JS has a process variable that is of [[Class]] process
    if (Object.prototype.toString.call(global.process) === '[object process]') {
      env = 'node';
    } else {
      env = 'web';
    }
    /* eslint-disable no-empty */
  } catch (e) {}

  return env;
}
const environment = detectEnvironment();

/**
 * @module @proceed/system
 */

const system = {
  /**
   * @returns {module:@proceed/system.Network}
   */
  network: new Network(environment),

  /**
   * @returns {module:@proceed/system.Messaging}
   */
  messaging: new Messaging(),

  /**
   * @returns {module:@proceed/system.HTTP}
   */
  http: new HTTP(environment),

  /**
   * @returns {module:@proceed/system.Data}
   */
  data: new Data(),

  /**
   * @returns {module:@proceed/system.Device}
   */
  machine: new Machine(),

  /**
   * @returns {module:@proceed/system.Capability}
   */
  capability: new Capability(),

  config: new Config(),

  console: new Console(),

  /**
   * @returns {module:@proceed/system.Discovery}
   */
  discovery: new Discovery(),

  timer: new Timer(),

  setIPC(ipc) {
    setIPC(ipc, environment);
  },
};

module.exports = system;
