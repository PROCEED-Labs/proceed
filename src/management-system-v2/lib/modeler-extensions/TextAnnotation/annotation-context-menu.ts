import ContextPadProvider, {
  ContextPadEntries,
} from 'diagram-js/lib/features/context-pad/ContextPadProvider';

import ContextPad from 'diagram-js/lib/features/context-pad/ContextPad';

import PopupMenu from 'diagram-js/lib/features/popup-menu/PopupMenu';
import { Element as BaseElement } from 'diagram-js/lib/model/Types';

import { isAny } from 'bpmn-js/lib/util/ModelUtil';

export default class CustomContextPadProvider implements ContextPadProvider {
  // this tells bpmn-js which modules need to be passed to the constructor (the order must be the
  // same as in the constructor!!)
  static $inject: string[] = ['contextPad', 'popupMenu'];

  popupMenu: PopupMenu;
  contextPad: ContextPad;

  constructor(contextPad: ContextPad, popupMenu: PopupMenu) {
    contextPad.registerProvider(this);

    this.popupMenu = popupMenu;
    this.contextPad = contextPad;
  }

  getContextPadEntries(element: BaseElement) {
    const { popupMenu, contextPad } = this;

    return (entries: ContextPadEntries) => {
      const { businessObject } = element;

      if (entries['append.text-annotation']) {
        entries['append.text-annotation'].className = 'proceed-text-annotation-icon';
      }

      // this tells bpmn-js what it should show in the context menu when a text annotation
      // is selected
      if (isAny(businessObject, ['bpmn:TextAnnotation'])) {
        function getColorMenuPosition(element: BaseElement) {
          var Y_OFFSET = 5;

          var pad = contextPad.getPad(element).html;

          var padRect =
            typeof pad === 'string' ? { left: 0, bottom: 0 } : pad.getBoundingClientRect();

          var pos = {
            x: padRect.left,
            y: padRect.bottom + Y_OFFSET,
          };

          return pos;
        }

        entries.recolor = {
          group: 'edit',
          className: 'entry',
          html: `<div style="width: 20px; height: 20px; background-color: ${element.di.fill}; pointer-events: all; border: 1px solid rgb(153, 153, 153);"></div>`,
          title: 'Change color',
          action: {
            click: function(event: any, element: BaseElement) {
              let position = { x: event.x, y: event.y };
              position = getColorMenuPosition(element);

              popupMenu.open(element, 'annotation-recolor', position, {
                title: 'Change color',
                width: 300,
                search: true,
              });
            },
          } as any,
        };
      }

      return entries;
    };
  }
}
