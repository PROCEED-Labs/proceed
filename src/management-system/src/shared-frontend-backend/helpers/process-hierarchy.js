const {
  toBpmnObject,
  getTargetDefinitionsAndProcessIdForCallActivityByObject,

  getElementDI,
} = require('@proceed/bpmn-helper');

/**
 * @module helpers
 */

/**
 * @module process-hierarchy
 * @memberof module:helpers
 */

/**
 * Returns all subprocesses and callActivities among the flowNodes of an element
 *
 * Recursively searches subprocesses and callActivities in subProcess elements
 *
 * @param {Moddle-Object} element the element we search for subprocesses and callActivities
 * @param {Moddle-Object} definitions the definitions element the element is nested into
 * @returns {Object[]} recursive list containing all subprocesses and callActivities
 */
function getNestedSubprocessesAndCallActivities(element, definitions) {
  const subprocesses = [];

  if (element.flowElements) {
    element.flowElements.forEach((flowElement) => {
      if (flowElement.$type === 'bpmn:CallActivity' || flowElement.$type === 'bpmn:SubProcess') {
        const subprocessInfo = {
          name: flowElement.name,
          elementId: flowElement.id,
        };

        if (flowElement.$type === 'bpmn:CallActivity') {
          subprocessInfo.isCallActivity = true;
          let definitionId, version;
          try {
            ({ definitionId, version } = getTargetDefinitionsAndProcessIdForCallActivityByObject(
              definitions,
              flowElement.id
            ));
            subprocessInfo.calledProcessId = definitionId;
            subprocessInfo.version = version;
          } catch (err) {}
        }
        if (flowElement.$type === 'bpmn:SubProcess') {
          subprocessInfo.subprocesses = getNestedSubprocessesAndCallActivities(
            flowElement,
            definitions
          );
          const di = getElementDI(flowElement, definitions);
          subprocessInfo.isExpanded = di.isExpanded;
        }
        subprocesses.push(subprocessInfo);
      }
    });
  }

  return subprocesses;
}

/**
 * Computes a recursiv list of subprocesses and callActivities
 * for the given bpmn file
 *
 * @param {(string|object)} bpmn - the process definition as XML string or BPMN-Moddle Object
 * @returns {Promise.<Array>} hierarchy list of subprocesses
 */
async function getProcessHierarchy(bpmn) {
  const definitions = typeof bpmn === 'string' ? await toBpmnObject(bpmn) : bpmn;

  const process = definitions.rootElements.find((element) => element.$type === 'bpmn:Process');

  return getNestedSubprocessesAndCallActivities(process, definitions);
}

/**
 * This method is a recursive method to get all n-level subprocesses within a process
 *
 * @param {Object} process complete process with all supporting elements
 * @returns Returns an array of all subprocesses with a process
 */
function flattenSubprocesses(process) {
  const flatten = (a) => {
    if (Array.isArray(a.subprocesses)) {
      return [].concat(...a.subprocesses, ...a.subprocesses.map(flatten));
    } else {
      return a;
    }
  };

  const isUnique = (element, index, array) => array.indexOf(element) === index;

  return flatten(process).filter(isUnique);
}

module.exports = { getProcessHierarchy, flattenSubprocesses };
