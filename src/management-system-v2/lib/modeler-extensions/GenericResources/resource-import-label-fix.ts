import { is } from 'bpmn-js/lib/util/ModelUtil';
import EventBus from 'diagram-js/lib/core/EventBus';
import type ElementFactory from 'bpmn-js/lib/features/modeling/ElementFactory';
import type Canvas from 'diagram-js/lib/core/Canvas';

import { Shape } from 'bpmn-js/lib/model/Types';

import { isLabel } from 'bpmn-js/lib/util/LabelUtil';

/**
 * This module is responsible for adding labels to the process svg in the viewer or modeler which
 * does not work by default since bpmn-js does not consider our resources as having (external)
 * labels
 */
export default class CustomAutoPlace {
  // this tells bpmn-js which modules need to be passed to the constructor (the order must be the
  // same as in the constructor!!)
  static $inject: string[] = ['eventBus', 'elementFactory', 'canvas'];

  constructor(eventBus: EventBus, elementFactory: ElementFactory, canvas: Canvas) {
    eventBus.on('bpmnElement.added', (event: { element: Shape }) => {
      const { element } = event;
      if (
        is(element, 'proceed:GenericResource') &&
        !isLabel(element) &&
        !element.label &&
        element.di &&
        element.di.label &&
        element.di.label.bounds
      ) {
        // recreate labels when importing an xml into the modeler
        const labelElement = elementFactory.createLabel({
          id: element.businessObject.id + '_label',
          labelTarget: element,
          type: 'label',
          businessObject: element.businessObject,
          di: element.di,
          x: element.di.label.bounds.x,
          y: element.di.label.bounds.y,
          width: element.di.label.bounds.width,
          height: element.di.label.bounds.height,
        });

        // add the label to the graphical representation of the process in the viewer or the modeler
        canvas.addShape(labelElement, element.parent);
      }
    });
  }
}
