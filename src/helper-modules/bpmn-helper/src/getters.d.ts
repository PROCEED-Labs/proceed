/**
 * An object containing properties from the
 * definitions element in a BPMN file.
 */
export type DefinitionsInfos = {
  /**
   * - definitions id
   */
  id: string;
  /**
   * - definitions name
   */
  name: string;
  /**
   * - definitions exporter
   */
  exporter: string;
  /**
   * - definitions exporterVersion
   */
  exporterVersion: string;
  /**
   * - definitions targetNamespace
   */
  targetNamespace: string;
};
/**
 * Returns id of the given process definition
 *
 * @param {(string|object)} bpmn - the process definition as XML string or BPMN-Moddle Object
 * @returns {Promise.<string>} The id stored in the definitions field of the given bpmn process
 */
export function getDefinitionsId(bpmn: string | object): Promise<string>;
/**
 * Returns the value of the originalId attribute in the given process definition
 * the originalId is the id the process had before it was imported
 *
 * @param {(string|object)} bpmn - the process definition as XML string or BPMN-Moddle Object
 * @returns {(Promise.<string|undefined>)} The originalId stored in the definitions field of the given bpmn process
 */
export function getOriginalDefinitionsId(bpmn: string | object): Promise<string | undefined>;
/**
 * Returns the name of the given bpmn process definition
 *
 * @param {(string|object)} bpmn - the process definition as XML string or BPMN-Moddle Object
 * @returns {Promise.<string>} - The name stored in the definitions field of the given bpmn process
 */
export function getDefinitionsName(bpmn: string | object): Promise<string>;
/**
 * An object containing properties from the
 * definitions element in a BPMN file.
 *
 * @typedef DefinitionsInfos
 * @type {object}
 * @property {string} id - definitions id
 * @property {string} name - definitions name
 * @property {string} exporter - definitions exporter
 * @property {string} exporterVersion - definitions exporterVersion
 * @property {string} targetNamespace - definitions targetNamespace
 */
/**
 * Gets the 'definitions' root element from the given BPMN XML
 *
 * @param {(string|object)} bpmn - the process definition as XML string or BPMN-Moddle Object
 * @returns {Promise.<DefinitionsInfos>} The 'definitions' root element with some selected attributes
 */
export function getDefinitionsInfos(bpmn: string | object): Promise<DefinitionsInfos>;
/**
 * Returns an array of import elements for a given bpmn xml
 *
 * @param {(string|object)} bpmn - the process definition as XML string or BPMN-Moddle Object
 * @returns {Promise.<object[]>} - Arry of of import elements inside the given xml
 */
export function getImports(bpmn: string | object): Promise<object[]>;
/**
 * Returns the version information of the given bpmn process definition
 *
 * @param {string|object} bpmn - the process definition as XML string or BPMN-moddle Object
 * @returns {(Promise.<{version?: number, name?: string, description?: string, versionBasedOn?: number}>)} - The version information if it exists
 * @throws {Error} will throw if the definition contains a version that is not a number
 */
export function getDefinitionsVersionInformation(bpmn: string | object): Promise<{
  version?: number;
  name?: string;
  description?: string;
  versionBasedOn?: number;
}>;
/**
 * Get all process ids from a BPMN definitions/object.
 * (A BPMN file can contain multiple 'process' elements inside its 'definitions' element.)
 *
 * @param {(string|object)} bpmn - the process definition as XML string or BPMN-Moddle Object
 * @returns {Promise.<string[]>} An Array with Strings containing all IDs from every 'process' element
 */
export function getProcessIds(bpmn: string | object): Promise<string[]>;
/**
 * Gets deployment method of the given process
 *
 * @param {(string|object)} bpmn - the process definition as XML string or BPMN-Moddle Object
 * @returns {Promise.<string>} the deployment method used for the given process
 */
