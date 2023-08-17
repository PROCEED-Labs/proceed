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

// helper for graphic derivation

// draw a BPMN-Elements to a specified position on a plane.
function createElementShape(model, element, xPos, yPos, processPlane, parameter) {
  let size = getElementSize(element);
  let x = xPos * Constants.VisualElementOffsetX - size.width / 2;
  let y =
    yPos * Constants.VisualElementOffsetY + Constants.VisualElementOffsetY / 2 - size.height / 2;

  let shape = model.create('bpmndi:BPMNShape', {
    id: element.id + '_di',
    bpmnElement: element,
    bounds: model.create('dc:Bounds', { x: x, y: y, ...size }),
    ...parameter,
  });
  shape.yPos = yPos;

  processPlane.get('planeElement').push(shape);
  return shape;
}

// draw a sequenceFlow of an element on a plane. The flow is placed, based on the position of the BPMN-Elements it connects
function createFlowShape(model, flowElement, processPlane) {
  let planeElements = processPlane.get('planeElement');

  let from = flowElement.sourceRef;
  let to = flowElement.targetRef;

  let fromBounds = planeElements.find((element) => element.id.includes(from.id)).bounds;
  let toBounds = planeElements.find((element) => element.id.includes(to.id)).bounds;

  let fromSize = getElementSize(from);
  let toSize = getElementSize(to);

  let yFrom = fromBounds.y + fromSize.height / 2;
  let yTo = toBounds.y + toSize.height / 2;

  let direction = yFrom > yTo ? -1 : 1;
  let waypoints;
  if (yFrom === yTo) {
    waypoints = [
      model.create('dc:Point', { x: fromBounds.x + fromSize.width, y: yFrom }),
      model.create('dc:Point', { x: toBounds.x, y: yTo }),
    ];
  } else if (from.id.includes('Gateway_') && to.id.includes('Gateway_')) {
    waypoints = [
      model.create('dc:Point', {
        x: fromBounds.x + fromSize.height / 2,
        y: yFrom + (direction * fromSize.height) / 2,
      }),
      model.create('dc:Point', { x: fromBounds.x + fromSize.width / 2, y: yTo }),
      model.create('dc:Point', {
        x: toBounds.x + toSize.height / 2,
        y: yTo - (direction * toSize.height) / 2,
      }),
    ];
  } else if (from.id.includes('Gateway_')) {
    waypoints = [
      model.create('dc:Point', {
        x: fromBounds.x + fromSize.width / 2,
        y: yFrom + (direction * fromSize.height) / 2,
      }),
      model.create('dc:Point', { x: fromBounds.x + fromSize.width / 2, y: yTo }),
      model.create('dc:Point', { x: toBounds.x, y: yTo }),
    ];
  } else if (to.id.includes('Gateway_')) {
    waypoints = [
      model.create('dc:Point', { x: fromBounds.x + fromSize.width, y: yFrom }),
      model.create('dc:Point', { x: toBounds.x + toSize.width / 2, y: yFrom }),
      model.create('dc:Point', {
        x: toBounds.x + toSize.width / 2,
        y: yTo - (direction * toSize.height) / 2,
      }),
    ];
  } else {
    waypoints = [
      model.create('dc:Point', { x: fromBounds.x + fromSize.width, y: yFrom }),
      model.create('dc:Point', { x: toBounds.x, y: yTo }),
    ];
  }

  let shape = model.create('bpmndi:BPMNEdge', {
    id: 'Edge_' + randomID(),
    bpmnElement: flowElement,
    waypoint: waypoints,
  });
  processPlane.get('planeElement').push(shape);
  return shape;
}

// return the drawing-size of an element, based on "ShapeSize"
function getElementSize(element) {
  let size = Constants.ShapeSize.default;
  Object.keys(Constants.ShapeSize).forEach((shapeName) => {
    if (element.id.includes(shapeName)) size = Constants.ShapeSize[shapeName];
  });
  return size;
}

// return direct successors of an element within a process
function getSuccessors(element, process) {
  return process
    .get(Constants.NodeTypes.flowElements)
    .filter((elem) => elem.sourceRef == element)
    .map((elem) => elem.targetRef);
}

// return direct predecessors of an element within a process
function getPredecessors(element, process) {
  return process
    .get(Constants.NodeTypes.flowElements)
    .filter((elem) => elem.targetRef == element)
    .map((elem) => elem.sourceRef);
}

// create a BPMN diagram and plan for the graphical representation of a (sub-)process
function createProcessPlane(data, process) {
  let bpmnDiagram = data.model.create('bpmndi:BPMNDiagram', {
    id: 'BPMNDiagram_' + data.planeIdCounter++, //process.id.replace(/[^a-z0-9]/gi, ''),
    name: 'BPMNDiagram_' + process.name.replace(/[^a-z0-9]/gi, ''),
  });

  let plane = data.model.create('bpmndi:BPMNPlane', {
    id: 'BPMNPlane_' + data.planeIdCounter,
    // name : "BPMNDiagram_"+ process.name.replace(/[^a-z0-9]/gi, '')
  });
  plane.bpmnElement = process;
  bpmnDiagram.set('plane', plane);

  data.definitions.get('diagrams').push(bpmnDiagram);
  return plane;
}

// iterate recursively through the bpmn process (from element to target) to find the path with the largest number of tasks
function calculatedBomDepth(element, target, process) {
  if (element == target) return 0;
  else {
    let successors = process
      .get(Constants.NodeTypes.flowElements)
      .filter((elem) => elem.sourceRef == element)
      .map((elem) => elem.targetRef);
    let successorTasks = successors.flatMap((suc) => {
      if (suc.id.includes('Gateway_')) {
        return process
          .get(Constants.NodeTypes.flowElements)
          .filter((elem) => elem.sourceRef == suc)
          .map((elem) => elem.targetRef);
      }
      return suc;
    });

    return 1 + Math.max(...successorTasks.map((suc) => calculatedBomDepth(suc, target, process)));
  }
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
  createElementShape,
  createFlowShape,
  getElementSize,
  getSuccessors,
  getPredecessors,
  createProcessPlane,
  calculatedBomDepth,
};
