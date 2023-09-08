import { messaging } from '@proceed/system';

import {
  toBpmnObject,
  getElementsByTagName,
  getMetaDataFromElement,
  getProcessDocumentationByObject,
  getMilestonesFromElement,
  getDefinitionsName,
} from '@proceed/bpmn-helper';

const { enableMessaging } = require('../../../../../../FeatureFlags');

const { logging } = require('@proceed/machine');

const configObject = {
  moduleName: 'DISTRIBUTION',
};

const logger = logging.getLogger(configObject);

/**
 * Publishes information about a newly deployed process version both to the default messaging server as well as any messaging server defined in the version bpmn
 *
 * @param processDefinitionsId
 * @param version
 * @param bpmn
 */
export async function publishDeployedVersionInfo(
  processDefinitionsId: string,
  version: string | number,
  bpmn: string,
) {
  if (!enableMessaging) return;

  const bpmnObj = await toBpmnObject(bpmn);
  const [processObj] = getElementsByTagName(bpmnObj, 'bpmn:Process');
  const processName = await getDefinitionsName(bpmnObj);

  const {
    mqttServer,
    timePlannedOccurrence,
    timePlannedDuration,
    timePlannedEnd,
    costsPlanned,
    orderNumber,
    orderCode,
    customerId,
    customerName,
  } = getMetaDataFromElement(processObj);

  // get all process steps
  let tasks = getElementsByTagName(bpmnObj, 'bpmn:UserTask');
  tasks = tasks.concat(getElementsByTagName(bpmnObj, 'bpmn:Task'));
  tasks = tasks.concat(getElementsByTagName(bpmnObj, 'bpmn:ScriptTask'));

  const stepsInfo = {
    processId: processDefinitionsId,
    processVersion: version,
    processName,

    timePlannedOccurrence,
    timePlannedDuration,
    timePlannedEnd,
    costsPlanned,
    orderNumber,
    orderCode,
    customerId,
    customerName,

    processSteps: tasks.map((task) => {
      // get the required information from all process steps
      const { timePlannedOccurrence, timePlannedEnd, timePlannedDuration, costsPlanned, ...rest } =
        getMetaDataFromElement(task);
      const description = getProcessDocumentationByObject(task);
      const milestones = getMilestonesFromElement(task);

      return {
        stepId: task.id,
        name: task.name,
        taskType: task.$type,
        description,
        milestones,
        timePlannedOccurrence,
        timePlannedDuration,
        timePlannedEnd,
        costsPlanned,
        ...rest,
      };
    }),

    bpmnString: bpmn,
  };

  const defaultTopic = `process/${processDefinitionsId}/version/${version}`;

  // send the information to the requested messaging server (if one is set )
  if (mqttServer) {
    let { url, user, password, topic } = mqttServer;

    // We want to handle 3 situations
    // 1. empty topic => set topic to default process/[definition-id]/versions/[version-id] (without preceding slash)
    // 2. non-empty topic without trailing slash => append the default topic [user-defined-topic]/process/[definition-id]/versions/[version-id]
    // 3. non-empty topic with trailing slash => append the default topic without adding another slash [user-defined-topic]/process/[definition-id]/versions/[version-id]
    if (topic.length && !topic.endsWith('/')) topic += '/';

    try {
      await messaging.publish(
        `${topic}proceed-pms/${defaultTopic}`,
        stepsInfo,
        url,
        { retain: true },
        { username: user, password },
      );
    } catch (err) {
      logger.warn(
        `Failed on publishing the deployment of version ${version} of the process with id ${processDefinitionsId} to the messaging server defined in the bpmn`,
      );
    }
  }

  // send the information to the default messaging server
  try {
    await messaging.publish(defaultTopic, stepsInfo, undefined, {
      retain: true,
      prependEngineTopic: true,
    });

    await messaging.publish(defaultTopic, stepsInfo, undefined, {
      retain: true,
      prependBaseTopic: true,
    });
  } catch (err) {
    logger.warn(
      `Failed on publishing the deployment of version ${version} of the process with id ${processDefinitionsId} to the messaging server defined in the engine config`,
    );
  }
}
