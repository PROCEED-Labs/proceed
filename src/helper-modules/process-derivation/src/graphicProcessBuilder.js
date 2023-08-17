const Constants = require('./constants.js');
const Utils = require('./graphicUtils.js');

/**
 * Function, which derives the graphical representation of the process.
 * For a large part of the derivation a recursive function is invoked.
 *
 * @param {Object} data - Object containing enviroment data
 * @param {Object} data.model - bpmn-moddle instance
 * @param {Object} data.processSettings - derivation settings
 * @param {Object} data.process - droot process
 * @param {ModdelElement} process - Reference current (sub-)process
 * @returns {} Manipulation of the process-model
 */
function build(data, process) {
  if (process === undefined) process = data.process;

  // create plane for (sub-)process
  process.plane = Utils.createProcessPlane(data, process);

  // build opening Gateway & Start
  let flowElements = process.get(Constants.NodeTypes.flowElements);
  process.startEvent = flowElements.find((element) => element.id.includes('StartEvent_'));
  let startGateway = Utils.getSuccessors(process.startEvent, process)[0];
  let yCenterLine = 0;

  // distinguish linear and parallel processes
  if (startGateway.id.includes('Gateway_')) {
    process.plane.sourcedElements = Utils.getSuccessors(startGateway, process);

    yCenterLine = process.plane.sourcedElements.length / 2 - 0.5;
    Utils.createElementShape(data.model, process.startEvent, 0, yCenterLine, process.plane);
    Utils.createElementShape(data.model, startGateway, 1, yCenterLine, process.plane);

    // draw all sourced tasks to let ther tasks align to them correctly (yPos fixed)
    process.plane.sourcedElements.forEach((successor, index) => {
      Utils.createElementShape(data.model, successor, 2, index, process.plane);
    });
  }
  // no gatway, just linear process
  else {
    process.plane.sourcedElements = [startGateway];
    Utils.createElementShape(data.model, process.startEvent, 1, 0, process.plane);
    Utils.createElementShape(data.model, startGateway, 2, 0, process.plane);
  }

  // calculate BOM depth to correctly place elements on x-axis
  let endEvent = flowElements.find((element) => element.id.includes('EndEvent_'));
  let bomDepthCalculated = Utils.calculatedBomDepth(process.startEvent, endEvent, process);

  //  CALL RECURSIVE RENDER FUNCTION to draw BPMN-Elements
  createNextProcessLevel(data, process, endEvent, bomDepthCalculated * 2 + 2);

  try {
    // draw process flows
    flowElements
      .filter((flowElement) => flowElement.id.includes('SequenceFlow_'))
      .forEach((flow) => Utils.createFlowShape(data.model, flow, process.plane));
  } catch (error) {
    console.log('ERROR rendering the SequenceFlows. There might be a Element misspositioned');
    console.log(error);
  }

  // draw annotaions & association
  flowElements
    .filter((flowElement) => flowElement.id.includes('TextAnnotation_'))
    .forEach((annotation) => {
      let association = flowElements.find((flowElement) => flowElement.targetRef === annotation);
      let task = association.sourceRef;
      let taskShape = process.plane
        .get('planeElement')
        .find((element) => element.bpmnElement === task);
      let bounds = taskShape.bounds;

      Utils.createElementShape(
        data.model,
        annotation,
        bounds.x / Constants.VisualElementOffsetX + 3,
        bounds.y / Constants.VisualElementOffsetY + 1,
        process.plane
      );
      Utils.createFlowShape(data.model, association, process.plane);
    });
}

// recursively draw the BPMN-Elements to the plane.
function createNextProcessLevel(data, process, currentElement, x) {
  let predecessors = Utils.getPredecessors(currentElement, process);
  let elementAlignment = data.processSettings.elementAlignment;

  // when currentElement is a Gateway, first draw predecessor-element and then align the gateway to them
  if (predecessors.length > 1) {
    // Gateway
    let yVals = [];

    // draw the predecessor-element
    predecessors.forEach((pred) => {
      yVals.push(createNextProcessLevel(data, process, pred, x));
    });

    // draw  gateway centered to the tasks and return its position, for other elements to align to them
    let yGateway = yVals[Math.floor(predecessors.length / 2)];
    switch (elementAlignment) {
      case 'TOP':
        yGateway = yVals[0];
        break;
      case 'DOWN': // || "Waterfall"
        yGateway = yVals[yVals.length - 1];
        break;
      case 'Steps':
        yGateway = yVals.reduce((a, b) => a + b) / yVals.length;
        break;
      default:
        yGateway = yVals[Math.floor(predecessors.length / 2)];
    }
    Utils.createElementShape(data.model, currentElement, x - 1, yGateway, process.plane);
    return yGateway;
  }

  // when currentElement is a Activity
  else if (predecessors.length === 1) {
    // on subprocess, render subprocess also as seperate diagram
    if (currentElement.id.includes('SubProcess_')) build(data, currentElement);

    // on end of dependency chain, return yPos of sourced task, for other elements to align to them
    if (process.plane.sourcedElements.includes(currentElement)) {
      return process.plane
        .get('planeElement')
        .find((element) => element.id.includes(currentElement.id)).yPos;
    }
    // draw current Activity and return its position, for other elements to align to them
    x -= 2;
    let y = createNextProcessLevel(data, process, predecessors[0], x);
    Utils.createElementShape(data.model, currentElement, x, y, process.plane);
    return y;
  }
}

module.exports = {
  build,
};
