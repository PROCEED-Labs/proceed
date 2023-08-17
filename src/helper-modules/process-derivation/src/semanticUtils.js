const Constants = require('./constants.js');

function randomID() {
  return Math.random().toString(36).substr(2, 7);
}

// helper for semantic derivation
function nextLevelMaterials(nextLayerElements, residualBOM, allocations, operations) {
  let res = {};
  res.components = {};
  nextLayerElements.push(residualBOM.length);
  for (let i = 0; i < nextLayerElements.length - 1; i++) {
    let component = residualBOM[nextLayerElements[i]];
    component.residualBOM = residualBOM.slice(nextLayerElements[i], nextLayerElements[i + 1]);
    res.components[component.material] = component;
  }
  // group allocation by requierend materials
  res.groups = [...new Set(allocations.map((alloc) => alloc.operation))].sort((a, b) => b - a);
  res.groupMaterials = {};
  res.groups.forEach((operation) => {
    res.groupMaterials[operation] = allocations
      .filter((alloc) => alloc.operation == operation)
      .map((alloc) => alloc.component);
  });
  // group operations by requierend materials
  res.groupOperations = {};
  if (operations !== undefined) {
    let groupBounds = [...res.groups];
    groupBounds[groupBounds.length - 1] = 0;
    let upperBound = Math.max(...operations.map((op) => op.operation)) + 1;
    groupBounds.forEach((lowerBound, index) => {
      res.groupOperations[res.groups[index]] = operations.filter(
        (op) => op.operation < upperBound && op.operation >= lowerBound
      );
      upperBound = lowerBound;
    });
  }
  return res;
}

function addFinalProductToBOM(data) {
  let residualBOM = data.bom;
  residualBOM.unshift({
    material: data.rootMaterial,
    materialName: data.rootMaterial,
    quantity: 1,
    unit: 'PC',
    category: 'L',
    layer: 0,
    materialType: 'FERT',
  });
  return residualBOM;
}

function getTaskType(data, iteration, currentElement) {
  let taskType = data.processSettings.taskType;
  if (
    data.processSettings.useSubProcesses &&
    data.processSettings.subProcessesMaterials.length === 0 &&
    iteration % 2 == 0
  )
    taskType = Constants.Task.subProcess;
  else if (
    data.processSettings.subProcessesMaterials.includes(currentElement.material) &&
    iteration !== 1
  )
    taskType = Constants.Task.subProcess;

  return taskType;
}

function mergeIntoStartEvent(data, process) {
  let startEvent = createElement(data.model, process, Constants.Event.start);
  if (process.sourcedElements.length > 1) {
    let startGateway = createElement(data.model, process, Constants.Gateway.parallel);
    createFlow(data.model, process, startEvent, startGateway);
    process.sourcedElements.forEach((task) => {
      createFlow(data.model, process, startGateway, task);
    });
  } else {
    createFlow(data.model, process, startEvent, process.sourcedElements[0]);
  }
}
function createFlow(model, process, startElement, endElement, type = Constants.Other.sequenceFlow) {
  let parameter = {
    sourceRef: startElement,
    targetRef: endElement,
  };
  createElement(model, process, type, parameter);
}

function createTask(model, process, name, type, parameter) {
  return createElement(model, process, type, { name: name, ...parameter });
}
function createElement(model, process, elementType, parameter) {
  let elementId = elementType + '_' + randomID();

  let element = model.create('bpmn:' + elementType, {
    id: elementId,
    ...parameter,
  });
  process.get('flowElements').push(element);

  return element;
}

function addAnnotation(data, process, task, operations, allocations) {
  if (data.processSettings.textAnnotationsContents.length === 0) return;

  let text = '';
  if (
    data.processSettings.textAnnotationsContents.includes('Duration') &&
    operations !== undefined
  ) {
    text += 'Expected DURATION: \r';
    let units = [...new Set(operations.map((op) => op.unit))];
    for (let unit of units) {
      let sum = operations.map((op) => op.quantity).reduce((a, b) => a + b);
      text += sum + ' [' + unit + '] ';
    }
    text += '\r\r';
  }
  if (
    data.processSettings.textAnnotationsContents.includes('Workplace') &&
    operations !== undefined
  ) {
    let workplaces = [...new Set(operations.map((op) => op.workCenter))];
    text += 'Required WORKPLACES: \r' + workplaces.join(', ');
    text += '\r\r';
  }
  if (
    data.processSettings.textAnnotationsContents.includes('Material') &&
    allocations !== undefined
  ) {
    text += 'Required MATERIALS: \r';
    allocations.forEach((alloc) => {
      text += alloc.component + ' (x' + alloc.quantity + '), ';
    });
    text += '\r\r';
  }
  if (
    data.processSettings.textAnnotationsContents.includes('Worksteps') &&
    operations !== undefined
  ) {
    text += 'Required OPERATIONS: \r';
    let cols = ['operation', 'workCenter', 'quantity', 'unit', 'description'];
    for (let op of operations) {
      for (let col of cols) {
        text += op[col] + ' ';
      }
      text += '\r';
    }
  }

  // stop if no data added
  if (text.length == 0) return;

  let annotaion = createElement(data.model, process, Constants.Other.textAnnotation, {
    text: text,
  });
  createFlow(data.model, process, task, annotaion, Constants.Other.association);
}

module.exports = {
  nextLevelMaterials,
  addFinalProductToBOM,
  getTaskType,
  mergeIntoStartEvent,
  createFlow,
  createTask,
  createElement,
  addAnnotation,
};
