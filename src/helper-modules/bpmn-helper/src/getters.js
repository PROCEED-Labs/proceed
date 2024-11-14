const {
  toBpmnObject,
  toBpmnXml,
  getElementsByTagName,
  getElementById,
  getAllElements,
  getChildren,
} = require('./util.js');

const ConstraintParser = require('@proceed/constraint-parser-xml-json');

const constraintParser = new ConstraintParser();

/**
 * @module @proceed/bpmn-helper
 */

/**
 * Function that returns ids of all start events in a bpmn process model
 *
 * @param {(string|object)} bpmn - the process definition as XML string or BPMN-Moddle Object
 * @returns {Promise.<string[]>} the ids of all startEvents
 */
async function getStartEvents(bpmn) {
  const bpmnObj = typeof bpmn === 'string' ? await toBpmnObject(bpmn) : bpmn;
  return getElementsByTagName(bpmnObj, 'bpmn:StartEvent').map((moddleElement) => moddleElement.id);
}

/**
 * Returns id of the given process definition
 *
 * @param {(string|object)} bpmn - the process definition as XML string or BPMN-Moddle Object
 * @returns {Promise.<string|undefined>} The id stored in the definitions field of the given bpmn process
 */
async function getDefinitionsId(bpmn) {
  const bpmnObj = typeof bpmn === 'string' ? await toBpmnObject(bpmn) : bpmn;
  return bpmnObj.id;
}

/**
 * Returns the value of the originalId attribute in the given process definition
 * the originalId is the id the process had before it was imported
 *
 * @param {(string|object)} bpmn - the process definition as XML string or BPMN-Moddle Object
 * @returns {(Promise.<string|undefined>)} The originalId stored in the definitions field of the given bpmn process
 */
async function getOriginalDefinitionsId(bpmn) {
  const bpmnObj = typeof bpmn === 'string' ? await toBpmnObject(bpmn) : bpmn;
  return bpmnObj.originalId;
}

/**
 * Returns the name of the given bpmn process definition
 *
 * @param {(string|object)} bpmn - the process definition as XML string or BPMN-Moddle Object
 * @returns {Promise.<string|undefined>} - The name stored in the definitions field of the given bpmn process
 */
async function getDefinitionsName(bpmn) {
  const bpmnObj = typeof bpmn === 'string' ? await toBpmnObject(bpmn) : bpmn;
  return bpmnObj.name;
}

/**
 * Returns the version information of the given bpmn process definition
 *
 * @param {string|object} bpmn - the process definition as XML string or BPMN-moddle Object
 * @returns {(Promise.<{versionId?: string, name?: string, description?: string, versionBasedOn?: string, versionCreatedOn?: string }>)} - The version information if it exists
 * @throws {Error} will throw if the definition contains a version that is not a number
 */
async function getDefinitionsVersionInformation(bpmn) {
  const bpmnObj = typeof bpmn === 'string' ? await toBpmnObject(bpmn) : bpmn;

  // if (bpmnObj.versionId && isNaN(bpmnObj.versionId)) {
  //   throw new Error('The process version has to be a number (time in ms since 1970)');
  // }

  if (!bpmnObj.versionId) {
    return {
      versionBasedOn: bpmnObj.versionBasedOn,
    };
  }

  return {
    versionId: bpmnObj.versionId,
    name: bpmnObj.versionName,
    description: bpmnObj.versionDescription,
    versionBasedOn: bpmnObj.versionBasedOn,
    versionCreatedOn: bpmnObj.versionCreatedOn,
  };
}

/**
 * Get the content of the 'documentation' element of the first process inside a BPMN file.
 *
 * @param {(string|object)} bpmn - the process definition as XML string or BPMN-Moddle Object
 * @returns {Promise.<string>} the documentation content
 */
async function getProcessDocumentation(bpmn) {
  const bpmnObj = typeof bpmn === 'string' ? await toBpmnObject(bpmn) : bpmn;
  const [process] = getElementsByTagName(bpmnObj, 'bpmn:Process');
  if (process) {
    return getProcessDocumentationByObject(process);
  } else {
    return '';
  }
}

/**
 * Get the content of the 'documentation' element of the given process object.
 *
 * @param {object} processObject - a process element as BPMN-Moddle Object
 * @returns {string} the documentation content
 */
function getProcessDocumentationByObject(processObject) {
  const docs = processObject.get('documentation');
  if (docs.length > 0) {
    const description = docs[0].text;
    return description || '';
  } else {
    return '';
  }
}

/**
 * An object containing properties from the
 * definitions element in a BPMN file.
 *
 * @typedef DefinitionsInfos
 * @type {object}
 * @property {string} id - definitions id
 * @property {string} [originalId] - definitions original id
 * @property {string} [name] - definitions name
 * @property {string} [exporter] - definitions exporter
 * @property {string} [exporterVersion] - definitions exporterVersion
 * @property {string} [targetNamespace] - definitions targetNamespace
 */

