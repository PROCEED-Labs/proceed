import { messaging } from '@proceed/system';

import { toBpmnObject, getElementsByTagName, getMetaDataFromElement } from '@proceed/bpmn-helper';

/**
 * Will send the current instance information to the default messaging server and a user defined server if  one is defined in the bpmn of the running instance
 *
 * @param {Object} engine an instance of the proceed engine in which the process is executed in
 * @param {Object} instance the instance for which we want to send information
 */
export async function publishCurrentInstanceState(engine, instance) {
  try {
    const instanceInformation = engine.getInstanceInformation(instance.id);

    // send instance information to the default messaging server
    try {
      await messaging.publish(
        `process/${instanceInformation.processId}/instance/${instance.id}`,
        instanceInformation,
        undefined,
        { retain: true, prependDefaultTopic: true }
      );
    } catch (err) {
      if (engine._log) {
        engine._log.warn(
          `Failed to publish the state of the instance (id: ${instance.id}) to the messaging server defined in the engine config.`
        );
      }
    }

    const bpmn = engine._versionBpmnMapping[instanceInformation.processVersion];
    const bpmnObj = await toBpmnObject(bpmn);
    const [processObj] = getElementsByTagName(bpmnObj, 'bpmn:Process');

    const { mqttServer } = getMetaDataFromElement(processObj);

    if (mqttServer) {
      const { url, user, password, topic } = mqttServer;

      // send data if messaging server information is embedded in the bpmn
      if (mqttServer) {
        try {
          await messaging.publish(
            `${topic}/instance`,
            instanceInformation,
            url,
            { retain: true },
            { username: user, password }
          );
        } catch (err) {
          if (engine._log) {
            engine._log.warn(
              `Failed to publish the state of the instance (id: ${instance.id}) to the messaging server defined in the bpmn.`
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
