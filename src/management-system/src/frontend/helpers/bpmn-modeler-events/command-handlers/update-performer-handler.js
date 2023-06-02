function UpdatePerformerHandler(elementRegistry, moddle) {
  this.elementRegistry = elementRegistry;
  this.moddle = moddle;
}

UpdatePerformerHandler.$inject = ['elementRegistry', 'moddle'];

module.exports = UpdatePerformerHandler;

/**
 * Update the performer info in an element
 *
 * @param {Object} element the element to update
 * @param {String} performers the performer string to emplace in the element
 */
UpdatePerformerHandler.prototype.setPerformers = function (element, performers) {
  // create the moddle representation for the performers
  const formalExpression = this.moddle.create('bpmn:Expression', {
    body: JSON.stringify(performers),
  });
  const resourceAssignmentExpression = this.moddle.create('bpmn:ResourceAssignmentExpression', {
    expression: formalExpression,
  });

  const potentialOwner = this.moddle.create('bpmn:PotentialOwner', {
    resourceAssignmentExpression,
  });

  // add/update the performers of the element
  if (!element.resources) {
    element.resources = [];
  }

  // remove the current performers and add the new ones (if there are new performers)
  element.resources = element.resources.filter(
    (resource) => resource.$type !== 'bpmn:PotentialOwner'
  );

  if (performers.length) {
    element.resources = [...element.resources, potentialOwner];
  }
};

UpdatePerformerHandler.prototype.execute = function (context) {
  const { elementId, performers } = context;

  const userTask = this.elementRegistry.get(elementId);

  if (!userTask) {
    throw new Error(`Unable to find element with given id (${elementId})`);
  }

  if (userTask.type !== 'bpmn:UserTask') {
    throw new Error(`Invalid element type for performer assignment! Type is ${userTask.$type}`);
  }

  this.setPerformers(userTask.businessObject, performers);

  context.element = userTask;
};
