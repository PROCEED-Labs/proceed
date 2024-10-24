import RuleProvider from 'diagram-js/lib/features/rules/RuleProvider';

import EventBus from 'diagram-js/lib/core/EventBus';
import ElementRegistry from 'diagram-js/lib/core/ElementRegistry';

import { is, isAny } from 'bpmn-js/lib/util/ModelUtil';

export default class CustomRules extends RuleProvider {
  elementRegistry: ElementRegistry;

  constructor(eventBus: EventBus, elementRegistry: ElementRegistry) {
    super(eventBus);

    this.elementRegistry = elementRegistry;
  }

  static $inject: string[] = ['eventBus', 'elementRegistry'];

  init(): void {
    this.addRule('connection.create', 1500, (context) => {
      const { source, target } = context;

      const sourceIsPerformer = is(source, 'proceed:Performer');
      const targetCanHavePerformer = isAny(target, ['bpmn:Activity', 'bpmn:Event']);

      const { elementRegistry } = this;
      const associations = elementRegistry.filter((el) => el.type === 'bpmn:Association');
      const isRedundant = associations.some(
        (association) => association.source === source && association.target === target,
      );

      if (sourceIsPerformer && targetCanHavePerformer && !isRedundant) {
        return {
          type: 'bpmn:Association',
          associationDirection: 'None',
        };
      }
    });
    this.addRule('connection.reconnect', 1500, (context) => {
      const { source, target, connection } = context;

      const sourceIsPerformer = is(source, 'proceed:Performer');
      const targetCanHavePerformer = isAny(target, ['bpmn:Activity', 'bpmn:Event']);
      const isAssociation = is(connection, 'bpmn:Association');

      if (sourceIsPerformer && targetCanHavePerformer && isAssociation) return true;
    });
  }
}
