/**
 * @module @proceed/bpmn-helper
 */
/**
 *  Sets id in definitions element to given id, if an id already exists and differs from the new one the old id will be saved in the originalId field
 *
 * @param {(string|object)} bpmn - the process definition as XML string or BPMN-Moddle Object
 * @param {string} id - the id we want to set the definitions element to
 * @returns {Promise<string|object>} the modified BPMN process as bpmn-moddle object or XML string based on input
 */
export function setDefinitionsId(bpmn: string | object, id: string): Promise<string | object>;
/**
 *  Sets name in definitions element to given name
 *
 * @param {(string|object)} bpmn - the process definition as XML string or BPMN-Moddle Object
 * @param {string} name - the id we want to set the definitions element to
 * @returns {Promise<string|object>} the modified BPMN process as bpmn-moddle object or XML string based on input
 */
export function setDefinitionsName(bpmn: string | object, name: string): Promise<string | object>;
/**
 * Will set a version in the definitions element
 *
 * @param {(string|object)} bpmn - the process definition as XML string or BPMN-Moddle Object
 * @param {object} versionInformation - the version information to set in the definitions object
 * @param {(string|number)} [versionInformation.version] - the version number (a time since epoch string or number)
 * @param {string} [versionInformation.versionName] - a human readable name for the version
 * @param {string} [versionInformation.versionDescription] - a longer description of the version
 * @param {(string|number)} [versionInformation.versionBasedOn] - a reference to the version this one is based on
 * @returns {Promise<string|object>} the modified BPMN process as bpmn-moddle object or XML string based on input
 */
export function setDefinitionsVersionInformation(
  bpmn: string | object,
  {
    version,
    versionName,
    versionDescription,
    versionBasedOn,
  }: {
    version?: string | number;
    versionName?: string;
    versionDescription?: string;
    versionBasedOn?: string | number;
  },
): Promise<string | object>;
/**
 *  Sets process Id in definitions element
 *
 * @param {string} bpmn the xml we want to update
 * @param {string} id the id we want to set for the process inside the bpmn
 * @returns {Promise<string|object>} the modified BPMN process as bpmn-moddle object or XML string based on input
 */
export function setProcessId(bpmn: string, id: string): Promise<string | object>;
/**
 *  Sets templateId in definitions element
 *
 * @param {string} bpmn the xml we want to update
 * @param {string} id the id we want to set for the template inside the bpmn
 * @returns {Promise<string|object>} the modified BPMN process as bpmn-moddle object or XML string based on input
 */
export function setTemplateId(bpmn: string, id: string): Promise<string | object>;
/**
 * Sets targetNamespace in definitions element to https://docs.proceed-labs.org/${id}, keeps existing namespace as originalTargetNamespace
 *
 * @param {(string|object)} bpmn the process definition as XML string or BPMN-Moddle Object
 * @param {string} id the id to be used for the targetNamespace
 * @returns {Promise<string|object>} the modified BPMN process as bpmn-moddle object or XML string based on input
 */
export function setTargetNamespace(bpmn: string | object, id: string): Promise<string | object>;
/**
 * Sets exporter, exporterVersion, expressionLanguage, typeLanguage and needed namespaces on defintions element
 * stores the previous values of exporter and exporterVersion if there are any
 *
 * @param {(string|object)} bpmn the process definition as XML string or BPMN-Moddle Object
 * @param {string} exporterName - the exporter name
 * @param {string} exporterVersion - the exporter version
 * @returns {Promise<string|object>} the modified BPMN process as bpmn-moddle object or XML string based on input
 */
export function setStandardDefinitions(
  bpmn: string | object,
  exporterName: string,
  exporterVersion: string,
): Promise<string | object>;
/**
 * Sets deployment method of a process
 *
 * @param {(string|object)} bpmn the process definition as XML string or BPMN-Moddle Object
 * @param {string} method the method we want to set (dynamic/static)
 * @returns {Promise<string|object>} the modified BPMN process as bpmn-moddle object or XML string based on input
 */
export function setDeploymentMethod(
  bpmn: string | object,
  method: string,
): Promise<string | object>;
/**
 * Function that sets the machineInfo of all elements in the given xml with the given machineIds
 *
 * @param {(string|object)} bpmn - the process definition as XML string or BPMN-Moddle Object
 * @param {{[elementId: string]: {machineAddress?: string, machineId?: string}}} machineInfo the machineAddresses and machineIps of all the elements we want to set
 * @returns {Promise<string|object>} the BPMN process as XML string or BPMN-Moddle Object based on input
 */
