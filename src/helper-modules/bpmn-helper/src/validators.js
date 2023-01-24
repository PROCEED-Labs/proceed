const { toBpmnObject, getElementsByTagName, getElementById } = require('./util.js');

/**
 * @module @proceed/bpmn-helper
 */

/**
 * Checks if a process referenced in a call activity contains only a single non-typed start event
 *
 * @param {String} xml
 * @param {String} processId
 */
async function validateCalledProcess(xml, processId) {
  const definitions = await toBpmnObject(xml);

  const process = getElementById(definitions, processId);

  if (!process) {
    throw new Error(`No process matching the referenced id ${processId} found!`);
  }

  const startEvents = getElementsByTagName(process, 'bpmn:StartEvent');

  const nonTypedStartEvents = startEvents.filter(
    (startEvent) => !startEvent.eventDefinitions || !startEvent.eventDefinitions.length
  );

  if (nonTypedStartEvents.length !== 1) {
    throw new Error(
      `The referenced process ${processId} doesn't contain exactly one non-typed start event`
    );
  }

  return true;
}

module.exports = {
  validateCalledProcess,
};
