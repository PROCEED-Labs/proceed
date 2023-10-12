const IdsImport = require('ids');
let Ids;
if (IdsImport.default) {
  Ids = IdsImport.default;
} else {
  Ids = IdsImport;
}

const uuid = require('uuid');
// KR: I took this out because it is a relative import of the
// old management-system package.json, which is not available
// for the build version of v2.
//const msPackageJSON = require('../../../management-system/package.json');

/**
 * @module @proceed/bpmn-helper
 */

/**
 * Exporter name is used in the bpmn definitions parts
 *
 * @returns {string} static exporter name
 */
function getExporterName() {
  return 'PROCEED Management System';
  // return msPackageJSON.fullname;
}

/**
 * Exporter version is used in the bpmn definitions parts
 *
 * This version should be adjusted when this module (bpmn-helper)
 * changes or any changes in the management-system occur regarding the export
 *
 * @returns {string} static exporter version
 */
function getExporterVersion() {
  return '1.0.0';
  //return msPackageJSON.version;
}

/**
 * Generate a new ID for the 'definitions' element in a PROCEED process
 * @returns {string} a new PROCEED definitions 'id'
 */
function generateDefinitionsId() {
  return '_' + uuid.v4();
}

const idGenerator = new Ids([32, 36, 1]);
/**
 * Generate a new ID for PROCEED BPMN elements
 *
 * @param {string} [prefix] optional prefix for the id
 * @returns {string} short id in the form '0bkz1kb'
 */
function generateBpmnId(prefix) {
  if (prefix) {
    return idGenerator.nextPrefixed(prefix);
  } else {
    return idGenerator.next();
  }
}

/**
 * Generates the 'fileName' attribute string of a PROCEED UserTask
 * @returns A new 'filename' value
 */
function generateUserTaskFileName() {
  return generateBpmnId('User_Task_');
}

function generateProcessId() {
  return generateBpmnId('Process_');
}

/**
 * Return the string for the 'implementation' attribute in a UserTask
 * @returns {String} URL of the HTML spec
 */
function getUserTaskImplementationString() {
  return 'https://html.spec.whatwg.org/';
}

function generateTargetNamespace(id) {
  return `https://docs.proceed-labs.org/${id}`;
}

/**
 * Creates a minimal valid proceed bpmn
 *
 * @param {*} processId the id to use for the contained process
 * @param {string} startEventId the id to use for the start event
 * @returns {string} a minimal valid proceed bpmn
 */
function initXml(
  processId = `Process_${generateBpmnId()}`,
  startEventId = `StartEvent_${generateBpmnId()}`,
) {
  const bpmn = `
  <?xml version="1.0" encoding="UTF-8"?>
  <definitions
      xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
      xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
      xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
      xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
      xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  >
    <Process id="${processId}" name="PROCEED Main Process" processType="Private" isExecutable="true">
      <startEvent id="${startEventId}"/>
    </Process>
    <bpmndi:BPMNDiagram id="BPMNDiagram_1">
      <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="${processId}">
        <bpmndi:BPMNShape id="${startEventId}_di" bpmnElement="${startEventId}">
          <dc:Bounds height="36.0" width="36.0" x="350.0" y="200.0"/>
        </bpmndi:BPMNShape>
      </bpmndi:BPMNPlane>
    </bpmndi:BPMNDiagram>
  </definitions>
`;
  return bpmn;
}

module.exports = {
  getExporterName,
  getExporterVersion,
  generateBpmnId,
  generateDefinitionsId,
  generateProcessId,
  generateUserTaskFileName,
  getUserTaskImplementationString,
  generateTargetNamespace,
  initXml,
};
