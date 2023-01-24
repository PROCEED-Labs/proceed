const { isExpanded } = require('bpmn-js/lib/util/DiUtil');

const CustomModelingModule = require('./custom-modeling.js');

/**
 * This Module will provide custom behaviour for different events inside a bpmn js modeler
 * BEWARE!! This module is used in the frontend modeler as well as the backend puppeteer modeler; only add functionality that should run in both
 */
class CustomBehaviour {
  constructor(eventBus, modeling, customModeling, commandStack) {
    // cleanup before removing an element
    eventBus.on('commandStack.shape.delete.preExecute', 10000, ({ context }) => {
      let { shape } = context;
      if (shape.type === 'bpmn:CallActivity') {
        customModeling.removeCallActivityReference(shape.id, true);
      }
    });

    // create startEvent inside of collapsed subprocess
    eventBus.on('commandStack.shape.replace.postExecute', 10000, ({ context }) => {
      let { newShape, oldShape } = context;
      if (newShape.type === 'bpmn:SubProcess' && !isExpanded(newShape)) {
        modeling.createShape(
          { type: 'bpmn:StartEvent', hidden: true },
          { x: newShape.x + newShape.width / 6, y: newShape.y + newShape.height / 2 },
          newShape,
          { autoResize: false }
        );
      }

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

CustomBehaviour.$inject = ['eventBus', 'modeling', 'customModeling', 'commandStack'];

module.exports = {
  __init__: ['customBehaviour'],
  __depends__: [CustomModelingModule],
  customBehaviour: ['type', CustomBehaviour],
};
