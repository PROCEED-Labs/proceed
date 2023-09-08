import { messaging } from '@proceed/system';
const { information: machineInformation } = require('@proceed/machine');
const { version: proceedVersion } = require('../../../../native/node/package.json');

import { toBpmnObject, getElementsByTagName, getMetaDataFromElement } from '@proceed/bpmn-helper';

/**
 * Will send the current instance information to the default messaging server and a user defined server if  one is defined in the bpmn of the running instance
 *
 * @param {Object} engine an instance of the proceed engine in which the process is executed
 * @param {Object} instance the instance for which we want to send information
 */
export async function publishCurrentInstanceState(engine, instance) {
  try {
    const instanceInformation = engine.getInstanceInformation(instance.id);

    const instanceTopic = `process/${instanceInformation.processId}/instance/${instance.id}`;

    // send instance information to the default messaging server
    try {
      await messaging.publish(instanceTopic, instanceInformation, undefined, {
        retain: true,
        prependEngineTopic: true,
      });
      await messaging.publish(instanceTopic, instanceInformation, undefined, {
        retain: true,
        prependBaseTopic: true,
      });
    } catch (err) {
      if (engine._log) {
        engine._log.warn(
          `Failed to publish the state of the instance (id: ${instance.id}) to the messaging server defined in the engine config.`,
        );
      }
    }

    const bpmn = engine._versionBpmnMapping[instanceInformation.processVersion];
    const bpmnObj = await toBpmnObject(bpmn);
    const [processObj] = getElementsByTagName(bpmnObj, 'bpmn:Process');

    const { mqttServer } = getMetaDataFromElement(processObj);

    if (mqttServer) {
      let { url, user, password, topic: bpmnTopic } = mqttServer;

      const { id: machineId } = await machineInformation.getMachineInformation(['id']);

      // We want to handle 3 situations
      // 1. empty topic => set topic to default process/[definition-id]/versions/[version-id] (without preceding slash)
      // 2. non-empty topic without trailing slash => append the default topic [user-defined-topic]/process/[definition-id]/versions/[version-id]
      // 3. non-empty topic with trailing slash => append the default topic without adding another slash [user-defined-topic]/process/[definition-id]/versions/[version-id]
      if (bpmnTopic.length && !bpmnTopic.endsWith('/')) bpmnTopic += '/';

      // send data if messaging server information is embedded in the bpmn
      if (mqttServer) {
        try {
          await messaging.publish(
            `${bpmnTopic}proceed-pms/${instanceTopic}`,
            instanceInformation,
            url,
            { retain: true },
            { username: user, password, clientIdPrefix: `${instance.id}-` },
          );
          await messaging.publish(
            `${bpmnTopic}proceed-pms/${instanceTopic}/engine/${machineId}/instance/${instance.id}`,
            instanceInformation,
            url,
            { retain: true },
            { username: user, password, clientIdPrefix: `${instance.id}-` },
          );
        } catch (err) {
          if (engine._log) {
            engine._log.warn(
              `Failed to publish the state of the instance (id: ${instance.id}) to the messaging server defined in the bpmn.`,
            );
          }
        }
      }
    }
  } catch (err) {
    if (engine._log) {
      engine._log.debug(err);
    }
  }
}

/**
 * Will check if there is publishing information in the bpmn.
 * If yes it will establish a persistent connection with a will message that informs about the status of the engine should the engine be disconnected unexpectedly
 * Will also send a message that informs subscribers that the engine is online
 *
 * @param {Object} engine an instance of the proceed engine in which the process is executed
 * @param {Object} instance the instance for which we want to establish the connection
 */
export async function setupEngineStatusInformationPublishing(engine, instance) {
  try {
    const instanceInformation = engine.getInstanceInformation(instance.id);

    const bpmn = engine._versionBpmnMapping[instanceInformation.processVersion];
    const bpmnObj = await toBpmnObject(bpmn);
    const [processObj] = getElementsByTagName(bpmnObj, 'bpmn:Process');

    const { mqttServer } = getMetaDataFromElement(processObj);

    if (mqttServer) {
      let { url, user, password, topic } = mqttServer;

      const { id: machineId } = await machineInformation.getMachineInformation(['id']);

      if (topic && !topic.endsWith('/')) topic += '/';

      const statusTopic = `${topic}proceed-pms/process/${instanceInformation.processId}/instance/${instance.id}/engine/${machineId}/status`;

      await messaging.connect(url, {
        username: user,
        password,
        // We need to use a unique id for this connection (there can only be one connection with the same client id; existing connections are disconnected when a new connection with the same clientId is established)
        clientId: `${instance.id}-${machineId}`,
        // setting up a mqtt-specific mechanism that will automatically inform all subscribed clients when the connection between the engine and the mqtt server is closed unexpectedly
        will: {
          topic: statusTopic,
          payload: { running: false, version: proceedVersion },
          qos: 1,
          retain: true,
        },
      });

      // send initial message that the engine is online
      await messaging.publish(
        statusTopic,
        { running: true, version: proceedVersion },
        url,
        {
          retain: true,
        },
        {
          username: user,
          password,
          clientIdPrefix: `${instance.id}-`,
        },
      );
    }
  } catch (err) {
    engine._log.warn(
      `Failed to set up engine status publishing for the instance (id: ${instance.id}) on the messaging server defined in the bpmn.`,
    );
  }
}

/**
 * Will publish that the engine is done executing the instance (by removing it from the instance engine information)
 *
 * Closes the connection to the messaging server that was established for the instance
 *
 * @param {Object} engine an instance of the proceed engine in which the process is executed
 * @param {Object} instanceInformation information about the instance
 */
export async function teardownEngineStatusInformationPublishing(engine, instanceInformation) {
  try {
    const bpmn = engine._versionBpmnMapping[instanceInformation.processVersion];
    const bpmnObj = await toBpmnObject(bpmn);
    const [processObj] = getElementsByTagName(bpmnObj, 'bpmn:Process');

    const { mqttServer } = getMetaDataFromElement(processObj);

    if (mqttServer) {
      let { url, user, password, topic } = mqttServer;

      const { id: machineId } = await machineInformation.getMachineInformation(['id']);

      if (topic && !topic.endsWith('/')) topic += '/';

      const statusTopic = `${topic}proceed-pms/process/${instanceInformation.processId}/instance/${instanceInformation.processInstanceId}/engine/${machineId}/status`;

      // inform subscribers that this engine is done with the instance execution (the engine info will be removed)
      await messaging.publish(
        statusTopic,
        '',
        url,
        {
          retain: true,
        },
        {
          username: user,
          password,
          clientIdPrefix: `${instanceInformation.processInstanceId}-`,
        },
      );

      // close the connection since it is not needed anymore
      await messaging.disconnect(url, {
        username: user,
        password,
        clientId: `${instanceInformation.processInstanceId}-${machineId}`,
      });
    }
  } catch (err) {
    engine._log.warn(
      `Failed to stop engine status publishing for the instance (id: ${instanceInformation.processInstanceId}) on the messaging server defined in the bpmn.`,
    );
  }
}
