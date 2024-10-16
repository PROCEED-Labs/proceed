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

  getPaletteEntries(): PaletteEntriesCallback {
    const { create, elementFactory } = this;

    function createAction(
      type: string,
      group: string,
      className: string,
      title?: string,
      options?: (event: Event, autoActivate: boolean) => void,
    ) {
      function createListener(event: Event) {
        const shape = elementFactory.createShape(assign({ type: type }, options));

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

    return function (entries) {
      return {
        ...entries,
        'create.human-resource': createAction(
          'proceed:HumanPerformer',
          'perfomer',
          'bpmn-icon-user',
          'Human Performer',
        ),
        'create.machine-resource': createAction(
          'proceed:MachinePerformer',
          'perfomer',
          'bpmn-icon-service',
          'Machine Performer',
        ),
      };
    };
  }
}
