import DirectEditing from 'diagram-js-direct-editing/lib/DirectEditing';
import EventBus from 'diagram-js/lib/core/EventBus';
import Canvas from 'diagram-js/lib/core/Canvas';
import { Shape } from 'bpmn-js/lib/model/Types';
import { is } from 'bpmn-js/lib/util/ModelUtil';

export default class CustomDirectEditing extends DirectEditing {
  constructor(eventBus: EventBus, canvas: Canvas) {
    super(eventBus, canvas);
  }

  _handleKey(e: KeyboardEvent) {
    const self = this as any;

    e.stopPropagation();
    // invert the default functionality where 'enter' completes the editing and 'shift enter' adds a
    // new line
    if (e.code === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        return self.complete();
      } else {
        self._textbox.insertText('\n');
        return;
      }
    }

    return super._handleKey(e);
  }

  activate(element: Shape) {
    const self = this as any;

    super.activate(element);

    // if (is(element, 'bpmn:TextAnnotation')) {
    // force the use of the correct text color in annotation elements
    self.$textbox.style.color = element.di.label?.color || 'black';
    // }
  }
}
