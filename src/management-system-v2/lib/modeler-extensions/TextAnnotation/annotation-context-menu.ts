import ContextPadProvider, {
  ContextPadEntries,
} from 'diagram-js/lib/features/context-pad/ContextPadProvider';

import ContextPad from 'diagram-js/lib/features/context-pad/ContextPad';

import Connect from 'diagram-js/lib/features/connect/Connect';
import PopupMenu from 'diagram-js/lib/features/popup-menu/PopupMenu';
import { Element as BaseElement } from 'diagram-js/lib/model/Types';

import { isAny } from 'bpmn-js/lib/util/ModelUtil';
import { isLabel } from 'bpmn-js/lib/util/LabelUtil';

export default class CustomContextPadProvider implements ContextPadProvider {
  // this tells bpmn-js which modules need to be passed to the constructor (the order must be the
  // same as in the constructor!!)
  static $inject: string[] = ['contextPad', 'connect', 'popupMenu'];

  connect: Connect;
  popupMenu: PopupMenu;
  contextPad: ContextPad;

  constructor(contextPad: ContextPad, connect: Connect, popupMenu: PopupMenu) {
    contextPad.registerProvider(this);

    this.connect = connect;
    this.popupMenu = popupMenu;
    this.contextPad = contextPad;
  }

  getContextPadEntries(element: BaseElement): ContextPadEntries {
    const { connect, popupMenu, contextPad } = this;
    const actions: ContextPadEntries = {};

    function startConnect(event: MouseEvent, element: BaseElement) {
      connect.start(event, element);
    }

    const { businessObject } = element;
    // this tells bpmn-js what it should show in the context menu when a text annotation
    // is selected
    if (isAny(businessObject, ['bpmn:TextAnnotation'])) {
      actions.connect = {
        group: 'connect',
        className: 'bpmn-icon-connection-multi',
        title: 'Connect',
        action: {
          click: startConnect,
          dragstart: startConnect,
        } as any,
      };

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

      actions.recolor = {
        group: 'edit',
        className: 'entry',
        html: `<div style="width: 20px; height: 20px; background-color: ${element.di.fill}; pointer-events: all; border: 1px solid rgb(153, 153, 153);"></div>`,
        title: 'Change color',
        action: {
          click: function (event: any, element: BaseElement) {
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

    return actions;
  }
}