/**
 * Gets the 'definitions' root element from the given BPMN XML
 *
 * @param {(string|object)} bpmn - the process definition as XML string or BPMN-Moddle Object
 * @returns {Promise.<DefinitionsInfos>} The 'definitions' root element with some selected attributes
 */
async function getDefinitionsInfos(bpmn) {
  const bpmnObj = typeof bpmn === 'string' ? await toBpmnObject(bpmn) : bpmn;
  return {
    id: await getDefinitionsId(bpmnObj),
    originalId: await getOriginalDefinitionsId(bpmnObj),
    name: await getDefinitionsName(bpmnObj),
    exporter: bpmnObj.exporter,
    exporterVersion: bpmnObj.exporterVersion,
    targetNamespace: bpmnObj.targetNamespace,
  };
}

/**
 * Gets deployment method of the given process
 *
 * @param {(string|object)} bpmn - the process definition as XML string or BPMN-Moddle Object
 * @returns {Promise.<string|undefined>} the deployment method used for the given process
 */
async function getDeploymentMethod(bpmn) {
  const bpmnObj = typeof bpmn === 'string' ? await toBpmnObject(bpmn) : bpmn;
  const [process] = getElementsByTagName(bpmnObj, 'bpmn:Process');
  return process.deploymentMethod;
}

/**
 * Returns a mapping of the ids of the process nodes to the machines they are mapped to
 *
 * @param {(string|object)} bpmn - the process definition as XML string or BPMN-Moddle Object
 * @returns {Promise.<{[flowNodeId: string]: {machineAddress?: string, machineId?: string}}>} the mapping from a node id to information about the machine it is mapped to
 */
async function getElementMachineMapping(bpmn) {
  const elementMachineMapping = {};
  const flowElements = await getAllBpmnFlowElements(bpmn);
  const flowNodes = flowElements.filter((node) => node.$type !== 'bpmn:SequenceFlow');
  flowNodes.forEach((node) => {
    elementMachineMapping[node.id] = {
      machineAddress: node.machineAddress,
      machineId: node.machineId,
    };
  });
  return elementMachineMapping;
}

/**
 * Get all fileName for all userTasks,
 * (The attribute 'filename' is defined in the PROCEED XML Schema and not a standard BPMN attribute.)
 *
 * @param {(string|object)} bpmn - the process definition as XML string or BPMN-Moddle Object
 * @returns { Promise.<{ [userTaskId: string]: { fileName?: string, implementation?: string }}> } an object (a map) with all userTaskIds as keys
 */
async function getUserTaskFileNameMapping(bpmn) {
  const bpmnObj = typeof bpmn === 'string' ? await toBpmnObject(bpmn) : bpmn;
  const userTasks = getElementsByTagName(bpmnObj, 'bpmn:UserTask');
  const mapping = {};
  userTasks.forEach((task) => {
    mapping[task.id] = {
      fileName: task.fileName,
      implementation: task.implementation,
    };
  });
  return mapping;
}

/**
 * Creates a map (object) that contains the 'fileName' (key) and UserTask-IDs (value)
 * for every UserTask in a BPMN process.
 *
 * @param {(string|object)} bpmn - the process definition as XML string or BPMN-Moddle Object
 * @returns { Promise.<{ [userTaskFileName: string] : string[] }>} A map (object) that returns for every UserTask the 'fileName' (key) and UserTask-IDs (value)
 */
async function getAllUserTaskFileNamesAndUserTaskIdsMapping(bpmn) {
  const bpmnObj = typeof bpmn === 'string' ? await toBpmnObject(bpmn) : bpmn;
  const userTasks = getElementsByTagName(bpmnObj, 'bpmn:UserTask');
  const mapping = {};
  userTasks.forEach((task) => {
    if (mapping[task.fileName]) {
      mapping[task.fileName].push(task.id);
    } else {
      mapping[task.fileName] = [task.id];
    }
  });
  return mapping;
}

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
async function getSubprocess(bpmn, subprocessId) {
  const bpmnObj = typeof bpmn === 'string' ? await toBpmnObject(bpmn) : bpmn;

  // Get the Subprocess Part of the whole XML
  const subprocess = getElementById(bpmnObj, subprocessId);

  // Create an Array for all Elements which are nested into the subprocess
  const nestedElementsId = getAllElements(subprocess)
    .filter((element) => element.id)
    .map((element) => element.id);

  // Add all plane Elements of the subprocess and nested subprocesses into the diagram - this removes all other Shapes of the original xml
  bpmnObj.diagrams[0].plane.planeElement = bpmnObj.diagrams[0].plane.planeElement.filter(
    (element) => element.bpmnElement && nestedElementsId.includes(element.bpmnElement.id),
  );

  const newXml = await toBpmnXml(bpmnObj);

  return newXml;
}

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
async function getSubprocessContent(bpmn, subprocessId) {
  const bpmnObject = typeof bpmn === 'string' ? await toBpmnObject(bpmn) : bpmn;

  // Get the Subprocess Part of the whole XML
  const subprocess = getElementById(bpmnObject, subprocessId);

  // Create an Array for all Elements which are nested into the subprocess
  const nestedElements = getAllElements(subprocess).filter(
    (element) => element.id && element.id !== subprocessId,
  );

  // Add all plane Elements of the subprocess and nested subprocesses into the diagram - this removes all other Shapes of the original xml
  bpmnObject.diagrams[0].plane.planeElement = bpmnObject.diagrams[0].plane.planeElement.filter(
    (element) =>
      element.bpmnElement && nestedElements.map((e) => e.id).includes(element.bpmnElement.id),
  );

  // Replace flowElements only with flowElements of the subprocess
  // TODO: replace all rootElements, not only index 0
  bpmnObject.rootElements[0].flowElements = getChildren(subprocess).filter(
    (element) => element.id && element.id !== subprocessId,
  );
  bpmnObject.rootElements[0].id = subprocessId;
  bpmnObject.rootElements[0].extensionElements = subprocess.extensionElements;
  bpmnObject.rootElements[0].name = subprocess.name;

  const newXml = await toBpmnXml(bpmnObject);

  return newXml;
}

