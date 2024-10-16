import RuleProvider from 'diagram-js/lib/features/rules/RuleProvider';

import EventBus from 'diagram-js/lib/core/EventBus';

import { is, isAny } from 'bpmn-js/lib/util/ModelUtil';

export default class CustomRules extends RuleProvider {
  constructor(eventBus: EventBus) {
    super(eventBus);
  }

  init(): void {
    this.addRule('connection.create', 1500, function (context) {
      const { source, target } = context;

      if (is(source, 'proceed:Performer') && isAny(target, ['bpmn:Activity', 'bpmn:Event'])) {
        return {
          type: 'bpmn:Association',
          associationDirection: 'None',
        };
      }
    });
  }
}

CustomRules.$inject = ['eventBus'];
