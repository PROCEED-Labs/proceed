const { version: proceedVersion } = require('../../../native/node/package.json');

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

    // if a default server is defined try to establish a connection
    if (serverAddress) {
      try {
        await messaging.connect(serverAddress, {
          username,
          password,
          clientId: machineId,
          // setting up a mqtt-specific mechanism that will automatically inform all subscribed clients when the connection between the engine and the mqtt server is closed unexpectedly
          will: {
            topic: `engine/${machineId}/status`,
            payload: { running: false, version: proceedVersion },
            qos: 1,
            retain: true,
          },
        });
      } catch (err) {}
    }

    messaging.init(serverAddress, username, password, machineId);

    try {
      // publish that the engine is online
      messaging.publish(
        `engine/${machineId}/status`,
        { running: true, version: proceedVersion },
        undefined,
        {
          retain: true,
        }
      );
    } catch (err) {}
  },
};
