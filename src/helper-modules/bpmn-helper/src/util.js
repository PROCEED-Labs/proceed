const BPMNModdleModule = require('bpmn-moddle');
const BPMNModdle = BPMNModdleModule.default || BPMNModdleModule;
const bpmnSchema = require('../customSchema.json');

const moddle = new BPMNModdle({ proceed: bpmnSchema });

/**
 * @module @proceed/bpmn-helper
 */

/**
 * Sets the xmlns:proceed attribute in the definitions element of the bpmn to the one expected in our custom schema
 *
 * This is to make sure that importing the xml with bpmn-moddle will not lead to every proceed element being prefixed with ns0
 *
 * @param {string} xml
 */
function ensureCorrectProceedNamespace(xml) {
  return xml.replace(/(xmlns:proceed=\")([^\"]*)(\")/g, `$1${bpmnSchema.uri}$3`);
}

/**
 * Function that converts the given XML to a traversable object representation
 *
 * @param {string} xml - the BPMN XML that should be converted
 * @param {string} [typename] - name of the root element, optional
 * @returns {Promise<object>} a traversable object representation of the given XML
 * @throws {Error} if the given string is not an XML
 * @throws {Error} if the given XML can not be converted to a bpmn-moddle object (multiple possible reasons)
 */
async function toBpmnObject(xml, typename) {
  const { rootElement } = await moddle.fromXML(xml, typename);
  return rootElement;
}

/**
 * Function that converts the given bpmn object to xml
 *
 * @param {object} bpmn traversable object representation
 * @returns {Promise<string>} a xml representation of the given object
 */
async function toBpmnXml(obj) {
  const { xml } = await moddle.toXML(obj, { format: true });
  return xml;
}

/**
 * Finds all kinds of childnodes in a given node
 *
 * @param {object} travObj object of which we want to know the childnodes
 * @returns {array} all childnodes of the given node
 */
function getChildren(travObj) {
  const childNodeTypes = [
    'rootElements',
    'flowElements',
    'values',
    'diagrams',
    'imports',
    'extensionElements',
    'participants',
    'laneSets',
    'lanes',
  ];

  const allChildren = childNodeTypes
    .filter((childNodeType) => travObj[childNodeType])
    .flatMap((childNodeType) => travObj[childNodeType]);

  return allChildren;
}

/**
 * A function that given a traversable object returns all occurences
 *
 * @param {object} travObj the object we want to search in
 * @returns {array} - all nodes within the object
 */
function getAllElements(travObj) {
  // retrieve children for current object
  const allElements = getChildren(travObj)
    // retrieve all grandchilds
    .flatMap((child) => getAllElements(child));

  allElements.push(travObj);

  return allElements;
}

/**
 * A function that given a traversable object returns all occurences of a given tagName
 *
 * @param {object} travObj the object we want to search in
 * @param {string} tagname the name we are searching for
 * @returns {array} - all nodes with the given tagName
 */
function getElementsByTagName(travObj, tagname) {
  const matches = getChildren(travObj)
    // recursively search in all children
    .flatMap((child) => getElementsByTagName(child, tagname));

  if (travObj.$type === tagname) {
    matches.push(travObj);
  }

  return matches;
}

/**
 * Gets the diagram element for the given model element
 *
 * @param {object} element the model element
 * @param {object} [definitions] the definitions object to search in
 */
function getElementDI(element, definitions) {
  if (!definitions) {
    // search the root element which is the definitions element
    definitions = element;
    while (definitions.$parent) {
      definitions = definitions.$parent;
    }
  }

  for (const diagram of definitions.diagrams) {
    for (const planeElement of diagram.plane?.planeElement || []) {
      if (planeElement.bpmnElement === element) {
        return planeElement;
      }
    }
  }

  return null;
}

/**
 * A function that given a traversable object returns the nested object with the given id
 *
 * @param {object} travObj the object we want to search in
 * @param {string} id the id of the object we want to find
 * @returns {object|undefined} - returns the found object or undefined when no matching object was found
 */
function getElementById(travObj, id) {
  if (travObj.id === id) {
    return travObj;
  }

  const matchedElement = getChildren(travObj)
    .map((child) => getElementById(child, id))
    .find((matchInChild) => matchInChild);

  return matchedElement;
}

/**
 * @callback manipulationFunction
 * @param {object} bpmnModdleElement - the element return by searching the bpmn-moddle process
 */

/**
 * Function that changes an element in the given xml using the given manipulation function
 *
 * @param {(string|object)} bpmn - the process definition as XML string or BPMN-Moddle Object
 * @param {string} id - the id of the element that should be changed
 * @param {manipulationFunction} manipFunc - the function that will be used to change the element
 * @returns {Promise<string|object>} the BPMN process as bpmn-moddle object or XML string based on input
 */
async function manipulateElementById(bpmn, id, manipFunc) {
  const bpmnObj = typeof bpmn === 'string' ? await toBpmnObject(bpmn) : bpmn;
  const element = getElementById(bpmnObj, id);
  manipFunc(element);

  return typeof bpmn === 'string' ? await toBpmnXml(bpmnObj) : bpmnObj;
}

/**
 * Function that changes all elements in the given xml with the given tagname
 * using the given function
 *
 * @param {(string|object)} bpmn - the process definition as XML string or BPMN-Moddle Object
 * @param {string} tagName - the tagname of the elements we want to change, starts with 'bpmn:', e.g. 'bpmn:Definitions'
 * @param {manipulationFunction} manipFunc - the function that gets called on each element with a forEach-Loop
 * @returns {Promise<string|object>} the BPMN process as bpmn-moddle object or XML string based on input
 */
async function manipulateElementsByTagName(bpmn, tagName, manipFunc) {
  const bpmnObj = typeof bpmn === 'string' ? await toBpmnObject(bpmn) : bpmn;

  const elements = getElementsByTagName(bpmnObj, tagName);
  elements.forEach(manipFunc);

  return typeof bpmn === 'string' ? await toBpmnXml(bpmnObj) : bpmnObj;
}

module.exports = {
  moddle,
  ensureCorrectProceedNamespace,
  toBpmnObject,
  toBpmnXml,
  getChildren,
  getElementsByTagName,
  getAllElements,
  getElementById,
  getElementDI,
  manipulateElementById,
  manipulateElementsByTagName,
};
