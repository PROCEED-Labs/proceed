const { moddle, toBpmnObject, toBpmnXml, getElementById } = require('./util.js');

// elements that are specifically defined in the proceed moddle schema
const proceedExtensionElements = {
  Meta: { isRoot: true },
  costsPlanned: { parent: 'Meta' },
  timePlannedDuration: { parent: 'Meta' },
  timePlannedOccurrence: { parent: 'Meta' },
  timePlannedEnd: { parent: 'Meta' },
  occurrenceProbability: { parent: 'Meta' },
  orderNumber: { parent: 'Meta' },
  orderName: { parent: 'Meta' },
  orderCode: { parent: 'Meta' },
  customerId: { parent: 'Meta' },
  customerName: { parent: 'Meta' },
  overviewImage: { parent: 'Meta' },
  defaultPriority: { parent: 'Meta' },
  property: { parent: 'Meta', identifier: 'name' },
  Milestones: { isRoot: true },
  milestone: { parent: 'Milestones' },
  Milestone: { parent: 'milestone', identifier: 'id' },
  Locations: { isRoot: true },
  company: { parent: 'Locations' },
  Company: { parent: 'company', identifier: 'id' },
  factory: { parent: 'Locations' },
  Factory: { parent: 'factory', identifier: 'id' },
  building: { parent: 'Locations' },
  Building: { parent: 'building', identifier: 'id' },
  area: { parent: 'Locations' },
  Area: { parent: 'area', identifier: 'id' },
  workingPlace: { parent: 'Locations' },
  WorkingPlace: { parent: 'workingPlace', identifier: 'id' },
  Resources: { isRoot: true },
  consumableMaterial: { parent: 'Resources' },
  ConsumableMaterial: { parent: 'consumableMaterial', identifier: 'id' },
  tool: { parent: 'Resources' },
  Tool: { parent: 'tool', identifier: 'id' },
  inspectionInstrument: { parent: 'Resources' },
  InspectionInstrument: { parent: 'inspectionInstrument', identifier: 'id' },
  mqttServer: { parent: 'Meta', identifier: 'url' },

  Variables: { isRoot: true },
  variable: { parent: 'Variables' },
  Variable: { parent: 'variable', identifier: 'name' },
};

/**
 * Returns the extensionElements entry inside the given element (creates one if there isn't one already)
 *
 * @param {object} element the element we want the extensionElements entry of
 * @returns {object} the extensionElements entry
 */
function ensureExtensionElements(element) {
  let { extensionElements } = element;

  if (!extensionElements) {
    extensionElements = moddle.create('bpmn:ExtensionElements');
    extensionElements.values = [];
    element.extensionElements = extensionElements;
  }

  return extensionElements;
}

function removeEmptyExtensionElements(element) {
  const { extensionElements } = element;

  // extensionElements doesn't contain any info => remove
  if (extensionElements && (!extensionElements.values || !extensionElements.values.length)) {
    delete element.extensionElements;
  }
}

/**
 * Returns a container element entry inside a given element (creates it if there isn't already one)
 *
 * @param {object} element the element that should contain the container element
 * @param {string} containerType the type of container that is expected
 * @returns {object} the container element
 */
function ensureContainerElement(element, containerType) {
  let container;
  if (proceedExtensionElements[containerType].isRoot) {
    // make sure there is an extensionsElement to contain the container
    const extensionElements = ensureExtensionElements(element);

    container = extensionElements.values.find((child) => child.$type == `proceed:${containerType}`);

    if (!container) {
      container = moddle.create(`proceed:${containerType}`);
      extensionElements.values.push(container);
    }
  } else {
    // make sure that the container is contained in the specified parent container
    const parent = ensureContainerElement(element, proceedExtensionElements[containerType].parent);
    container = parent[containerType] || [];
    parent[containerType] = container;
  }

  return container;
}

