const { updatePerformersOnElement } = require('@proceed/bpmn-helper');

function UpdatePerformerHandler(elementRegistry) {
  this.elementRegistry = elementRegistry;
}

UpdatePerformerHandler.$inject = ['elementRegistry'];

module.exports = UpdatePerformerHandler;

UpdatePerformerHandler.prototype.execute = function (context) {
  const { elementId, performers } = context;

  const userTask = this.elementRegistry.get(elementId);

  if (!userTask) {
    throw new Error(`Unable to find element with given id (${elementId})`);
  }

  if (userTask.type !== 'bpmn:UserTask') {
    throw new Error(`Invalid element type for performer assignment! Type is ${userTask.$type}`);
  }

  updatePerformersOnElement(userTask.businessObject, performers);

  context.element = userTask;
};
