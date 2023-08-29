const { getRootFromElement } = require('@proceed/bpmn-helper');

function UpdateEventDefinitionHandler(elementRegistry, moddle) {
  this.elementRegistry = elementRegistry;
  this.moddle = moddle;
}

UpdateEventDefinitionHandler.$inject = ['elementRegistry', 'moddle'];

module.exports = UpdateEventDefinitionHandler;

UpdateEventDefinitionHandler.prototype.execute = function (context) {
  const { elementId, durationFormalExpression, dateFormalExpression, refName, refId } = context;

  if (!elementId || typeof elementId !== 'string') {
    throw new Error('Not given a valid element id string!');
  }

  const element = this.elementRegistry.get(elementId);

  if (!element) {
    throw new Error(`Unable to find element with given id (${elementId})!`);
  }

  const { businessObject } = element;

  if (!businessObject.eventDefinitions || !businessObject.eventDefinitions[0]) {
    throw new Error('Element does not have an event definition.');
  }

  const [eventDefinition] = businessObject.eventDefinitions;

  if (eventDefinition.$type === 'bpmn:TimerEventDefinition') {
    this.removeTimerEventTime(eventDefinition, context);

    if (durationFormalExpression) {
      this.updateTimerEventDuration(eventDefinition, context, durationFormalExpression);
    } else if (dateFormalExpression) {
      this.updateTimerEventDate(eventDefinition, context, dateFormalExpression);
    }
  }

  const definitions = getRootFromElement(businessObject);

  if (eventDefinition.$type === 'bpmn:ErrorEventDefinition') {
    this.updateErrorOrEscalationEvent(
      eventDefinition,
      context,
      'Error',
      refName,
      refId,
      definitions,
    );
  }

  if (eventDefinition.$type === 'bpmn:EscalationEventDefinition') {
    this.updateErrorOrEscalationEvent(
      eventDefinition,
      context,
      'Escalation',
      refName,
      refId,
      definitions,
    );
  }

  context.element = element;
};

UpdateEventDefinitionHandler.prototype.removeTimerEventTime = function (eventDefinition, context) {
  const oldTimerDuration = eventDefinition.timeDuration;
  const oldTimerDate = eventDefinition.timeDate;

  context.oldTimerDuration = oldTimerDuration;
  context.oldTimerDate = oldTimerDate;
  context.newTimerDuration = null;
  context.newTimerDate = null;

  delete eventDefinition.timeDuration;
  delete eventDefinition.timeDate;
};

UpdateEventDefinitionHandler.prototype.updateTimerEventDuration = function (
  eventDefinition,
  context,
  formalExpression,
) {
  const newTimerDuration = this.moddle.create('bpmn:FormalExpression', {
    'xsi:type': 'bpmn:tFormalExpression',
    body: formalExpression,
  });

  eventDefinition.timeDuration = newTimerDuration;
  context.newTimerDuration = newTimerDuration;
};

UpdateEventDefinitionHandler.prototype.updateTimerEventDate = function (
  eventDefinition,
  context,
  formalExpression,
) {
  const newTimerDate = this.moddle.create('bpmn:FormalExpression', {
    'xsi:type': 'bpmn:tFormalExpression',
    body: formalExpression,
  });

  eventDefinition.timeDate = newTimerDate;
  context.newTimerDate = newTimerDate;
};

/**
 * Checks if an error or escalation is still referenced by an event and deletes it if not
 *
 * @param {Object} definitions the process definitions object containing the process
 * @param {('Error'|'Escalation')} type the type we might want to remove
 * @param {Object} errorOrEscalation the element we might want to remove
 */
UpdateEventDefinitionHandler.prototype.removeErrorOrEscalationIfUnused = function (
  definitions,
  type,
  errorOrEscalation,
) {
  const eventDefinitions = this.elementRegistry
    .filter(({ businessObject }) => {
      return (
        businessObject.eventDefinitions &&
        businessObject.eventDefinitions.length > 0 &&
        businessObject.eventDefinitions[0].$type === `bpmn:${type}EventDefinition`
      );
    })
    .map((el) => el.businessObject.eventDefinitions[0]);

  // if there is no event that references the specific error or escalation remove it
  if (
    !eventDefinitions.some(
      (definition) => definition[`${type.toLowerCase()}Ref`] === errorOrEscalation,
    )
  ) {
    definitions.rootElements = definitions.rootElements.filter((el) => el !== errorOrEscalation);
  }
};

/**
 * Updates the referenced error or escalation reference of an event and creates the new/ deleted the old reference if needed
 *
 * @param {Object} eventDefinition the object defining the type of the event
 * @param {Object} context the context of the update event
 * @param {('Error'|'Escalation')} type the type of bpmn event we are operating on
 * @param {String} refName name of the referenced Error or Escalation
 * @param {String} refId the id supposed to be used if creating a new Error or escalation
 * @param {Object} definitions the process definitions object containing the process
 */
UpdateEventDefinitionHandler.prototype.updateErrorOrEscalationEvent = function (
  eventDefinition,
  context,
  type,
  refName,
  refId,
  definitions,
) {
  const refType = `${type.toLowerCase()}Ref`;

  // remember old errorRef/escalationRef for possible revert
  context[`old${type}Ref`] = eventDefinition[refType];

  // if the errorRef/escalationRef is not set => remove possibly existing errorRef/escalationRef
  if (!refName) {
    delete eventDefinition[refType];
  } else {
    // see if there is already an error/escalation with the name we want to reference
    const errorsOrEscalations = definitions.rootElements.filter(
      (el) => el.$type === `bpmn:${type}`,
    );

    const suitableErrorOrEscalation = errorsOrEscalations.find(
      (errorOrEscalation) => errorOrEscalation.name === refName,
    );

    if (suitableErrorOrEscalation) {
      eventDefinition[refType] = suitableErrorOrEscalation;
    } else {
      const newErrorOrEscalation = this.moddle.create(`bpmn:${type}`, {
        id: `${type}_${refId}`,
        name: refName,
        [`${type.toLowerCase()}Code`]: refName,
      });

      eventDefinition[refType] = newErrorOrEscalation;
      definitions.rootElements.push(newErrorOrEscalation);
    }
  }

  if (context[`old${type}Ref`]) {
    this.removeErrorOrEscalationIfUnused(definitions, type, context[`old${type}Ref`]);
  }
};

UpdateEventDefinitionHandler.prototype.revert = function (context) {
  const { element } = context;

  if (context.hasOwnProperty('oldTimerDuration')) {
    element.businessObject.eventDefinitions[0].timeDuration = context.oldTimerDuration;
  }
  if (context.hasOwnProperty('oldTimerDate')) {
    element.businessObject.eventDefinitions[0].timeDate = context.oldTimerDate;
  }
  if (context.hasOwnProperty('oldErrorRef')) {
    element.businessObject.eventDefinitions[0].errorRef = context.oldErrorRef;
  }
  if (context.hasOwnProperty('oldEscalationRef')) {
    element.businessObject.eventDefinitions[0].escalationRef = context.oldEscalationRef;
  }
};
