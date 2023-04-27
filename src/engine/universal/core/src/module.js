const system = require('@proceed/system');
const IPC = require('@proceed/system/src/ipc/ipc.js');
const { config, logging } = require('@proceed/machine');
const { information: machineInformation } = require('@proceed/machine');
const distribution = require('@proceed/distribution');
const capabilities = require('@proceed/capabilities');
const ui = require('@proceed/ui');
const decider = require('@proceed/decider');
const monitoring = require('@proceed/monitoring');
const management = require('./management.js');
const { setup5thIndustryEndpoints } = require('./engine/5thIndustry.js');
const { enableInterruptedInstanceRecovery } = require('../../../../../FeatureFlags.js');
const { setupMessaging } = require('./messaging-setup.js');
const { enableMessaging } = require('../../../../../FeatureFlags.js');

const configObject = {
  moduleName: 'CORE',
};

const logger = logging.getLogger(configObject);

/**
 * @module @proceed/core
 */

module.exports = {
  /**
   * Initializes the universal part of the PROCEED engine. Dependending on the
   * options, the discovery and networking can delay the opening of the
   * communication channels to a later point using the `silentMode` key.
   * @param {object} options The options for the engine start up
   * @param {*} ipc The IPC instance to use in the dispatcher
   */
  async init(options = {}, ipc) {
    // Set custom IPC means
    system.setIPC(ipc);
    config.init();

    await machineInformation.init();
    await capabilities.start();
    await config.start();
    await logging.start();
    await decider.start();
    await monitoring.start(management);
    ui.serve(management);
    setup5thIndustryEndpoints();
    // Open /status endpoint at last
    distribution.init(management);

    if (enableMessaging) {
      setupMessaging(system.messaging, config, machineInformation);
      system.messaging.publish('test', 'Hello World');
    }

    if (!options.silentMode) {
      // Start normally if no options or silentMode != true
      await this.deactivateSilentMode();
    }

    // start all processes that were still running when the engine stopped running
    if (enableInterruptedInstanceRecovery) {
      await management.restoreInterruptedInstances();
    }
  },

  provideScriptExecutor(scriptExecutor) {
    management.provideScriptExecutor(scriptExecutor);
  },

  /**
   * Deactivates the silentMode by opening all networking and discovery
   * communication channels.
   */
  async deactivateSilentMode() {
    logger.info('Publishing the engine (deactivating silentmode)');
    logger.debug('Set port for HTTP endpoint of the engine');
    logger.debug('Start advertising on the network via mDNS');
    await distribution.publish();
    logger.debug('REST endpoints started');
    logger.info(
      `PROCEED Engine started on PORT ${await config.readConfig(
        'machine.port'
      )} under the mDNS NAME "${distribution.communication.usedMDNSName}"`
    );
  },

  /**
   * Activates the silentMode by closing the networking and discovery
   * communication channels. The engine is still running and operative but
   * cannot receive any requests nor can be seen in the network.
   */
  async activateSilentMode() {
    logger.info('Activating silent mode');
    logger.debug('Unsetting the HTTP port and stopping mDNS advertisement');
    await distribution.unpublish();
    logger.debug('Engine gone silent');
  },

  test() {
    management.createInstance('_bf5fda88-ed36-40fa-a5d0-9474644f2667', {});
  },

  /**
   * The IPC class to use in the native part to establish the
   * dispatcher's communication channel.
   * @type {IPC}
   */
  IPC,
};

// eslint-disable-next-line no-undef
if (typeof process !== 'undefined' && typeof process.send !== 'undefined') {
  // We expose the init method for use in a JS context to supply custom IPC
  // instances, but in case of a fork (NodeJS) this module is the entry point
  // and so we have to init ourselves.
  module.exports.init();
}
