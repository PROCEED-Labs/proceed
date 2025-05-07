import type EventBus from 'diagram-js/lib/core/EventBus';
import type Canvas from 'diagram-js/lib/core/Canvas';
import { Shape } from 'bpmn-js/lib/model/Types';
import { is } from 'bpmn-js/lib/util/ModelUtil';

var MARKER_HIDDEN = 'djs-element-hidden',
  MARKER_LABEL_HIDDEN = 'djs-label-hidden';

// this is a copy of https://github.com/bpmn-io/bpmn-js/blob/c3ab26b1ab8e33f238cec6c9704f875e4ddc1a1a/lib/features/label-editing/LabelEditingPreview.js#L39
// without the TextAnnotationHandling which this module is supposed to prevent
export default class CustomAnnotationEditingProvider {
  // this tells bpmn-js which modules need to be passed to the constructor (the order must be the
  // same as in the constructor!!)
  static $inject: string[] = ['eventBus', 'canvas'];

  constructor(eventBus: EventBus, canvas: Canvas) {
    let element: Shape | Shape['label'];

    eventBus.on(
      'directEditing.activate',
      function (context: {
        active: {
          element: Shape;
        };
      }) {
        var activeProvider = context.active;

        element = activeProvider.element.label || activeProvider.element;

        if (is(element, 'bpmn:TextAnnotation') || element.labelTarget) {
          canvas.addMarker(element, MARKER_HIDDEN);
        } else if (
          is(element, 'bpmn:Task') ||
          is(element, 'bpmn:CallActivity') ||
          is(element, 'bpmn:SubProcess') ||
          is(element, 'bpmn:Participant') ||
          is(element, 'bpmn:Lane')
        ) {
          canvas.addMarker(element, MARKER_LABEL_HIDDEN);
        }
      },
    );

    eventBus.on(
      ['directEditing.complete', 'directEditing.cancel'],
      function (context: { active: { element: Shape } }) {
        var activeProvider = context.active;

        if (activeProvider) {
          canvas.removeMarker(
            activeProvider.element.label || activeProvider.element,
            MARKER_HIDDEN,
          );
          canvas.removeMarker(element!, MARKER_LABEL_HIDDEN);
        }

        element = undefined;
      },
    );
  }
}