/**
 * Get all process ids from a BPMN definitions/object.
 * (A BPMN file can contain multiple 'process' elements inside its 'definitions' element.)
 *
 * @param {(string|object)} bpmn - the process definition as XML string or BPMN-Moddle Object
 * @returns {Promise.<string[]>} An Array with Strings containing all IDs from every 'process' element
 */
async function getProcessIds(bpmn) {
  const bpmnObj = typeof bpmn === 'string' ? await toBpmnObject(bpmn) : bpmn;
  const processes = getElementsByTagName(bpmnObj, 'bpmn:Process');
  return processes.map((process) => process.id);
}

/**
 * Gets every Task|Event|Gateway|CallActivity|SubProcess|SequenceFlow inside a BPMN process
 *
 * @param {(string|object)} bpmn - the process definition as XML string or BPMN-Moddle Object
 * @returns {Promise.<object[]>} every element inside a BPMN process
 */
async function getAllBpmnFlowElements(bpmn) {
  const bpmnObj = typeof bpmn === 'string' ? await toBpmnObject(bpmn) : bpmn;
  const allElements = getAllElements(bpmnObj);
  const allBpmnFlowElements = allElements.filter(
    (element) =>
      typeof element.$type === 'string' &&
      element.$type.startsWith('bpmn:') &&
      (element.$type.includes('Task') ||
        element.$type.includes('Event') ||
        element.$type.includes('Gateway') ||
        element.$type.includes('CallActivity') ||
        element.$type.includes('SubProcess') ||
        element.$type.includes('SequenceFlow')),
  );

  return allBpmnFlowElements;
}

/**
 * Gets the Id of every Task|Event|Gateway|CallActivity|SubProcess|SequenceFlow inside a BPMN process
 *
 * @param {(string|object)} bpmn - the process definition as XML string or BPMN-Moddle Object
 * @returns {Promise.<string[]>} Ids of every element inside a BPMN process
 */
async function getAllBpmnFlowElementIds(bpmn) {
  const allBpmnElements = await getAllBpmnFlowElements(bpmn);
  return allBpmnElements.map((element) => element.id);
}

/**
 * Gets the Id of every Task|Event|Gateway|CallActivity|SubProcess inside a BPMN process
 *
 * @param {(string|object)} bpmn - the process definition as XML string or BPMN-Moddle Object
 * @returns {Promise.<string[]>} Ids of every element inside a BPMN process
 */
async function getAllBpmnFlowNodeIds(bpmn) {
  const allBpmnElements = await getAllBpmnFlowElements(bpmn);
  const allBpmnFlowNodes = allBpmnElements.filter(
    (element) => !element.$type.includes('SequenceFlow'),
  );
  return allBpmnFlowNodes.map((element) => element.id);
}

/**
 * Gets first-level child flow Elements Task|Event|Gateway|CallActivity|SubProcess|SequenceFlow of a process/subprocess
 *
 * @param {(string|object)} bpmn - the process definition as XML string or BPMN-Moddle Object
 * @returns {Promise.<object[]>} every child element inside a process/subprocess
 */
