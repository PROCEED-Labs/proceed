import { getTaskConstraintMapping, getProcessConstraints } from '@proceed/bpmn-helper';

class ProceedConstraints {
  constructor(eventBus, canvas) {
    this.elementConstraintMapping = {};

    eventBus.on('import.done', () => {
      // initializing constraintMapping from the root moddle element
      const processElement = canvas.getRootElement().businessObject;

      setTimeout(async () => {
        const processConstraints = await getProcessConstraints(processElement);
        const taskConstraintMapping = await getTaskConstraintMapping(processElement);
        taskConstraintMapping[processElement.id] = processConstraints;
        this.elementConstraintMapping = taskConstraintMapping;
        eventBus.fire('proceedConstraints.changed.elementConstraintMapping', {
          elementConstraintMapping: this.elementConstraintMapping,
        });
      });
    });

    eventBus.on('commandStack.element.updateProperties.postExecute', ({ context }) => {
      const { element, properties, additionalInfo, dontPropagate } = context;
      if (properties && additionalInfo) {
        if (additionalInfo.constraints) {
          this.elementConstraintMapping[element.id] = additionalInfo.constraints;
          eventBus.fire('proceedConstraints.element.changed.constraints', {
            element,
            constraints: additionalInfo.constraints,
            dontPropagate,
          });
          eventBus.fire('proceedConstraints.changed.elementConstraintMapping', {
            elementConstraintMapping: this.elementConstraintMapping,
          });
        }
      }
    });
  }

  getConstraintMapping() {
    return this.elementConstraintMapping;
  }

  getElementConstraints(elementId) {
    return this.elementConstraintMapping[elementId];
  }
}

ProceedConstraints.$inject = ['eventBus', 'canvas'];

export default {
  __init__: ['proceedConstraints'],
  proceedConstraints: ['type', ProceedConstraints],
};
