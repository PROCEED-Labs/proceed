import ContextPadProvider, {
  ContextPadEntries,
} from 'diagram-js/lib/features/context-pad/ContextPadProvider';

import ContextPad from 'diagram-js/lib/features/context-pad/ContextPad';

import PopupMenu from 'diagram-js/lib/features/popup-menu/PopupMenu';
import { Element as BaseElement } from 'diagram-js/lib/model/Types';
import type ElementFactory from 'bpmn-js/lib/features/modeling/ElementFactory';
import type Create from 'diagram-js/lib/features/create/Create';
import type AutoPlace from 'diagram-js/lib/features/auto-place/AutoPlace';
import type AppendPreview from 'bpmn-js/lib/features/append-preview/AppendPreview';

import { isAny } from 'bpmn-js/lib/util/ModelUtil';
import { Shape } from 'bpmn-js/lib/model/Types';

export default class CustomContextPadProvider implements ContextPadProvider {
  // this tells bpmn-js which modules need to be passed to the constructor (the order must be the
  // same as in the constructor!!)
  static $inject: string[] = [
    'config.contextPad',
    'injector',
    'contextPad',
    'popupMenu',
    'elementFactory',
    'create',
    'appendPreview',
  ];

  popupMenu: PopupMenu;
  contextPad: ContextPad;
  elementFactory: ElementFactory;
  create: Create;
  autoPlace?: AutoPlace;
  appendPreview: AppendPreview;

  constructor(
    config: any,
    injector: any,
    contextPad: ContextPad,
    popupMenu: PopupMenu,
    elementFactory: ElementFactory,
    create: Create,
    appendPreview: AppendPreview,
  ) {
    contextPad.registerProvider(this);

    this.popupMenu = popupMenu;
    this.contextPad = contextPad;
    this.elementFactory = elementFactory;
    this.create = create;
    this.appendPreview = appendPreview;

    if (config?.autoPlace !== false) {
      this.autoPlace = injector.get('autoPlace', false);
    }
  }

  getContextPadEntries(element: BaseElement) {
    const { popupMenu, contextPad, elementFactory, create, appendPreview, autoPlace } = this;

    return (entries: ContextPadEntries) => {
      const { businessObject } = element;

      if (entries['append.text-annotation']) {
        function appendAction(className: string, title: string, resourceType: string) {
          function appendStart(event: MouseEvent, element: BaseElement) {
            const shape = elementFactory.createShape({
              type: 'bpmn:TextAnnotation',
              width: 100,
              height: 80,
            });

            create.start(event, shape, { source: element });
            appendPreview.cleanUp();
          }

          const append = autoPlace
            ? function (_: any, element: Shape) {
                const shape = elementFactory.createShape({
                  type: 'bpmn:TextAnnotation',
                  width: 100,
                  height: 80,
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
                appendPreview.create(element, 'bpmn:TextAnnotation', {
                  width: 100,
                  height: 80,
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

        entries['append.text-annotation'] = appendAction(
          'proceed-text-annotation-icon',
          entries['append.text-annotation'].title!,
          'bpmn:TextAnnotation',
        );
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

      return entries;
    };
  }
}
