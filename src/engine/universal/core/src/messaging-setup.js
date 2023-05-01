/**
 * This file contains functionality that handles setup and interactions of the messaging interface with other modules of the engine
 *
 * Its purpose is to keep the messaging interface as light as possible while providing some additional features that make its usage easier
 */
module.exports = {
  async setupMessaging(messaging, configModule, machineModule) {
    // get default values from the config and machine info modules that shall be used when the caller of the publish function does not provide specific data
    // this should prevent that all modules that want to publish data have to import the config and machine info modules and get these values themselves
    const { serverAddress, username, password } = await configModule.readConfig('messaging');
    const { id: machineId } = await machineModule.getMachineInformation(['id']);

    messaging.init(serverAddress, username, password, machineId);
  },
};
