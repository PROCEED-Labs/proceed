const Constants = require('./constants.js');

function randomID() {
  return Math.random().toString(36).substr(2, 7);
}

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
  createElementShape,
  createFlowShape,
  getElementSize,
  getSuccessors,
  getPredecessors,
  createProcessPlane,
  calculatedBomDepth,
};