function removeEmptyContainerElement(element, containerType, containerElement) {
  const isEmptyArray = Array.isArray(containerElement) && !containerElement.length;
  const isEmptyObject = !Object.getOwnPropertyNames(containerElement).some(
    (property) => !property.startsWith('$') && property !== '__ob__',
  );

  const isEmpty = isEmptyArray || isEmptyObject;

  if (isEmpty) {
    if (proceedExtensionElements[containerType].isRoot) {
      const { extensionElements } = element;

      extensionElements.values = extensionElements.values.filter((el) => el !== containerElement);

      removeEmptyExtensionElements(element);
    } else {
      const { parent: parentContainerType } = proceedExtensionElements[containerType];
      const parentContainer = ensureContainerElement(element, parentContainerType);

      delete parentContainer[containerType];

      removeEmptyContainerElement(element, parentContainerType, parentContainer);
    }
  }
}

function getOldElement(container, proceedElementType, attributes) {
  let oldElement;

  // if the container is an array an identifier should be used to identify specific elements
  if (Array.isArray(container)) {
    const { identifier } = proceedExtensionElements[proceedElementType];

    oldElement = container.find((el) => el[identifier] === attributes[identifier]);
  } else {
    oldElement = container[proceedElementType];
  }

  return oldElement;
}

function getElementAttributes(element) {
  return Object.getOwnPropertyNames(element)
    .filter((property) => !property.startsWith('$'))
    .reduce((acc, curr) => {
      acc[curr] = element[curr];
      return acc;
    }, {});
}

/**
 * Sets values and attributes for custom proceed element
 *
 * @param {object} element the element to be updated
 * @param {string} proceedElementType the type of proceed element
 * @param {any} value the value to be inserted into element
 * @param {object} [attributes] the attributes to be set in element
 * @param {object} [oldAttributes] optional old attributes of element
 * @returns {object} attributes of old element
 */
function setProceedElement(
  element,
  proceedElementType,
  value,
  attributes = {},
  oldAttributes = attributes,
) {
  let parent;
  if (proceedElementType === 'property') {
    // properties that are not explicitly defined are stored as a property element inside a property container in the meta element
    parent = 'property';
  } else {
    ({ parent } = proceedExtensionElements[proceedElementType]);
  }

  // get the existing container element that should contain the element or create it if it does not yet exist
  const container = ensureContainerElement(element, parent);

  const oldElement = getOldElement(container, proceedElementType, oldAttributes);

  const { identifier } = proceedExtensionElements[proceedElementType];

  if (value !== null) {
    const proceedElement = moddle.create(`proceed:${proceedElementType}`, attributes);

    if (Array.isArray(container)) {
      const oldElementIndex = container.findIndex(
        (el) => el[identifier] === oldAttributes[identifier],
      );

      if (oldElementIndex !== -1) {
        container[oldElementIndex] = proceedElement;
      } else {
        container.push(proceedElement);
      }
    } else {
      container[proceedElementType] = proceedElement;
    }
    proceedElement.value = value;
  } else if (oldElement) {
    // Remove the element
    if (Array.isArray(container)) {
      container.splice(
        container.findIndex((el) => el[identifier] === attributes[identifier]),
        1,
      );
    } else {
      delete container[proceedElementType];
    }
  }

  removeEmptyContainerElement(element, parent, container);

  return oldElement && getElementAttributes(oldElement);
}

/**
 * Updates the Meta Information of an element
 *
 * @param {(string|object)} bpmn - the process definition as XML string or BPMN-Moddle Object
 * @param {string} elId the id of the element to update
 * @param {object} metaValues the meta data values to set
 * @returns {Promise.<string|object>} the BPMN process as XML string or BPMN-Moddle Object based on input
 */
async function setMetaData(bpmn, elId, metaValues) {
  const bpmnObj = typeof bpmn === 'string' ? await toBpmnObject(bpmn) : bpmn;
  const element = getElementById(bpmnObj, elId);

  Object.entries(metaValues).forEach(([key, value]) => {
    setProceedElement(element, key, value, {});
  });

  return typeof bpmn === 'string' ? await toBpmnXml(bpmnObj) : bpmnObj;
}

module.exports = {
  ensureExtensionElements,
  removeEmptyExtensionElements,

  ensureContainerElement,
  removeEmptyContainerElement,

  // proceed:Meta related
  setMetaData,

  setProceedElement,
};