export function getDeploymentMethod(bpmn: string | object): Promise<string>;
/**
 * Get the Constraints of the BPMN process.
 * (The Constraint XML elements are defined in the PROCEED XML Schema
 * and are not standardized in BPMN.)
 *
 * @see {@link https://docs.proceed-labs.org/concepts/bpmn/bpmn-constraints/}
 *
 * @param {(string|object)} bpmn - the process definition as XML string or BPMN-Moddle Object
 * @returns { Promise.<{ hardConstraints: Array, softConstraints: Array }> } An Object (a map) where all keys are the BPMN element ids and the value is an object with the hard and soft Constraint Arrays
 */
export function getProcessConstraints(bpmn: string | object): Promise<{
  hardConstraints: any[];
  softConstraints: any[];
}>;
/**
 * Get the content of the 'documentation' element of the first process inside a BPMN file.
 *
 * @param {(string|object)} bpmn - the process definition as XML string or BPMN-Moddle Object
 * @returns {Promise.<string>} the documentation content
 */
export function getProcessDocumentation(bpmn: string | object): Promise<string>;
/**
 * Get the content of the 'documentation' element of the given process object.
 *
 * @param {object} processObject - a process element as BPMN-Moddle Object
 * @returns {string} the documentation content
 */
export function getProcessDocumentationByObject(processObject: object): string;
/**
 * Get all fileName for all userTasks,
 * (The attribute 'filename' is defined in the PROCEED XML Schema and not a standard BPMN attribute.)
 *
 * @param {(string|object)} bpmn - the process definition as XML string or BPMN-Moddle Object
 * @returns { Promise.<{ [userTaskId: string]: { fileName: string, implementation: string }}> } an object (a map) with all userTaskIds as keys
 */
export function getUserTaskFileNameMapping(bpmn: string | object): Promise<{
  [userTaskId: string]: {
    fileName: string;
    implementation: string;
  };
}>;
/**
 * Creates a map (object) that contains the 'fileName' (key) and UserTask-IDs (value)
 * for every UserTask in a BPMN process.
 *
 * @param {(string|object)} bpmn - the process definition as XML string or BPMN-Moddle Object
 * @returns { Promise.<{ '<UserTask-FileName>': '<UserTask-ID[]>' }>} A map (object) that returns for every UserTask the 'fileName' (key) and UserTask-IDs (value)
 */
export function getAllUserTaskFileNamesAndUserTaskIdsMapping(bpmn: string | object): Promise<{
  '<UserTask-FileName>': '<UserTask-ID[]>';
}>;
/**
 * Returns a xml with Diagram Elements just from the given subprocess and their nested Processes
 *
 * Structure of XMl:
 * Defintions
 *  - Process
 *    - FlowElements of the Process (BPMN Part)
 *  - Process End
 *  - Diagram (How to visualize the XML in the viewer)
 * Definitions End
 *
 * This function only remove all Diagram Parts that are not part of the subprocess - the flowElements are still part of the xml
 *
 * @param {(string|object)} bpmn - the process definition as XML string or BPMN-Moddle Object
 * @param {string} subprocessId - id of subprocess you want to show
 * @return {Promise.<string>} BPMN xml with only diagram parts for the subprocess
 */
export function getSubprocess(bpmn: string | object, subprocessId: string): Promise<string>;
/**
 * Returns a xml with elements inside given subprocess
 *
 * Structure of XMl:
 * Defintions
 *  - Process
 *    -FlowElements of the Process (BPMN Part)
 *  - Process End
 *  - Diagram (How to visualize the XML in the viewer)
 * Definitions End
 *
 * This function removes all Diagram Parts and flowElements that are not part of the subprocess
 *
 * @param {string} bpmn - the process definition of the main process as XML string or BPMN-Moddle Object
 * @param {string} subprocessId - id of subprocess you want to show
 * @return {Promise.<string>} - xml with only flowElements and diagram parts inside the subprocess
 */
