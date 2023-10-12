/**
 * Returns the extensionElements entry inside the given element (creates one if there isn't one already)
 *
 * @param {object} element the element we want the extensionElements entry of
 * @returns {object} the extensionElements entry
 */
export function ensureExtensionElements(element: object): object;
export function removeEmptyExtensionElements(element: any): void;
/**
 * Returns a container element entry inside a given element (creates it if there isn't already one)
 *
 * @param {object} element the element that should contain the container element
 * @param {string} containerType the type of container that is expected
 * @returns {object} the container element
 */
export function ensureContainerElement(element: object, containerType: string): object;
export function removeEmptyContainerElement(
  element: any,
  containerType: any,
  containerElement: any,
): void;
/**
 * Updates the Meta Information of an element
 *
 * @param {(string|object)} bpmn - the process definition as XML string or BPMN-Moddle Object
 * @param {string} elId the id of the element to update
 * @param {object} metaValues the meta data values to set
 * @returns {Promise.<string|object>} the BPMN process as XML string or BPMN-Moddle Object based on input
 */
export function setMetaData(
  bpmn: string | object,
  elId: string,
  metaValues: object,
): Promise<string | object>;
export function setProceedElement(
  element: any,
  proceedElementType: any,
  value: any,
  attributes?: {},
): {};
