import LabelEditingProvider from 'bpmn-js/lib/features/label-editing/LabelEditingProvider';

import EventBus from 'diagram-js/lib/core/EventBus';
import BpmnFactory from 'bpmn-js/lib/features/modeling/BpmnFactory';
import Canvas from 'diagram-js/lib/core/Canvas';
import Modeling from 'bpmn-js/lib/features/modeling/Modeling';
import ResizeHandles from 'diagram-js/lib/features/resize/ResizeHandles';
import TextRenderer from 'bpmn-js/lib/draw/TextRenderer';
import { Shape } from 'bpmn-js/lib/model/Types';
import { is } from 'bpmn-js/lib/util/ModelUtil';
import { isLabelExternal } from 'bpmn-js/lib/util/LabelUtil';
import { getBackgroundColor, getBorderColor, getTextColor } from '@/lib/helpers/bpmn-js-helpers';

export default class CustomLabelEditingProvider extends LabelEditingProvider {
  // this tells bpmn-js which modules need to be passed to the constructor (the order must be the
  // same as in the constructor!!)
  static $inject: string[] = [
    'eventBus',
    'bpmnFactory',
    'canvas',
    'directEditing',
    'modeling',
    'resizeHandles',
    'textRenderer',
  ];

  constructor(
    eventBus: EventBus,
    bpmnFactory: BpmnFactory,
    canvas: Canvas,
    directEditing: any,
    modeling: Modeling,
    resizeHandles: ResizeHandles,
    textRenderer: TextRenderer,
  ) {
    super(eventBus, bpmnFactory, canvas, directEditing, modeling, resizeHandles, textRenderer);
  }

  activate(element: Shape) {
    const context = super.activate(element);

    // overwrite the styling for the direct editing preview
    if (isLabelExternal(element) && element.parent) {
      context.style.backgroundColor = getBackgroundColor(element.parent as Shape) || 'white';
    } else {
      context.style.backgroundColor = getBackgroundColor(element) || 'white';
    }
    context.style.border = `1px solid ${getBorderColor(element) || 'black'}`;
    context.style.color = getTextColor(element) || 'black';

    if (is(element, 'bpmn:TextAnnotation')) {
      // prevent that the element shrinks when the text does not fit the full height of the textbox
      // which would happen by default
      context.bounds.minHeight = element.height;
    }

    return context;
  }
}