export function getSubprocessContent(bpmn: string, subprocessId: string): Promise<string>;
/**
 * Get the definitionId and processId of a target called process (callActivity)
 *
 * @see {@link https://docs.proceed-labs.org/concepts/bpmn/bpmn-subprocesses/}
 *
 * @param {object} bpmnObj - The BPMN XML as converted bpmn-moddle object with toBpmnObject
 * @param {string} callActivityId - The id of the callActivity
 * @returns { { definitionId: string, processId: string, version: number } } An Object with the definition, process id and version
 * @throws An Error if the callActivity id does not exist
 * @throws If the callActivity has no 'calledElement' attribute
 * @throws If the targetNamespace for a callActivity could not be found
 * @throws If no import element could be found for a targetNamespace
 */
export function getTargetDefinitionsAndProcessIdForCallActivityByObject(
  bpmnObj: object,
  callActivityId: string,
): {
  definitionId: string;
  processId: string;
  version: number;
};
/**
 * Get all definitionIds for all imported Processes used in callActivities
 *
 * @param {(string|object)} bpmn - the process definition as XML string or BPMN-Moddle Object
 * @param {boolean} [dontThrow] - whether to throw errors or not in retrieving process ids in call activities
 * @returns { Promise.<{ '<callActivityId>': { definitionId: string, processId: string, version: number }}> } an object (a map) with all callActivityIds as keys
 * @throws see function: {@link getTargetDefinitionsAndProcessIdForCallActivityByObject}
 */
export function getDefinitionsAndProcessIdForEveryCallActivity(
  bpmn: string | object,
  dontThrow?: boolean,
): Promise<{
  '<callActivityId>': {
    definitionId: string;
    processId: string;
    version: number;
  };
}>;
/**
 * @module @proceed/bpmn-helper
 */
/**
 * Function that returns ids of all start events in a bpmn process model
 *
 * @param {(string|object)} bpmn - the process definition as XML string or BPMN-Moddle Object
 * @returns {Promise.<string[]>} the ids of all startEvents
 */
export function getStartEvents(bpmn: string | object): Promise<string[]>;
/**
 * Gets every Task|Event|Gateway|CallActivity|SubProcess|SequenceFlow inside a BPMN process
 *
 * @param {(string|object)} bpmn - the process definition as XML string or BPMN-Moddle Object
 * @returns {Promise.<object[]>} every element inside a BPMN process
 */
export function getAllBpmnFlowElements(bpmn: string | object): Promise<object[]>;
/**
 * Gets the Id of every Task|Event|Gateway|CallActivity|SubProcess inside a BPMN process
 *
 * @param {(string|object)} bpmn - the process definition as XML string or BPMN-Moddle Object
 * @returns {Promise.<string[]>} Ids of every element inside a BPMN process
 */
export function getAllBpmnFlowNodeIds(bpmn: string | object): Promise<string[]>;
/**
 * Gets the Id of every Task|Event|Gateway|CallActivity|SubProcess|SequenceFlow inside a BPMN process
 *
 * @param {(string|object)} bpmn - the process definition as XML string or BPMN-Moddle Object
 * @returns {Promise.<String[]>} Ids of every element inside a BPMN process
 */
export function getAllBpmnFlowElementIds(bpmn: string | object): Promise<string[]>;
/**
 * Gets first-level child flow Elements Task|Event|Gateway|CallActivity|SubProcess|SequenceFlow of a process/subprocess
 *
 * @param {(string|object)} bpmn - the process definition as XML string or BPMN-Moddle Object
 * @returns {Promise.<object[]>} every child element inside a process/subprocess
 */
export function getChildrenFlowElements(bpmn: string | object, elementId: any): Promise<object[]>;
/**
 * Returns a mapping of the ids of the process nodes to the machines they are mapped to
 *
 * @param {(string|object)} bpmn - the process definition as XML string or BPMN-Moddle Object
 * @returns {Promise.<Object>} the mapping from a node id to information about the machine it is mapped to
 */
