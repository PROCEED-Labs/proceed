import ContextPadProvider, {
  ContextPadEntries,
} from 'diagram-js/lib/features/context-pad/ContextPadProvider';

import ContextPad from 'diagram-js/lib/features/context-pad/ContextPad';

import Connect from 'diagram-js/lib/features/connect/Connect';
import PopupMenu from 'diagram-js/lib/features/popup-menu/PopupMenu';
import { Element as BaseElement } from 'diagram-js/lib/model/Types';
import { Shape } from 'bpmn-js/lib/model/Types';

import { is } from 'bpmn-js/lib/util/ModelUtil';
import { isLabel } from 'bpmn-js/lib/util/LabelUtil';
import ElementFactory from 'bpmn-js/lib/features/modeling/ElementFactory';
import BpmnFactory from 'bpmn-js/lib/features/modeling/BpmnFactory';
import Create from 'diagram-js/lib/features/create/Create';
import AutoPlace from 'diagram-js/lib/features/auto-place/AutoPlace';
import AppendPreview from 'bpmn-js/lib/features/append-preview/AppendPreview';

/**
 * This module extends the default bpmn-js context menu next to selected elements
 *
 * When a resource element is selected it will provide options to remove the resource or replace it
 * with another resource type or to connect the resource to a viable flow node
 *
 * If a flow node that a resource can be connected to is selected it will provide the option to
 * assign a resource to the flow node
 *
 **/
export default class CustomContextPadProvider implements ContextPadProvider {
  // this tells bpmn-js which modules need to be passed to the constructor (the order must be the
  // same as in the constructor!!)
  static $inject: string[] = [
    'config.contextPad',
    'injector',
    'contextPad',
    'connect',
    'popupMenu',
    'elementFactory',
    'bpmnFactory',
    'create',
    'appendPreview',
  ];

  connect: Connect;
  popupMenu: PopupMenu;
  contextPad: ContextPad;
  elementFactory: ElementFactory;
  bpmnFactory: BpmnFactory;
  create: Create;
  autoPlace?: AutoPlace;
  appendPreview: AppendPreview;

  constructor(
    config: any,
    injector: any,
    contextPad: ContextPad,
    connect: Connect,
    popupMenu: PopupMenu,
    elementFactory: ElementFactory,
    bpmnFactory: BpmnFactory,
    create: Create,
    appendPreview: AppendPreview,
  ) {
    contextPad.registerProvider(this);

    this.connect = connect;
    this.popupMenu = popupMenu;
    this.contextPad = contextPad;
    this.elementFactory = elementFactory;
    this.bpmnFactory = bpmnFactory;
    this.create = create;
    this.appendPreview = appendPreview;

    if (config?.autoPlace !== false) {
      this.autoPlace = injector.get('autoPlace', false);
    }
  }

  getContextPadEntries(element: BaseElement): ContextPadEntries {
    const {
      connect,
      popupMenu,
      contextPad,
      elementFactory,
      bpmnFactory,
      create,
      autoPlace,
      appendPreview,
    } = this;
    const actions: ContextPadEntries = {};

    function startConnect(event: MouseEvent, element: BaseElement) {
      connect.start(event, element);
    }

    function appendAction(className: string, title: string, resourceType: string) {
      function appendStart(event: MouseEvent, element: BaseElement) {
        const businessObject = bpmnFactory.create('proceed:GenericResource', { resourceType });
        const shape = elementFactory.createShape({
          type: 'proceed:GenericResource',
          width: 50,
          height: 50,
          businessObject,
        });

        create.start(event, shape, { source: element });
        appendPreview.cleanUp();
      }

      const append = autoPlace
        ? function (_: any, element: Shape) {
            const businessObject = bpmnFactory.create('proceed:GenericResource', { resourceType });
            const shape = elementFactory.createShape({
              type: 'proceed:GenericResource',
              width: 50,
              height: 50,
              businessObject,
            });

            autoPlace.append(element, shape, {
              connection: {
                type: 'bpmn:Association',
                associationDirection: 'None',
              },
            });
            appendPreview.cleanUp();
          }
        : appendStart;
      const previewAppend = autoPlace
        ? function (_: any, element: Shape) {
            const businessObject = bpmnFactory.create('proceed:GenericResource', { resourceType });
            appendPreview.create(element, 'proceed:GenericResource', {
              businessObject,
              width: 50,
              height: 50,
            });

            return () => {
              appendPreview.cleanUp();
            };
          }
        : null;

      return {
        group: 'model',
        className,
        title,
        action: {
          dragstart: appendStart,
          click: append,
          hover: previewAppend,
        } as any,
      };
    }

    const { businessObject } = element;
    // this tells bpmn-js what it should show in the context menu when one of our resource elements
    // is selected
    if (is(businessObject, 'proceed:GenericResource') && !isLabel(element)) {
      actions.connect = {
        group: 'connect',
        className: 'bpmn-icon-connection-multi',
        title: 'Connect',
        action: {
          click: startConnect,
          dragstart: startConnect,
        } as any,
      };

      function getReplaceMenuPosition(element: Shape) {
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

      actions.replace = {
        group: 'edit',
        className: 'bpmn-icon-screw-wrench',
        title: 'Change element',
        action: {
          click: function (event: any, element: Shape) {
            let position = { x: event.x, y: event.y };
            position = getReplaceMenuPosition(element);

            popupMenu.open(element, 'resource-replace', position, {
              title: 'Change element',
              width: 300,
              search: true,
            });
          },
        } as any,
      };
    } else if (is(element, 'proceed:PerformableNode') && !isLabel(element)) {
      actions['append.human-resource'] = appendAction(
        'proceed-user-icon context-menu-icon',
        'Assign Human Performer',
        'User',
      );
      actions['append.machine-resource'] = appendAction(
        'proceed-laptop-icon',
        'Assign IT System',
        'Laptop',
      );
    } else {
    }

    return actions;
  }
}
