const {
  toBpmnObject,
  toBpmnXml,
  getElementsByTagName,
  generateDefinitionsId,
  setDefinitionsId,
  setStandardDefinitions,
  setTargetNamespace,
  addDocumentationToProcessObject,
  getProcessDocumentationByObject,
  getExporterName,
  getExporterVersion,
  getDefinitionsInfos,
  initXml,
  getDefinitionsName,
  setDefinitionsName,
  getOriginalDefinitionsId,
  generateProcessId,
  getIdentifyingInfos,
} = require('@proceed/bpmn-helper');

/**
 * @module shared-frontend-backend
 */

/**
 * This module is supposed to aid in the creation of Proceed processes with MS specific information
 *
 * e.g. values from the MS store or meta data not stored in the bpmn
 *
 * @module processHelper
 * @memberof module:shared-frontend-backend
 */

/**
 * @typedef {Object} ProceedProcess
 * @property {String} id // the id as it is in the definitions element of the process
 * @property {String} type // the type of the process (process or project etc.)
 * @property {String} originalId // the id the process had previously (most likely an imported process)
 * @property {String} name // the name as it is in the definitions element of the process
 * @property {String} description // the description (the content of documentation element of the first process element in the process model)
 * @property {String[]} processIds // the ids of all process elements inside the process modell
 * @property {Object[]} variables // [{ name: String, type: String }] the variables supposed to be used in the process
 * @property {String} variables.name // the name of the variable
 * @property {String} variables.type // the type of the variable (eg. number, array, string)
 * @property {String[]} departments // the departments the process belongs to
 * @property {Object[]} inEditingBy // information about the clients that are editing the process, used in the server version for collaborative editing
 * @property {String} inEditingBy.id // the id of the client editing this process
 * @property {(String|null)} inEditingBy.task // id of the task this client is editing
 * @property {String} createdOn // the date and time the process was added in the management-system
 * @property {String} lastEdited // the date and time the process was edited the last time
 * @property {Boolean} [shared] // only used in the server version for processes stored in the backend
 * @property {Array} versions // the explicit versions of the process that were created by users
 */

/**
 * Creates a default process meta object containing all fields we expect a process meta object to have
 *
 * @returns {ProceedProcess} object containing all the necessary meta info of a process with default values
 */
function getDefaultProcessMetaInfo() {
  const date = new Date().toUTCString();
  return {
    id: '',
    type: 'process',
    originalId: '',
    name: 'Default Process',
    description: '',
    owner: null,
    processIds: [],
    variables: [],
    departments: [],
    inEditingBy: [],
    createdOn: date,
    lastEdited: date,
    shared: false,
    versions: [],
  };
}

/**
 * @typedef {Object} ProcessInfo
 * @property {String} bpmn the process definition
 * @property {ProceedProcess} metaInfo the meta information about the process
 */
/**
 * Creates a new proceed process either from a given bpmn or from a default bpmn template
 * creates a bpmn and a meta info object
 *
 * @param {Object} processInfo the initial process meta info and optional bpmn
 * @param {Boolean} [noDefaults] if the meta info is not supposed to be completed with default values (defaults to false)
 * @returns {ProcessInfo} the process bpmn and meta information
 */
async function createProcess(processInfo, noDefaults = false) {
  let metaInfo = { ...processInfo };
  delete metaInfo.bpmn;

  // create default bpmn if user didn't provide any
  let bpmn = processInfo.bpmn || initXml();

  let definitions;

  try {
    const xmlObj = await toBpmnObject(bpmn);
    [definitions] = getElementsByTagName(xmlObj, 'bpmn:Definitions');
  } catch (err) {
    throw new Error(`Invalid bpmn: ${err}`);
  }

  // if we import a process not created in proceed we set the id to a proceed conform id
  const { exporter, id: importDefinitionsId } = await getDefinitionsInfos(definitions);
  if (
    exporter !== getExporterName() &&
    (!processInfo.id || processInfo.id === importDefinitionsId)
  ) {
    processInfo.id = generateDefinitionsId();
  }

  if (!processInfo.name) {
    // try to get name from bpmn object
    metaInfo.name = await getDefinitionsName(definitions);
  }

  setStandardDefinitions(definitions, getExporterName(), getExporterVersion());

  if (!metaInfo.name) {
    throw new Error(
      'No name provided (name can be provided in the general information or in the definitions of the given bpmn)'
    );
  }

  // specifically provided id takes precedence over existing id and if there is none a new one is created
  metaInfo.id = processInfo.id || importDefinitionsId || generateDefinitionsId();

  await setDefinitionsId(definitions, metaInfo.id);
  await setDefinitionsName(definitions, metaInfo.name);

  if (!processInfo.originalId) {
    metaInfo.originalId = await getOriginalDefinitionsId(definitions);
  }

  await setTargetNamespace(definitions, metaInfo.id, false);

  const processes = getElementsByTagName(definitions, 'bpmn:Process');

  // make sure every process has an id
  processes.forEach((p) => {
    if (!p.id) {
      p.id = generateProcessId();
    }
  });

  metaInfo.processIds = processes.map((p) => p.id);

  const [process] = processes;

  // if the user gave a process description make sure to write it into bpmn
  if (process && processInfo.hasOwnProperty('description')) {
    addDocumentationToProcessObject(process, processInfo.description);
  }

  metaInfo.description = getProcessDocumentationByObject(process);

  bpmn = await toBpmnXml(definitions);

  if (!noDefaults) {
    // make sure metaInfo has all necessary entries for a process meta object
    metaInfo = { ...getDefaultProcessMetaInfo(), ...metaInfo };
  }

  return { metaInfo, bpmn };
}

/**
 * Parses all necessary information from a process description
 *
 * @param {String} bpmn the xml process description
 */
async function getProcessInfo(bpmn) {
  if (!bpmn || typeof bpmn !== 'string') {
    throw new Error(`Expected given bpmn to be of type string but got ${typeof bpmn} instead!`);
  }

  let definitions;
  try {
    definitions = await toBpmnObject(bpmn);
  } catch (err) {
    throw new Error(`Given process description is invalid. Reason:\n${err}`);
  }

  const metadata = await getIdentifyingInfos(definitions);

  if (!metadata.id) {
    throw new Error('Process definitions do not contain an id.');
  }

  if (!metadata.name) {
    throw new Error('Process definitions do not contain a name.');
  }

  return metadata;
}

module.exports = {
  getDefaultProcessMetaInfo,
  createProcess,
  getProcessInfo,
};
