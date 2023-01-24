import CustomModelingModule from '@/frontend/helpers/bpmn-modeler-events/custom-modeling.js';

import { generateBpmnId } from '@proceed/bpmn-helper';

/**
 * This Module will provide custom behaviour for different events inside a bpmn js modeler
 * BEWARE!! This module is used in the frontend modeler as well as the backend puppeteer modeler; only add functionality that should run in both
 */
class ProceedModelingBehaviour {
  constructor(eventBus, customModeling) {
    eventBus.on('commandStack.postExecuted', 0, ({ command, context }) => {
      if (command === 'element.updateLabel') {
        const { businessObject } = context.element;
        // if the element is some kind of event
        if (businessObject.eventDefinitions && businessObject.eventDefinitions.length > 0) {
          const [eventDefinition] = businessObject.eventDefinitions;
          if (
            !context.isExternalEvent &&
            (eventDefinition.$type === 'bpmn:ErrorEventDefinition' ||
              eventDefinition.$type === 'bpmn:EscalationEventDefinition')
          ) {
            // label of error/escalation updated (created/updated/deleted) => update error/escalation ref
            // this happens implicitly before removing/replacing an event => don't need to separatly handle that case
            const refId = generateBpmnId();
            customModeling.updateErrorOrEscalation(businessObject.id, refId, context.newLabel);
          }
        }
      }
    });

    eventBus.on('commandStack.shape.replace.postExecute', ({ context }) => {
      const { newShape } = context;

      // clear commandStack so that these events get distributed
      setTimeout(() => {
        const { businessObject, id: elementId } = newShape;
        // if the element is some kind of event
        if (businessObject.eventDefinitions && businessObject.eventDefinitions.length > 0) {
          const [eventDefinition] = businessObject.eventDefinitions;
          if (
            !context.isExternalEvent &&
            (eventDefinition.$type === 'bpmn:ErrorEventDefinition' ||
              eventDefinition.$type === 'bpmn:EscalationEventDefinition')
          ) {
            // element became an error or escalation event => create reference to error or escalation based on its name
            const refId = generateBpmnId();
            customModeling.updateErrorOrEscalation(elementId, refId, businessObject.name);
          }
        }
      });
    });

    eventBus.on('commandStack.shape.delete.canExecute', 10000, ({ context }) => {
      const { shape, isExternalEvent } = context;
      // deletion of labels is trigerred by other events that get distributed too => prevent label from being deleted twice
      if (isExternalEvent && shape.includes('_label')) {
        return false;
      }
    });
  }
}

ProceedModelingBehaviour.$inject = ['eventBus', 'customModeling'];

export default {
  __init__: ['proceedModelingBehaviour'],
  __depends__: [CustomModelingModule],
  proceedModelingBehaviour: ['type', ProceedModelingBehaviour],
};
