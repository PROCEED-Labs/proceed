import LabelEditingProvider from 'bpmn-js/lib/features/label-editing/LabelEditingProvider';

import EventBus from 'diagram-js/lib/core/EventBus';
import Modeling, { Rect } from 'bpmn-js/lib/features/modeling/Modeling';
import ElementRegistry from 'diagram-js/lib/core/ElementRegistry';
import { Shape } from 'bpmn-js/lib/model/Types';
import { is } from 'bpmn-js/lib/util/ModelUtil';
import { isLabelExternal } from 'bpmn-js/lib/util/LabelUtil';
import { getBackgroundColor, getBorderColor, getTextColor } from '@/lib/helpers/bpmn-js-helpers';

export default class ResizeHandler {
  // this tells bpmn-js which modules need to be passed to the constructor (the order must be the
  // same as in the constructor!!)
  static $inject: string[] = ['eventBus', 'modeling', 'elementRegistry'];

  constructor(eventBus: EventBus, modeling: Modeling, elementRegistry: ElementRegistry) {
    eventBus.on(
      'commandStack.shape.resize.preExecuted',
      (event: { context: { shape: Shape; newBounds: Rect } }) => {
        const { shape, newBounds } = event.context;

        const oldBounds = shape.di.bounds as Rect;
        const delta = {
          x: newBounds.width - oldBounds.width,
          y: newBounds.height - oldBounds.height,
        };

        function getAffectedElements(axis: 'x' | 'y') {
          const extend = axis === 'x' ? 'width' : 'height';

          const elements = elementRegistry.filter((el) => {
            if (el === shape) return false;

            if (is(el, 'bpmn:FlowNode')) {
              const node = el as Shape;
              const sameParent = el.parent === shape.parent;
              return sameParent && node[axis] > shape[axis] + shape[extend];
            }
          });

          return elements as Shape[];
        }

        if (delta.x > 0) {
          const toMove = getAffectedElements('x');

          for (const el of toMove) {
            modeling.moveElements([el], {
              x: delta.x,
              y: 0,
            });
          }
        }

        if (delta.y > 0) {
          const toMove = getAffectedElements('y');

          for (const el of toMove) {
            modeling.moveElements([el], {
              x: 0,
              y: delta.y,
            });
          }
        }

        // if (elementWidth > selectedElement.width) {
        //   let possiblyAffectedElements = (modeler!.getAllElements() as Shape[]).filter((el) => {
        //     // elements that start before the right border element cannot grown into
        //     return el.x > selectedElement.x + selectedElement.width;
        //   });

        //   possiblyAffectedElements.sort((a, b) => {
        //     return a.x - b.x;
        //   });
        //   console.log(possiblyAffectedElements);
        //   possiblyAffectedElements = possiblyAffectedElements.filter((el, index) => {
        //     // filter out elements that are contained in another element that is already being moved
        //     for (let i = 0; i < index; ++i) {
        //       if (el.parent === possiblyAffectedElements[i]) return false;
        //     }

        //     return true;
        //   });

        //   let shiftCorridorMin = selectedElement.y;
        //   let shiftCorridorMax = selectedElement.y + selectedElement.height;

        //   function overlapsCorridorVertically(el: Shape) {
        //     const contained = el.y > shiftCorridorMin && el.y + el.height < shiftCorridorMax;
        //     const crossesTop = el.y < shiftCorridorMin && el.y + el.height > shiftCorridorMin;
        //     const crossesBottom = el.y < shiftCorridorMax && el.y + el.height > shiftCorridorMax;

        //     return contained || crossesTop || crossesBottom;
        //   }

        //   for (const el of possiblyAffectedElements) {
        //     console.log(el, shiftCorridorMin, shiftCorridorMax);
        //     if (overlapsCorridorVertically(el)) {
        //       modeling.moveElements([el], { y: 0, x: elementWidth - selectedElement.width });

        //       shiftCorridorMin = Math.min(el.y, shiftCorridorMin);
        //       shiftCorridorMax = Math.max(el.y + el.height, shiftCorridorMax);
        //     }
        //   }
        // }
      },
    );
  }
}
