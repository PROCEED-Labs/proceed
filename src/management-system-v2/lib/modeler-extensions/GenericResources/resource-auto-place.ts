import { is } from 'bpmn-js/lib/util/ModelUtil';
import EventBus from 'diagram-js/lib/core/EventBus';

import { Shape } from 'bpmn-js/lib/model/Types';
import { getDataElementPosition } from 'bpmn-js/lib/features/auto-place/BpmnAutoPlaceUtil';

const HIGH_PRIORITY = 10000;
/**
 * This module will catch autoplace events and inject our own position calculation when bpmn-js
 * tries to place a resource element
 */
export default class CustomAutoPlace {
  // this tells bpmn-js which modules need to be passed to the constructor (the order must be the
  // same as in the constructor!!)
  static $inject: string[] = ['eventBus'];

  constructor(eventBus: EventBus) {
    eventBus.on('autoPlace', HIGH_PRIORITY, function (context: { shape: Shape; source: Shape }) {
      const { shape, source } = context;

      if (is(shape, 'proceed:GenericResource')) {
        return getDataElementPosition(source, shape);
      }
    });
  }
}
