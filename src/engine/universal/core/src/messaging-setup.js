const { version: proceedVersion } = require('../../../native/node/package.json');

/**
 * This file contains functionality that handles setup and interactions of the messaging interface with other modules of the engine
 *
 * Its purpose is to keep the messaging interface as light as possible while providing some additional features that make its usage easier
 */
module.exports = {
  async setupMessaging(messaging, configModule, machineModule, logger) {
    // get default values from the config and machine info modules that shall be used when the caller of the publish function does not provide specific data
    // this should prevent that all modules that want to publish data have to import the config and machine info modules and get these values themselves
    let { serverAddress, username, password, baseTopic } = await configModule.readConfig(
      'messaging'
    );
    const { id: machineId } = await machineModule.getMachineInformation(['id']);

    if (baseTopic && !baseTopic.endsWith('/')) baseTopic += '/';

    baseTopic += 'proceed-pms';

    // if a default server is defined try to establish a connection
    if (serverAddress) {
      try {
        await messaging.connect(serverAddress, {
          username,
          password,
          // To support multiple connections with the same messaging server we have to use different client ids or new connections with the same id will lead to the previous connection being closed
          clientId: machineId + (username ? `|${username}` : ''),
          // setting up a mqtt-specific mechanism that will automatically inform all subscribed clients when the connection between the engine and the mqtt server is closed unexpectedly
          will: {
            topic: `${baseTopic}/engine/${machineId}/status`,
            payload: { running: false, version: proceedVersion },
            qos: 1,
            retain: true,
          },
        });
      } catch (err) {
        logger.debug(`Failed to connect to the messaging server defined in the config. ${err}`);
      }
    }

    messaging.init(serverAddress, username, password, machineId, baseTopic, logger);

    if (serverAddress) {
      try {
        // publish that the engine is online
        await messaging.publish(
          `${baseTopic}/engine/${machineId}/status`,
          { running: true, version: proceedVersion },
          undefined,
          {
            retain: true,
          }
        );
      } catch (err) {
        logger.debug(
          `Failed to publish the engine status to the messaging server defined in the config. ${err}`
        );
      }
    }
  },
};
