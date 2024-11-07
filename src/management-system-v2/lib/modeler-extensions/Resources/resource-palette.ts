import PaletteProvider, {
  PaletteEntriesCallback,
} from 'diagram-js/lib/features/palette/PaletteProvider';

import ElementFactory from 'bpmn-js/lib/features/modeling/ElementFactory';
import Palette from 'diagram-js/lib/features/palette/Palette';
import Create from 'diagram-js/lib/features/create/Create';

import { assign } from 'min-dash';
import BpmnFactory from 'bpmn-js/lib/features/modeling/BpmnFactory';

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

    function createAction(
      type: string,
      group: string,
      className: string,
      title?: string,
      machineType?: string,
    ) {
      function createListener(event: Event) {
        const shape = elementFactory.createShape(assign({ type: type, width: 50, height: 50 }));

        shape.businessObject.machineType = machineType;
        create.start(event, shape);
      }

      return {
        group: group,
        className: className,
        title: title,
        action: {
          click: createListener,
          dragstart: createListener,
        },
      };
    }

    return function(entries: any) {
      return {
        ...entries,
        'flow-separator': {
          group: 'activity',
          separator: true,
        },
        'create.human-resource': createAction(
          'proceed:HumanPerformer',
          'perfomer',
          'proceed-user-icon',
          'Human Performer',
        ),
        'create.machine-resource': createAction(
          'proceed:MachinePerformer',
          'perfomer',
          'proceed-laptop-icon',
          'IT System',
          'Laptop',
        ),
      };
    };
  }
}