async function getChildrenFlowElements(bpmn, elementId) {
  const bpmnObj = typeof bpmn === 'string' ? await toBpmnObject(bpmn) : bpmn;
  const element = getElementById(bpmnObj, elementId);
  const childrenFlowElements = element.flowElements;
  if (!childrenFlowElements) {
    throw new Error(`Element with id ${elementId} has no Flow Elements`);
  }

  return childrenFlowElements;
}

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
function getTargetDefinitionsAndProcessIdForCallActivityByObject(bpmnObj, callActivityId) {
  const callActivityElement = getElementById(bpmnObj, callActivityId);

  if (!callActivityElement) {
    throw new Error(`No callActivity found for id ${callActivityId}`);
  }
  if (typeof callActivityElement.calledElement !== 'string') {
    throw new Error(`No 'calledElement' attribute for callActivity with id ${callActivityId}`);
  }

  // deconstruct 'p3c2324:Process_1wqd8fv' to prefix 'p3c2c324'
  const [prefix, processId] = callActivityElement.calledElement.split(':');

  if (!processId) {
    throw new Error(
      `No processId found for the referenced process in callActivity ${callActivityId}.`,
    );
  }

  // find Namespace for prefix, e.g. xmlns:p3c2324="https://docs.proceed-labs.org/_17c6fed0-8a8c-4722-a62f-86ebf13243c2#1655749975324"
  const [definitionsElement] = getElementsByTagName(bpmnObj, 'bpmn:Definitions');
  const targetNamespace = definitionsElement.$attrs[`xmlns:${prefix}`];
  if (!targetNamespace) {
    throw new Error(
      `No namespace attribute found for the referenced process in callActivity ${callActivityId}. I.e. the prefix ${prefix} in 'callElement' could not be found inside the namespace declarations of the 'definitions' element.`,
    );
  }

  const importElement = bpmnObj.imports.find((i) => i.namespace === targetNamespace);
  if (!importElement) {
    throw new Error(
      `No 'import' element found for the referenced process in callActivity ${callActivityId}. I.e. the targetNamespace ${targetNamespace} could not be found in any 'import' element.`,
    );
  }

  if (!importElement.location) {
    throw new Error(
      `No location in 'import' element found for the referenced process in callActivity ${callActivityId}.`,
    );
  }

  const version = importElement.version || importElement.$attrs['proceed:versionId'];

  if (!version) {
    throw new Error(
      `No Process Version in 'import' element found for the referenced process in callActivity ${callActivityId}.`,
    );
  }

  return {
    definitionId: importElement.location,
    processId,
    version: version,
  };
}

/**
 * Get all definitionIds for all imported Processes used in callActivities
 *
 * @param {(string|object)} bpmn - the process definition as XML string or BPMN-Moddle Object
 * @param {boolean} [dontThrow] - whether to throw errors or not in retrieving process ids in call activities
 * @returns { Promise.<{ [callActivityId: string]: { definitionId: string, processId: string, version: string }}> } an object (a map) with all callActivityIds as keys
 * @throws see function: {@link getTargetDefinitionsAndProcessIdForCallActivityByObject}
 */
async function getDefinitionsAndProcessIdForEveryCallActivity(bpmn, dontThrow = false) {
  const bpmnObj = typeof bpmn === 'string' ? await toBpmnObject(bpmn) : bpmn;

  const map = {};
  const callActivities = getElementsByTagName(bpmnObj, 'bpmn:CallActivity');

  callActivities.forEach((callActivity) => {
    try {
      map[callActivity.id] = getTargetDefinitionsAndProcessIdForCallActivityByObject(
        bpmnObj,
        callActivity.id,
      );
    } catch (err) {
      if (!dontThrow) {
        throw err;
      }
    }
  });

  return map;
}

/**
 * Returns an array of import elements for a given bpmn xml
 *
 * @param {(string|object)} bpmn - the process definition as XML string or BPMN-Moddle Object
 * @returns {Promise.<object[]>} - Arry of of import elements inside the given xml
 */
async function getImports(bpmn) {
  const bpmnObj = typeof bpmn === 'string' ? await toBpmnObject(bpmn) : bpmn;
  const importElements = getElementsByTagName(bpmnObj, 'bpmn:Import');
  return importElements;
}

/**
 * Get all Constraints for every BPMN Element.
 * (The Constraint XML elements are defined in the PROCEED XML Schema
 * and are not standardized in BPMN.)
 *
 * @see {@link https://docs.proceed-labs.org/concepts/bpmn/bpmn-constraints/}
 *
 * @param {(string|object)} bpmn - the process definition as XML string or BPMN-Moddle Object
 * @returns { Promise.<{ [bpmnElementIds: string]: { hardConstraints: Array, softConstraints: Array} }> } An Object (a map) where all keys are the BPMN element ids and the value is an object with the hard and soft Constraint Arrays
 */