export function getElementMachineMapping(bpmn: string | object): Promise<any>;
/**
 * Get all Constraints for every BPMN Element.
 * (The Constraint XML elements are defined in the PROCEED XML Schema
 * and are not standardized in BPMN.)
 *
 * @see {@link https://docs.proceed-labs.org/concepts/bpmn/bpmn-constraints/}
 *
 * @param {(string|object)} bpmn - the process definition as XML string or BPMN-Moddle Object
 * @returns { Promise.<{ '<bpmnElementIds>': { hardConstraints: Array, softConstraints: Array} }> } An Object (a map) where all keys are the BPMN element ids and the value is an object with the hard and soft Constraint Arrays
 */
export function getTaskConstraintMapping(bpmn: string | object): Promise<{
  '<bpmnElementIds>': {
    hardConstraints: any[];
    softConstraints: any[];
  };
}>;
/**
 * Returns information about the process that can be used to identify it
 *
 * e.g. its unique id, original id and processIds for automatic identification
 * and its name and description for human identification
 *
 * @param {(string|object)} bpmn - the process definition as XML string or BPMN-Moddle Object
 * @returns { Promise.<{ id: string, originalId: string, processIds: string[], name: string, description: string }> } object containing the identifying information
 */
export function getIdentifyingInfos(bpmn: string | object): Promise<{
  id: string;
  originalId: string;
  processIds: string[];
  name: string;
  description: string;
}>;
/**
 * Returns the definitions object of the process
 *
 * @param {object} businessObject the businessObject of a process element
 * @returns {object} definitions object of the process
 */
export function getRootFromElement(businessObject: object): object;
/**
 * Parses the meta data from a bpmn-moddle element
 *
 * @param {object} element
 * @returns {object} key value list of meta values
 */
export function getMetaDataFromElement(element: object): object;
/**
 * Get the meta information of an element
 *
 * @param {(string|object)} bpmn - the process definition as XML string or BPMN-Moddle Object
 * @param {string} elId the id of the element to update
 * @returns {Promise.<object>} the meta information
 */
export function getMetaData(bpmn: string | object, elId: string): Promise<object>;
/**
 * Parses the milestones from a bpmn-moddle element
 *
 * @param {object} element
 * @returns {Array} array with all milestones
 */
export function getMilestonesFromElement(element: object): any[];
/**
 * Get the milestones for given element id
 *
 * @param {(string|object)} bpmn - the process definition as XML string or BPMN-Moddle Object
 * @param {string} elementId the id of the element
 * @returns {Array} array with all milestones
 */
export function getMilestonesFromElementById(bpmn: string | object, elementId: string): any[];
/**
 * Parses the resources from a bpmn-moddle element
 *
 * @param {object} element
 * @returns {object} object with all resources
 */
export function getResourcesFromElement(element: object): object;
/**
 * Parses the locations from a bpmn-moddle element
 *
 * @param {object} element
 * @returns {object} object with all locations
 */
export function getLocationsFromElement(element: object): object;
/**
 * Get the performers for given element
 *
 * @param {object} element
 * @returns {Array} performers given for element
 */
export function getPerformersFromElement(element: object): any[];
/**
 * Get the performers for given element id
 *
 * @param {(string|object)} bpmn - the process definition as XML string or BPMN-Moddle Object
 * @param {string} elementId the id of the element
 * @returns {Array} array with all performers
 */
export function getPerformersFromElementById(bpmn: string | object, elementId: string): any[];
/**
 * Parses ISO Duration String to number of years, months, days, hours, minutes and seconds
 * @param {string} isoDuration
 * @returns {object} Object with number of years, months, days, hours, minutes and seconds
 */
export function parseISODuration(isoDuration: string): object;
/**
 * Convert given ISO Duration in number of miliseconds
 *
 * @param {string} isoDuration duration in iso standard
 * @returns {number} number of miliseconds for duration
 */
export function convertISODurationToMiliseconds(isoDuration: string): number;