export function setMachineInfo(
  bpmn: string | object,
  machineInfo: {
    [elementId: string]: {
      machineAddress?: string;
      machineId?: string;
    };
  },
): Promise<string | object>;
/**
 * Sets the 'fileName' and 'implementation' attributes of a UserTask with new values.
 *
 * @param {(string|object)} bpmn - the process definition as XML string or BPMN-Moddle Object
 * @param {string} userTaskId - the userTaskId to look for
 * @param {string} newFileName - the new value of 'fileName' attribute
 * @param {string} [newImplementation] - the new value of 'implementation' attribute; will default to html implementation
 * @returns {Promise<string|object>} the BPMN process as XML string or BPMN-Moddle Object based on input
 */
export function setUserTaskData(
  bpmn: string | object,
  userTaskId: string,
  newFileName: string,
  newImplementation?: string,
): Promise<string | object>;
/**
 * Adds the given constraints to the bpmn element with the given id
 *
 * @param {(string|object)} bpmn - the process definition as XML string or BPMN-Moddle Object
 * @param {string} elementId
 * @param {object} constraints object containing the hardConstraints and softConstraints
 * @returns {Promise<string|object>} the BPMN process as XML string or BPMN-Moddle Object based on input
 */
export function addConstraintsToElementById(
  bpmn: string | object,
  elementId: string,
  constraints: object,
): Promise<string | object>;
/**
 * Add meta information of the called bpmn process to the bpmn file where it's getting called from. This includes a custom namespace in the definitions part,
 * an import element as first child of definitions and the calledElement attribute of the call activity bpmn element
 *
 * @param {(string|object)} bpmn - the process definition as XML string or BPMN-Moddle Object
 * @param {string} callActivityId The ID of the call activity bpmn element
 * @param {string} calledBpmn The bpmn file of the called process
 * @param {string} calledProcessLocation The DefinitionId of the calledBpmn. Combination of process name and process id
 * @returns {Promise<string|object>} the BPMN process as XML string or BPMN-Moddle Object based on input
 */
export function addCallActivityReference(
  bpmn: string | object,
  callActivityId: string,
  calledBpmn: string,
  calledProcessLocation: string,
): Promise<string | object>;
/**
 * Remove the reference to the called process added in {@link addCallActivityReference} but remains the actual bpmn element
 *
 * @param {(string|object)} bpmn - the process definition as XML string or BPMN-Moddle Object
 * @param {string} callActivityId The ID of the bpmn element for which the meta information should be removed
 * @returns {Promise<string|object>} the BPMN process as XML string or BPMN-Moddle Object based on input
 */
export function removeCallActivityReference(
  bpmn: string | object,
  callActivityId: string,
): Promise<string | object>;
/**
 * Look up the given bpmn document for unused imports/custom namespaces which don't get referenced by a call activity inside this bpmn document.
 *
 * @param {(string|object)} bpmn - the process definition as XML string or BPMN-Moddle Object
 * @returns {Promise<string|object>} the BPMN process as XML string or BPMN-Moddle Object based on input
 */
export function removeUnusedCallActivityReferences(bpmn: string | object): Promise<string | object>;
/**
 * Remove color from all elements of given process
 *
 * @param {string|object} bpmn
 * @returns {Promise<string|object>}
 */
export function removeColorFromAllElements(bpmn: string | object): Promise<string | object>;
/**
 * Adds a documentation element to the first process in the process definition
 *
 * @param {(string|object)} bpmn - the process definition as XML string or BPMN-Moddle Object
 * @param {string} [description] the content for the documentation element
 * @returns {Promise<string|object>} the BPMN process as XML string or BPMN-Moddle Object based on input
 */
export function addDocumentation(
  bpmn: string | object,
  description?: string,
): Promise<string | object>;
/**
 * Adds documentation to a given process object
 *
 * @param {object} processObj
 * @param {string} [description]
 */
export function addDocumentationToProcessObject(processObj: object, description?: string): void;
/**
 * Update the performer info of an element
 *
 * @param {object} element the element to update
 * @param {Array} performers the performer data to emplace in the element
 */
export function updatePerformersOnElement(element: object, performers: any[]): Promise<void>;
/**
 * Update the performer info of an element in a bpmn file/object
 *
 * @param {(string|object)} bpmn - the process definition as XML string or BPMN-Moddle Object
 * @param {string} elementId
 * @param {Array} performers the performer data to emplace in the element
 */
export function updatePerformersOnElementById(
  bpmn: string | object,
  elementId: string,
  performers: any[],
): Promise<any>;
