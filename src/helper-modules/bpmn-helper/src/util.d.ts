export type manipulationFunction = (bpmnModdleElement: object) => any;
export const moddle: any;
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
export function ensureCorrectProceedNamespace(xml: string): string;
/**
 * Function that converts the given XML to a traversable object representation
 *
 * @param {string} xml - the BPMN XML that should be converted
 * @param {string} [typename] - name of the root element, optional
 * @returns {Promise<object>} a traversable object representation of the given XML
 * @throws {Error} if the given string is not an XML
 * @throws {Error} if the given XML can not be converted to a bpmn-moddle object (multiple possible reasons)
 */
export function toBpmnObject(xml: string, typename?: string): Promise<object>;
/**
 * Function that converts the given bpmn object to xml
 *
 * @param {object} bpmn traversable object representation
 * @returns {Promise<string>} a xml representation of the given object
 */
export function toBpmnXml(obj: any): Promise<string>;
/**
 * Finds all kinds of childnodes in a given node
 *
 * @param {object} travObj object of which we want to know the childnodes
 * @returns {array} all childnodes of the given node
 */
export function getChildren(travObj: object): any[];
/**
 * A function that given a traversable object returns all occurences of a given tagName
 *
 * @param {object} travObj the object we want to search in
 * @param {string} tagname the name we are searching for
 * @returns {array} - all nodes with the given tagName
 */
export function getElementsByTagName(travObj: object, tagname: string): any[];
/**
 * A function that given a traversable object returns all occurences
 *
 * @param {object} travObj the object we want to search in
 * @returns {array} - all nodes within the object
 */
export function getAllElements(travObj: object): any[];
/**
 * A function that given a traversable object returns the nested object with the given id
 *
 * @param {object} travObj the object we want to search in
 * @param {string} id the id of the object we want to find
 * @returns {object|undefined} - returns the found object or undefined when no matching object was found
 */
export function getElementById(travObj: object, id: string): object | undefined;
/**
 * Gets the diagram element for the given model element
 *
 * @param {object} element the model element
 * @param {object} [definitions] the definitions object to search in
 */
export function getElementDI(element: object, definitions?: object): any;
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
export function manipulateElementById(
  bpmn: string | object,
  id: string,
  manipFunc: manipulationFunction,
): Promise<string | object>;
/**
 * Function that changes all elements in the given xml with the given tagname
 * using the given function
 *
 * @param {(string|object)} bpmn - the process definition as XML string or BPMN-Moddle Object
 * @param {string} tagName - the tagname of the elements we want to change, starts with 'bpmn:', e.g. 'bpmn:Definitions'
 * @param {manipulationFunction} manipFunc - the function that gets called on each element with a forEach-Loop
 * @returns {Promise<string|object>} the BPMN process as bpmn-moddle object or XML string based on input
 */
export function manipulateElementsByTagName(
  bpmn: string | object,
  tagName: string,
  manipFunc: manipulationFunction,
): Promise<string | object>;
