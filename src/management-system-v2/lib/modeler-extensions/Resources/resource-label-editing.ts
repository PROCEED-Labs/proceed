import Modeling from 'bpmn-js/lib/features/modeling/Modeling';
import EventBus from 'diagram-js/lib/core/EventBus';

import { isLabel } from 'bpmn-js/lib/util/LabelUtil';

export default class ResourceLabelEditingProvider {
  modeling: Modeling;
  constructor(eventBus: EventBus, modeling: Modeling) {
    eventBus.on('element.dblclick', 1500, (event) => {
      const { element } = event;
      if (!isLabel(element) && !element.label) {
        this.modeling.createLabel(
          element,
          {
            x: element.x + element.width / 2,
            y: element.y + element.height + 20,
          },
          {
            id: element.businessObject.id + '_label',
            businessObject: element.businessObject,
            di: element.di,
          },
        );
      }
    });
    this.modeling = modeling;
  }
}
