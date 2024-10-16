import ContextPadProvider, {
  ContextPadEntries,
} from 'diagram-js/lib/features/context-pad/ContextPadProvider';

import ContextPad from 'diagram-js/lib/features/context-pad/ContextPad';

import Connect from 'diagram-js/lib/features/connect/Connect';
import { Element as BaseElement } from 'diagram-js/lib/model/Types';

import { isAny } from 'bpmn-js/lib/util/ModelUtil';

export default class CustomContextPadProvider implements ContextPadProvider {
  // this tells bpmn-js which modules need to be passed to the constructor (the order must be the
  // same as in the constructor!!)
  static $inject: string[] = ['contextPad', 'connect'];

  connect: Connect;

  constructor(contextPad: ContextPad, connect: Connect) {
    contextPad.registerProvider(this);

    this.connect = connect;
  }

  getContextPadEntries(element: BaseElement): ContextPadEntries {
    const { connect } = this;
    const actions: ContextPadEntries = {};

    function startConnect(event: Event, element: BaseElement | BaseElement[]) {
      connect.start(event, element);
    }

    const { businessObject } = element;
    if (isAny(businessObject, ['proceed:HumanPerformer', 'proceed:MachinePerformer'])) {
      actions.connect = {
        group: 'connect',
        className: 'bpmn-icon-connection-multi',
        title: 'Connect',
        action: startConnect,
      };
    }

    return actions;
  }
}