async function getTaskConstraintMapping(bpmn) {
  const bpmnObj = typeof bpmn === 'string' ? await toBpmnObject(bpmn) : bpmn;
  const elementIds = await getAllBpmnFlowNodeIds(bpmnObj);
  const taskConstraintMapping = {};

  elementIds.forEach(async (id) => {
    const element = getElementById(bpmnObj, id);
    taskConstraintMapping[id] = {
      hardConstraints: [],
      softConstraints: [],
    };
    const { extensionElements } = element;
    if (extensionElements && extensionElements.values) {
      const constraints = extensionElements.values.find(
        (e) => e.$type === 'proceed:ProcessConstraints',
      );
      if (constraints && (constraints.hardConstraints || constraints.softConstraints)) {
        const constraintsXml = await toBpmnXml(constraints);
        const constraintsJs = constraintParser.fromXmlToJs(constraintsXml);
        if (constraintsJs && constraintsJs.processConstraints) {
          taskConstraintMapping[id] = {
            hardConstraints: constraintsJs.processConstraints.hardConstraints || [],
            softConstraints: constraintsJs.processConstraints.softConstraints || [],
          };
        }
      }
    }
  });
  return taskConstraintMapping;
}

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
async function getProcessConstraints(bpmn) {
  const bpmnObj = typeof bpmn === 'string' ? await toBpmnObject(bpmn) : bpmn;
  const processIds = await getProcessIds(bpmnObj);

  let processConstraints = {
    softConstraints: [],
    hardConstraints: [],
  };
  const element = getElementById(bpmnObj, processIds[0]);
  const { extensionElements } = element;
  if (extensionElements && extensionElements.values) {
    const constraints = extensionElements.values.find(
      (e) => e.$type === 'proceed:ProcessConstraints',
    );
    if (constraints && (constraints.hardConstraints || constraints.softConstraints)) {
      const constraintsXml = await toBpmnXml(constraints);
      const constraintsJs = constraintParser.fromXmlToJs(constraintsXml);
      if (constraintsJs && constraintsJs.processConstraints) {
        processConstraints = {
          hardConstraints: constraintsJs.processConstraints.hardConstraints || [],
          softConstraints: constraintsJs.processConstraints.softConstraints || [],
        };
      }
    }
  }
  return processConstraints;
}

/**
 * Returns information about the process that can be used to identify it
 *
 * e.g. its unique id, original id and processIds for automatic identification
 * and its name and description for human identification
 *
 * @param {(string|object)} bpmn - the process definition as XML string or BPMN-Moddle Object
 * @returns { Promise.<{ id: string, originalId?: string, processIds: string[], name: string, description: string }> } object containing the identifying information
 */
async function getIdentifyingInfos(bpmn) {
  const bpmnObj = typeof bpmn === 'string' ? await toBpmnObject(bpmn) : bpmn;

  const { id, originalId, name } = await getDefinitionsInfos(bpmnObj);

  const processes = getElementsByTagName(bpmnObj, 'bpmn:Process');

  const processIds = processes.map((p) => p.id);

  let description;
  if (processes.length) {
    description = getProcessDocumentationByObject(processes[0]);
  } else {
    description = '';
  }

  return { id, originalId, processIds, name, description };
}

/**
 * Returns the definitions object of the process
 *
 * @param {object} businessObject the businessObject of a process element
 * @returns {object} definitions object of the process
 */
function getRootFromElement(businessObject) {
  let el = businessObject;

  while (el.$parent) {
    el = el.$parent;
  }

  return el;
}

/**
 * Parses the meta data from a bpmn-moddle element
 *
 * @param {object} element
 * @returns {{[key: string]: any}} key value list of meta values
 */
function getMetaDataFromElement(element) {
  const properties = {};
  // check if there is a extensionElements entry that might contain a proceed:Meta element
  if (element.extensionElements && Array.isArray(element.extensionElements.values)) {
    let meta = element.extensionElements.values.find((child) => child.$type == 'proceed:Meta');
    if (meta) {
      for (let attribute in meta) {
        // ignore attributes defined by bpmn-moddle or emtpty attributes
        if (meta.hasOwnProperty(attribute) && !attribute.startsWith('$') && meta[attribute]) {
          // the property attribute is an array that can contain multiple meta elements
          if (attribute === 'property') {
            meta[attribute].forEach((property) => {
              properties[property.name] = property.value;
            });
          } else if (attribute === 'mqttServer') {
            const { url, topic, user, password } = meta[attribute];

            properties[attribute] = {
              url,
              topic,
              user,
              password,
            };
          }
          // TODO: Generic extraction of attribute values without distinction of cases
          else if (attribute === 'costsPlanned') {
            const { value, unit } = meta[attribute];
            properties[attribute] = {
              value,
              unit,
            };
          } else {
            properties[attribute] = meta[attribute].value;
          }
        }
      }
    }
  }

  return properties;
}

/**
 * Get the meta information of an element
 *
 * @param {(string|object)} bpmn - the process definition as XML string or BPMN-Moddle Object
 * @param {string} elId the id of the element to update
 * @returns {Promise.<{[key: string]: any}>} the meta information
 */
async function getMetaData(bpmn, elId) {
  const bpmnObj = typeof bpmn === 'string' ? await toBpmnObject(bpmn) : bpmn;
  const element = getElementById(bpmnObj, elId);

  return getMetaDataFromElement(element);
}

