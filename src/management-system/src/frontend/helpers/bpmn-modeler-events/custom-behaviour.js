const { isExpanded } = require('bpmn-js/lib/util/DiUtil');

const CustomModelingModule = require('./custom-modeling.js');

/**
 * This Module will provide custom behaviour for different events inside a bpmn js modeler
 * BEWARE!! This module is used in the frontend modeler as well as the backend puppeteer modeler; only add functionality that should run in both
 */
class CustomBehaviour {
  constructor(eventBus, modeling, customModeling, commandStack, elementRegistry) {
    // cleanup before removing an element
    eventBus.on('commandStack.shape.delete.preExecute', 10000, ({ context }) => {
      let { shape } = context;
      if (shape.type === 'bpmn:CallActivity') {
        customModeling.removeCallActivityReference(shape.id, true);
      }
    });

    eventBus.on('commandStack.shape.replace.postExecute', 10000, ({ context }) => {
      let { newShape, oldShape } = context;

      // if the old shape was a placeholder remove the placeholder attribute
      if (oldShape.businessObject.placeholder) {
        commandStack.execute('element.updateProperties', {
          element: newShape,
          properties: { placeholder: undefined },
          isExternalEvent: true,
        });
      }

      // make sure that the label has the id of the element so the id will always be the same on all machines
      // normally it would have id of the type [intermediate-element-id]_label which would differ from machine to machine
      if (newShape.labels && newShape.labels.length) {
        newShape.labels.forEach((label) => {
          label.labelTarget = oldShape;
          label.businessObject = oldShape.businessObject;
        });
        oldShape.labels.forEach((label) => {
          label.labelTarget = newShape;
          label.businessObject = newShape.businessObject;
        });
      }
    });

    eventBus.on('commandStack.shape.replace.postExecuted', ({ context }) => {
      let { newShape, oldShape } = context;
      setTimeout(() => {
        if (!context.isExternalEvent) {
          // create startEvent inside of collapsed subprocess
          // (the timeout will ensure that the event distribution will send this event to all other machines so the same start event is created there)
          if (newShape.type === 'bpmn:SubProcess' && !isExpanded(newShape)) {
            // get the plane that represents the opened subprocess
            const subprocessPlane = elementRegistry.get(`${newShape.id}_plane`);
            modeling.createShape(
              { type: 'bpmn:StartEvent' },
              { x: newShape.x + newShape.width / 6, y: newShape.y + newShape.height / 2 },
              subprocessPlane, // add the new start event to the subprocess plane so it is only visible when the subprocess is opened/edited
            );
          } else if (newShape.type === 'bpmn:ScriptTask') {
            // script tasks might contain commands that are not idempotent => let the user handle interruptions as a default
            customModeling.updateProperty(newShape, 'manualInterruptionHandling', true);
          } else if (oldShape.type === 'bpmn:ScriptTask') {
            // other task types that are supported should be continuable without problems => use automatic handling for interruptions
            customModeling.updateProperty(newShape, 'manualInterruptionHandling', null);
          }
        }
      }, 10);
    });

    // ensure that a collpsed subprocess can be freely resized regardless of its content
    eventBus.on('resize.start', 500, (event) => {
      if (
        event.shape.type === 'bpmn:SubProcess' &&
        (event.shape.isExpanded === false || event.shape.collapsed)
      ) {
        delete event.context.resizeConstraints;
      }
    });
  }
}

CustomBehaviour.$inject = [
  'eventBus',
  'modeling',
  'customModeling',
  'commandStack',
  'elementRegistry',
];

module.exports = {
  __init__: ['customBehaviour'],
  __depends__: [CustomModelingModule],
  customBehaviour: ['type', CustomBehaviour],
};
