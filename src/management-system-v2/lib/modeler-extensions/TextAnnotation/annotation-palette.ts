import PaletteProvider from 'diagram-js/lib/features/palette/PaletteProvider';

import ElementFactory from 'bpmn-js/lib/features/modeling/ElementFactory';
import Palette from 'diagram-js/lib/features/palette/Palette';
import Create from 'diagram-js/lib/features/create/Create';

import { assign } from 'min-dash';
import BpmnFactory from 'bpmn-js/lib/features/modeling/BpmnFactory';
import { info } from 'console';

export default class CustomPaletteProvider implements PaletteProvider {
  create: Create;
  elementFactory: ElementFactory;
  bpmnFactory: BpmnFactory;

  // this tells bpmn-js which modules need to be passed to the constructor (the order must be the
  // same as in the constructor!!)
  static $inject: string[] = ['palette', 'create', 'elementFactory', 'bpmnFactory'];

  constructor(
    palette: Palette,
    create: Create,
    elementFactory: ElementFactory,
    bpmnFactory: BpmnFactory,
  ) {
    palette.registerProvider(this);
    this.create = create;
    this.elementFactory = elementFactory;
    this.bpmnFactory = bpmnFactory;
  }

  getPaletteEntries(): any {
    const { create, elementFactory } = this;

    function createListener(event: Event) {
      const shape = elementFactory.createShape({ type: 'bpmn:TextAnnotation' });

      create.start(event, shape);
    }

    // this will insert a text annotation between the tools section and the following sections of
    // the palette
    return function (entries: {
      [key: string]: { group: string; className?: string; title?: string; separator?: boolean };
    }) {
      // separate the different groups in the palette
      const sortedGroups = Object.entries(entries).reduce((curr, [name, info]) => {
        if (!curr[info.group]) curr[info.group] = {};

        curr[info.group][name] = info;

        return curr;
      }, {} as any);

      return {
        // start with the tools group
        ...sortedGroups['tools'],
        // add our annotation below
        'create.annotation': {
          group: 'annotations',
          className: 'proceed-text-annotation-icon',
          title: 'Create text annotation',
          action: {
            click: createListener,
            dragstart: createListener,
          },
        },
        'annotation-separator': {
          group: 'annotations',
          separator: true,
        },
        // add all other groups
        ...(Object.entries(sortedGroups) as [string, typeof entries][])
          .filter(([groupName]) => groupName !== 'tools')
          .reduce((curr, [_, nextGroup]) => {
            return { ...curr, ...nextGroup };
          }, {}),
      };
    };
  }
}