/**
 * Parses the milestones from a bpmn-moddle element
 *
 * @param {object} element
 * @returns {{id: string, name: string, description?: string}[]} array with all milestones
 */
function getMilestonesFromElement(element) {
  let milestones = [];
  // check if there is a extensionElements entry that might contain a proceed:milestones element
  if (element.extensionElements && Array.isArray(element.extensionElements.values)) {
    const milestonesElement = element.extensionElements.values.find(
      (child) => child.$type == 'proceed:Milestones',
    );
    if (milestonesElement && milestonesElement.milestone) {
      milestones = milestonesElement.milestone.map(({ id, name, description }) => {
        if (!id || !name) {
          throw new Error(
            'Some Milestone Elements are not valid due to missing mandatory attributes',
          );
        }
        return {
          id,
          name,
          description,
        };
      });
    }
  }

  return milestones;
}

/**
 * Get the milestones for given element id
 *
 * @param {(string|object)} bpmn - the process definition as XML string or BPMN-Moddle Object
 * @param {string} elementId the id of the element
 * @returns {{id: string, name: string, description?: string}[]} array with all milestones
 */
async function getMilestonesFromElementById(bpmn, elementId) {
  const bpmnObj = typeof bpmn === 'string' ? await toBpmnObject(bpmn) : bpmn;
  const element = getElementById(bpmnObj, elementId);

  return getMilestonesFromElement(element);
}

/**
 * Get the performers for given element id
 *
 * @param {(string|object)} bpmn - the process definition as XML string or BPMN-Moddle Object
 * @param {string} elementId the id of the element
 * @returns {Array} array with all performers
 */
async function getPerformersFromElementById(bpmn, elementId) {
  const bpmnObj = typeof bpmn === 'string' ? await toBpmnObject(bpmn) : bpmn;
  const element = getElementById(bpmnObj, elementId);

  return getPerformersFromElement(element);
}

/**
 * An object containing properties from defined companies
 *
 * @typedef CompanyInfos
 * @type {object}
 * @property {string} id - company id
 * @property {string} shortName - company short name
 * @property {string} longName - company long name
 * @property {string} [description] - company description
 * @property {string} [factoryIds]
 */

/**
 * An object containing properties from defined factories
 *
 * @typedef FactoryInfos
 * @type {object}
 * @property {string} id - factory id
 * @property {string} shortName - factory short name
 * @property {string} longName - factory long name
 * @property {string} [description] - factory description
 * @property {string} [companyRef] - reference to company linked to factory
 */

/**
 * An object containing properties from defined buildings
 *
 * @typedef BuildingInfos
 * @type {object}
 * @property {string} id - building id
 * @property {string} shortName - building short name
 * @property {string} longName - building long name
 * @property {string} [description] - building description
 * @property {string} [factoryRef] - building to factory linked to building
 */

/**
 * An object containing properties from defined areas
 *
 * @typedef AreaInfos
 * @type {object}
 * @property {string} id - area id
 * @property {string} shortName - area short name
 * @property {string} longName - area long name
 * @property {string} [description] - area description
 * @property {string} [buildingRef] - reference to building linked to area
 */

/**
 * An object containing properties from defined working places
 *
 * @typedef WorkingPlaceInfos
 * @type {object}
 * @property {string} id - workingPlace id
 * @property {string} shortName - workingPlace short name
 * @property {string} longName - workingPlace long name
 * @property {string} [description] - workingPlace description
 * @property {string} [buildingRef] - reference to building linked to workingPlace
 * @property {string} [areaRef] - reference to area linked to workingPlace
 */

/**
 * Parses the locations from a bpmn-moddle element
 *
 * @param {object} element
 * @returns {{company: CompanyInfos[], factory: FactoryInfos[], building: BuildingInfos[], area: AreaInfos[], workingPlace: WorkingPlaceInfos[]}} object with all locations
 */
function getLocationsFromElement(element) {
  let company = [];
  let factory = [];
  let building = [];
  let area = [];
  let workingPlace = [];

  // check if there is a extensionElements entry that might contain a proceed:milestones element
  if (element.extensionElements && Array.isArray(element.extensionElements.values)) {
    const locationsElement = element.extensionElements.values.find(
      (child) => child.$type == 'proceed:Locations',
    );
    if (locationsElement && locationsElement.company) {
      company = locationsElement.company.map(
        ({ id, shortName, longName, description, factoryIds }) => {
          if (!id || !shortName || !longName) {
            throw new Error(
              'Some Company Elements are not valid due to missing mandatory attributes',
            );
          }
          return {
            id,
            shortName,
            longName,
            description,
            factoryIds,
          };
        },
      );
    }

    if (locationsElement && locationsElement.factory) {
      factory = locationsElement.factory.map(
        ({ id, shortName, longName, description, companyRef }) => {
          if (!id || !shortName || !longName) {
            throw new Error(
              'Some Company Elements are not valid due to missing mandatory attributes',
            );
          }
          return {
            id,
            shortName,
            longName,
            description,
            companyRef,
          };
        },
      );
    }

    if (locationsElement && locationsElement.building) {
      building = locationsElement.building.map(
        ({ id, shortName, longName, description, factoryRef }) => {
          if (!id || !shortName || !longName) {
            throw new Error(
              'Some Building Elements are not valid due to missing mandatory attributes',
            );
          }
          return {
            id,
            shortName,
            longName,
            description,
            factoryRef,
          };
        },
      );
    }

    if (locationsElement && locationsElement.area) {
      area = locationsElement.area.map(({ id, shortName, longName, description, buildingRef }) => {
        if (!id || !shortName || !longName) {
          throw new Error('Some Area Elements are not valid due to missing mandatory attributes');
        }
        return {
          id,
          shortName,
          longName,
          description,
          buildingRef,
        };
      });
    }

    if (locationsElement && locationsElement.workingPlace) {
      workingPlace = locationsElement.workingPlace.map(
        ({ id, shortName, longName, description, buildingRef, areaRef }) => {
          if (!id || !shortName || !longName) {
            throw new Error(
              'Some WorkingPlace Elements are not valid due to missing mandatory attributes',
            );
          }
          return {
            id,
            shortName,
            longName,
            description,
            buildingRef,
            areaRef,
          };
        },
      );
    }
  }

  return { company, factory, building, area, workingPlace };
}

/**
 * An object containing properties from defined resources
 *
 * @typedef ResourceInfos
 * @type {object}
 * @property {string} id - consumableMaterial id
 * @property {string} shortName - consumableMaterial short name
 * @property {string} longName - consumableMaterial long name
 * @property {string} [manufacturer] - consumableMaterial manufacturer
 * @property {string} [manufacturerSerialNumber] - consumableMaterial manufacturerSerialNumber
 * @property {string} [unit] - consumableMaterial unit
 * @property {string} quantity - consumableMaterial quantity
 * @property {string} [description] - consumableMaterial description
 */

/**
 * Parses the resources from a bpmn-moddle element
 *
 * @param {object} element
 * @returns {{consumableMaterial: ResourceInfos[], tool: ResourceInfos[], inspectionInstrument: ResourceInfos[]}} object with all resources
 */
function getResourcesFromElement(element) {
  let consumableMaterial = [];
  let tool = [];
  let inspectionInstrument = [];
  // check if there is a extensionElements entry that might contain a proceed:milestones element
  if (element.extensionElements && Array.isArray(element.extensionElements.values)) {
    const resourcesElement = element.extensionElements.values.find(
      (child) => child.$type == 'proceed:Resources',
    );
    if (resourcesElement && resourcesElement.consumableMaterial) {
      consumableMaterial = resourcesElement.consumableMaterial.map(
        ({
          id,
          shortName,
          longName,
          manufacturer,
          manufacturerSerialNumber,
          unit,
          quantity,
          description,
        }) => {
          if (!id || !shortName || !longName || !quantity) {
            throw new Error(
              'Some ConsumableMaterial Elements are not valid due to missing mandatory attributes',
            );
          }
          return {
            id,
            shortName,
            longName,
            manufacturer,
            manufacturerSerialNumber,
            unit,
            quantity,
            description,
          };
        },
      );
    }

    if (resourcesElement && resourcesElement.tool) {
      tool = resourcesElement.tool.map(
        ({
          id,
          shortName,
          longName,
          manufacturer,
          manufacturerSerialNumber,
          unit,
          quantity,
          description,
        }) => {
          if (!id || !shortName || !longName || !quantity) {
            throw new Error('Some Tool Elements are not valid due to missing mandatory attributes');
          }
          return {
            id,
            shortName,
            longName,
            manufacturer,
            manufacturerSerialNumber,
            unit,
            quantity,
            description,
          };
        },
      );
    }

    if (resourcesElement && resourcesElement.inspectionInstrument) {
      inspectionInstrument = resourcesElement.inspectionInstrument.map(
        ({
          id,
          shortName,
          longName,
          manufacturer,
          manufacturerSerialNumber,
          unit,
          quantity,
          description,
        }) => {
          if (!id || !shortName || !longName || !quantity) {
            throw new Error(
              'Some InspectionInstrument Elements are not valid due to missing mandatory attributes',
            );
          }
          return {
            id,
            shortName,
            longName,
            manufacturer,
            manufacturerSerialNumber,
            unit,
            quantity,
            description,
          };
        },
      );
    }
  }

  return { consumableMaterial, tool, inspectionInstrument };
}

/**
 * Get the performers for given element
 *
 * @param {object} element
 * @returns {Array} performers given for element
 */
function getPerformersFromElement(element) {
  if (element.resources) {
    const potentialOwner = element.resources.find(
      (resource) => resource.$type === 'bpmn:PotentialOwner',
    );

    if (
      potentialOwner &&
      potentialOwner.resourceAssignmentExpression &&
      potentialOwner.resourceAssignmentExpression.expression &&
      potentialOwner.resourceAssignmentExpression.expression.body
    ) {
      return JSON.parse(potentialOwner.resourceAssignmentExpression.expression.body);
    }
  }
  return [];
}

/**
 * Parses ISO Duration String to number of years, months, days, hours, minutes and seconds
 * @param {string} isoDuration
 * @returns {{years: number | null, months: number | null, days: number | null, hours: number | null, minutes: number | null, seconds: number | null}} Object with number of years, months, days, hours, minutes and seconds
 */
function parseISODuration(isoDuration) {
  let years = null;
  let months = null;
  let days = null;
  let hours = null;
  let minutes = null;
  let seconds = null;
  let dateStr = isoDuration.substring(isoDuration.lastIndexOf('P') + 1);
  let timeStr = '';

  if (dateStr.includes('T')) {
    dateStr = isoDuration.substring(isoDuration.lastIndexOf('P') + 1, isoDuration.lastIndexOf('T'));
    timeStr = isoDuration.substring(isoDuration.lastIndexOf('T') + 1);
  }
  if (dateStr.includes('Y')) {
    const yearsStr = dateStr.substring(0, dateStr.lastIndexOf('Y'));
    years = parseInt(yearsStr) || null;
    dateStr = dateStr.substring(dateStr.lastIndexOf('Y') + 1);
  }
  if (dateStr.includes('M')) {
    const monthsStr = dateStr.substring(0, dateStr.lastIndexOf('M'));
    months = parseInt(monthsStr) || null;
    dateStr = dateStr.substring(dateStr.lastIndexOf('M') + 1);
  }
  if (dateStr.includes('D')) {
    const daysStr = dateStr.substring(0, dateStr.lastIndexOf('D'));
    days = parseInt(daysStr) || null;
  }
  if (timeStr.includes('H')) {
    const hoursStr = timeStr.substring(0, timeStr.lastIndexOf('H'));
    hours = parseInt(hoursStr) || null;
    timeStr = timeStr.substring(timeStr.lastIndexOf('H') + 1);
  }
  if (timeStr.includes('M')) {
    const minutesStr = timeStr.substring(0, timeStr.lastIndexOf('M'));
    minutes = parseInt(minutesStr) || null;
    timeStr = timeStr.substring(timeStr.lastIndexOf('M') + 1);
  }
  if (timeStr.includes('S')) {
    const secondsStr = timeStr.substring(0, timeStr.lastIndexOf('S'));
    seconds = parseInt(secondsStr) || null;
  }

  return { years, months, days, hours, minutes, seconds };
}

/**
 * Convert given ISO Duration in number of miliseconds
 *
 * @param {string} isoDuration duration in iso standard
 * @returns {number} number of miliseconds for duration
 */
function convertISODurationToMiliseconds(isoDuration) {
  const { years, months, days, hours, minutes, seconds } = parseISODuration(isoDuration);

  const durationInMiliseconds =
    seconds * 1000 +
    minutes * (1000 * 60) +
    hours * (1000 * 60 * 60) +
    days * (1000 * 60 * 60 * 24) +
    months * (1000 * 60 * 60 * 24 * 30) +
    years * (1000 * 60 * 60 * 24 * 365);

  return durationInMiliseconds;
}

module.exports = {
  // 'definitions' element related
  getDefinitionsId,
  getOriginalDefinitionsId,
  getDefinitionsName,
  getDefinitionsInfos,
  getImports,
  getDefinitionsVersionInformation,

  // 'process' element related
  getProcessIds,
  getDeploymentMethod,
  getProcessConstraints,
  getProcessDocumentation,
  getProcessDocumentationByObject,

  // userTasks
  getUserTaskFileNameMapping,
  getAllUserTaskFileNamesAndUserTaskIdsMapping,

  // sub-process related
  getSubprocess,
  getSubprocessContent,
  getTargetDefinitionsAndProcessIdForCallActivityByObject,
  getDefinitionsAndProcessIdForEveryCallActivity,

  // other elements
  getStartEvents,
  getAllBpmnFlowElements,
  getAllBpmnFlowNodeIds,
  getAllBpmnFlowElementIds,
  getChildrenFlowElements,
  getElementMachineMapping,
  getTaskConstraintMapping,
  getIdentifyingInfos,
  getRootFromElement,

  // proceed:Meta related
  getMetaDataFromElement,
  getMetaData,

  getMilestonesFromElement,
  getMilestonesFromElementById,
  getResourcesFromElement,
  getLocationsFromElement,
  getPerformersFromElement,
  getPerformersFromElementById,
  parseISODuration,
  convertISODurationToMiliseconds,
};
